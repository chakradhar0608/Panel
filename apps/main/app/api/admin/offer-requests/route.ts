import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const isSummary = url.searchParams.get('summary') === 'true'
  const status = url.searchParams.get('status')
  const publisherId = url.searchParams.get('publisherId')

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status
  if (publisherId) where.publisherId = Number(publisherId)

  const requests = await db.publisherOffer.findMany({
    where,
    orderBy: { id: 'desc' },
  })

  if (isSummary) {
    return NextResponse.json({
      totalPendingCount: requests.filter((item: any) => (item.status || 'PENDING') === 'PENDING').length,
    })
  }

  const publisherIds = Array.from(new Set(requests.map((item: any) => item.publisherId)))
  const offerIds = Array.from(new Set(requests.map((item: any) => item.offerId)))
  const [publishers, offers] = await Promise.all([
    publisherIds.length ? db.publisher.findMany({ where: { id: { in: publisherIds } } }) : [],
    offerIds.length ? db.offer.findMany({ where: { id: { in: offerIds } } }) : [],
  ])

  const publisherMap = new Map(publishers.map((item: any) => [item.id, item]))
  const offerMap = new Map(offers.map((item: any) => [item.id, item]))

  return NextResponse.json({
    requests: requests.map((item: any) => ({
      ...item,
      publisher: publisherMap.get(item.publisherId) || null,
      offer: offerMap.get(item.offerId) || null,
    })),
  })
}
