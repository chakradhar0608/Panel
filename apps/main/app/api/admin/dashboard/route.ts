import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { startOfDay } from '@/app/api/_utils/common'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const today = startOfDay(new Date())

  const [offers, publishers, totalCampLeads, pendingCampLeads, pendingWithdrawals, totalCampLeadsToday, completedAgg, pendingWithdrawalsAgg] = await Promise.all([
    db.offer.count(),
    db.publisher.count(),
    db.campLead.count(),
    db.campLead.count({ where: { status: 'CONVERTED' } }),
    db.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    db.campLead.count({ where: { clickedAt: { gte: today } } }),
    db.walletTransaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { OR: [{ status: 'PENDING' }, { status: '' }, { status: null }] },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    offers,
    publishers,
    totalCampLeads,
    pendingCampLeads,
    pendingWithdrawals,
    totalCampLeadsToday,
    totalWalletBalance: Number(completedAgg._sum.amount ?? 0) - Number(pendingWithdrawalsAgg._sum.amount ?? 0),
  })
}
