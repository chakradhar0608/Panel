import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { endOfDay, startOfDay } from '@/app/api/_utils/common'

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const isSummary = url.searchParams.get('summary') === 'true'

  const status = url.searchParams.get('status')
  const publisherId = url.searchParams.get('publisherId')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)))
  const pendingStatusWhere = { OR: [{ status: 'PENDING' }, { status: '' }, { status: null }] }

  const where: any = {}
  if (status && status !== 'ALL') {
    if (status === 'PENDING') where.OR = pendingStatusWhere.OR
    else where.status = status
  }
  if (publisherId) where.publisherId = Number(publisherId)
  if (dateFrom || dateTo) {
    where.requestedAt = {}
    if (dateFrom) where.requestedAt.gte = startOfDay(new Date(dateFrom))
    if (dateTo) where.requestedAt.lte = endOfDay(new Date(dateTo))
  }

  if (isSummary) {
    const [pendingCount, pendingAgg, paidAgg, all] = await Promise.all([
      db.withdrawalRequest.count({ where: { ...where, OR: pendingStatusWhere.OR } }),
      db.withdrawalRequest.aggregate({ where: { ...where, OR: pendingStatusWhere.OR }, _sum: { amount: true } }),
      db.withdrawalRequest.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true }, _count: { _all: true } }),
      db.withdrawalRequest.findMany({ where }),
    ])

    const approvedToday = await db.withdrawalRequest.count({
      where: { ...where, status: 'PAID', processedAt: { gte: startOfDay(new Date()) } },
    })

    const avg = paidAgg._count._all > 0 ? Number(paidAgg._sum.amount ?? 0) / paidAgg._count._all : 0

    return NextResponse.json({
      totalPendingCount: pendingCount,
      totalPendingAmount: Number(pendingAgg._sum.amount ?? 0),
      approvedToday,
      totalPaidOut: Number(paidAgg._sum.amount ?? 0),
      averagePayout: avg,
      total: all.length,
    })
  }

  const [total, requests] = await Promise.all([
    db.withdrawalRequest.count({ where }),
    db.withdrawalRequest.findMany({
      where,
      include: { publisher: { select: { id: true, name: true, email: true } } },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])
  const requestIds = requests.map((item) => String(item.id))
  const fallbackTransactions = requestIds.length
    ? await db.walletTransaction.findMany({
        where: { type: 'WITHDRAWAL', reference: { in: requestIds } },
      })
    : []
  const fallbackRequestedAt = new Map(fallbackTransactions.map((item) => [item.reference, item.createdAt]))

  return NextResponse.json({
    requests: requests.map((item) => ({
      ...item,
      amount: Number(item.amount),
      status: item.status || 'PENDING',
      requestedAt: item.requestedAt || fallbackRequestedAt.get(String(item.id)) || null,
    })),
    total,
    page,
    limit,
  })
}
