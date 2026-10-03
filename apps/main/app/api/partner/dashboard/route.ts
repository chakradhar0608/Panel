import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { formatDayLabel } from '@/app/api/_utils/common'

function startOfIstDay(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value || '0000'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`)
}

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED', message: 'Your account is pending admin approval.' }, { status: 403 })
  }

  const [totalClicks, totalConversions, totalRevenueAgg, pendingConversions, approvedConversions, recentEvents, completedBalanceAgg, pendingWithdrawalAgg] = await Promise.all([
    db.campLead.count({ where: { publisherId: publisher.id } }),
    db.campLeadEvent.count({ where: { publisherId: publisher.id, status: { in: ['APPROVED', 'PAID'] } } }),
    db.campLeadEvent.aggregate({ where: { publisherId: publisher.id, status: { in: ['APPROVED', 'PAID'] } }, _sum: { payout: true } }),
    db.campLeadEvent.count({ where: { publisherId: publisher.id, status: 'PENDING' } }),
    db.campLeadEvent.count({ where: { publisherId: publisher.id, status: 'APPROVED' } }),
    db.campLeadEvent.findMany({
      where: { publisherId: publisher.id },
      include: { offer: { select: { name: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 10,
    }),
    db.walletTransaction.aggregate({ where: { publisherId: publisher.id, status: 'COMPLETED' }, _sum: { amount: true } }),
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, status: 'PENDING' }, _sum: { amount: true } }),
  ])

  const totalRevenue = Number(totalRevenueAgg._sum.payout ?? 0)
  const walletBalance = Math.max(
    0,
    Number(completedBalanceAgg._sum.amount ?? 0) - Number(pendingWithdrawalAgg._sum.amount ?? 0)
  )

  const weeklyPerformance = await Promise.all(
    Array.from({ length: 7 }).map(async (_, idx) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - idx))
      const dayStart = startOfIstDay(date)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const [clicks, conversions] = await Promise.all([
        db.campLead.count({ where: { publisherId: publisher.id, clickedAt: { gte: dayStart, lt: dayEnd } } }),
        db.campLeadEvent.count({ where: { publisherId: publisher.id, approvedAt: { gte: dayStart, lt: dayEnd }, status: { in: ['APPROVED', 'PAID'] } } }),
      ])

      return { date: formatDayLabel(date), clicks, conversions }
    })
  )

  return NextResponse.json({
    publisherId: publisher.id,
    publisherName: publisher.name,
    telegramLinked: !!publisher.telegramChatId,
    totalClicks,
    totalConversions,
    totalRevenue,
    conversionRate: totalClicks > 0 ? `${((totalConversions / totalClicks) * 100).toFixed(2)}%` : '0.00%',
    pendingConversions,
    approvedConversions,
    walletBalance,
    weeklyPerformance,
    recentActivity: recentEvents.map((event) => ({
      offerName: event.offer.name,
      payout: Number(event.payout),
      status: event.status,
      date: event.approvedAt instanceof Date ? event.approvedAt.toISOString() : event.approvedAt,
    })),
  })
}
