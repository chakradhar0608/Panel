import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const status = new URL(req.url).searchParams.get('status')
  const publishers = await db.publisher.findMany({
    where: status && status !== 'ALL' ? { status } : undefined,
    orderBy: { id: 'desc' },
  })

  const pendingStatusWhere = {
    OR: [{ status: 'PENDING' }, { status: '' }, { status: null }],
  }

  const publishersWithBalance = await Promise.all(
    publishers.map(async (publisher: any) => {
      const [completedAgg, pendingAgg] = await Promise.all([
        db.walletTransaction.aggregate({
          where: { publisherId: publisher.id, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        db.withdrawalRequest.aggregate({
          where: { publisherId: publisher.id, ...pendingStatusWhere },
          _sum: { amount: true },
        }),
      ])

      const completedAmount = Number(completedAgg._sum.amount ?? 0)
      const pendingAmount = Number(pendingAgg._sum.amount ?? 0)

      return {
        ...publisher,
        walletBalance: completedAmount - pendingAmount,
      }
    }),
  )

  return NextResponse.json({ publishers: publishersWithBalance })
}
