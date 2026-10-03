import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const pendingStatusWhere = {
    OR: [{ status: 'PENDING' }, { status: '' }, { status: null }],
  }

  const [pendingAgg, pendingCount, requests, completedAgg, paidWithdrawAgg] = await Promise.all([
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, ...pendingStatusWhere }, _sum: { amount: true } }),
    db.withdrawalRequest.count({ where: { publisherId: publisher.id, ...pendingStatusWhere } }),
    db.withdrawalRequest.findMany({ where: { publisherId: publisher.id }, orderBy: { requestedAt: 'desc' } }),
    db.walletTransaction.aggregate({ where: { publisherId: publisher.id, status: 'COMPLETED' }, _sum: { amount: true } }),
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, status: 'PAID' }, _sum: { amount: true } }),
  ])

  const pendingWithdrawalAmount = Number(pendingAgg._sum.amount ?? 0)
  const completedBalance = Number(completedAgg._sum.amount ?? 0)
  const requestIds = requests.map((request) => String(request.id))
  const fallbackTransactions = requestIds.length
    ? await db.walletTransaction.findMany({
        where: { publisherId: publisher.id, type: 'WITHDRAWAL', reference: { in: requestIds } },
      })
    : []
  const fallbackRequestedAt = new Map(fallbackTransactions.map((item) => [item.reference, item.createdAt]))

  return NextResponse.json({
    walletBalance: Math.max(0, completedBalance - pendingWithdrawalAmount),
    totalWithdrawn: Number(paidWithdrawAgg._sum.amount ?? 0),
    pendingWithdrawalAmount,
    pendingWithdrawalCount: pendingCount,
    hasPendingRequest: pendingCount > 0,
    withdrawalRequests: requests.map((request) => ({
      ...request,
      amount: Number(request.amount),
      status: request.status || 'PENDING',
      requestedAt: request.requestedAt || fallbackRequestedAt.get(String(request.id)) || null,
    })),
  })
}
