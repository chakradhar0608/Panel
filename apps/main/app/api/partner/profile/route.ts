import { NextResponse } from 'next/server'
import { requirePublisher } from '@/lib/auth'
import { db } from '@nccamp/db'

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const data = await db.publisher.findUnique({
    where: { id: publisher.id },
  })

  if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  // Calculate dynamic financial values matching dashboard and wallet APIs
  const pendingStatusWhere = {
    OR: [{ status: 'PENDING' }, { status: '' }, { status: null }],
  }

  const [
    totalRevenueAgg,
    completedBalanceAgg,
    pendingWithdrawalAgg,
    paidWithdrawAgg
  ] = await Promise.all([
    db.campLeadEvent.aggregate({ where: { publisherId: publisher.id, status: { in: ['APPROVED', 'PAID'] } }, _sum: { payout: true } }),
    db.walletTransaction.aggregate({ where: { publisherId: publisher.id, status: 'COMPLETED' }, _sum: { amount: true } }),
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, ...pendingStatusWhere }, _sum: { amount: true } }),
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, status: 'PAID' }, _sum: { amount: true } }),
  ])

  const totalRevenue = Number(totalRevenueAgg._sum.payout ?? 0)
  const pendingWithdrawalAmount = Number(pendingWithdrawalAgg._sum.amount ?? 0)
  const completedBalance = Number(completedBalanceAgg._sum.amount ?? 0)
  const walletBalance = Math.max(0, completedBalance - pendingWithdrawalAmount)
  const totalWithdrawn = Number(paidWithdrawAgg._sum.amount ?? 0)

  // Omit password hash for security
  const { passwordHash, ...rest } = data

  const publisherData = {
    ...rest,
    totalEarned: totalRevenue,
    walletBalance: walletBalance,
    totalWithdrawn: totalWithdrawn,
    pendingWithdrawal: pendingWithdrawalAmount,
  }

  return NextResponse.json({ publisher: publisherData })
}
