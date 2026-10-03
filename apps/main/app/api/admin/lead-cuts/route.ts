import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { jsonError } from '@/app/api/_utils/common'

function startOfIstDay(dateText: string) {
  return new Date(`${dateText}T00:00:00+05:30`)
}
function endOfIstDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999+05:30`)
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return jsonError('UNAUTHORIZED', 401)

  const url = new URL(req.url)
  const offerId = url.searchParams.get('offerId')
  const offerIdsParam = url.searchParams.get('offerIds')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)))

  const cutWhere: any = {}
  const processedWhere: any = {}

  if (offerIdsParam) {
    const offerIds = offerIdsParam.split(',').map(Number).filter((value) => value > 0)
    if (offerIds.length > 0) {
      cutWhere.offerId = { in: offerIds }
      processedWhere.offerId = { in: offerIds }
    }
  } else if (offerId) {
    cutWhere.offerId = Number(offerId)
    processedWhere.offerId = Number(offerId)
  }
  if (dateFrom || dateTo) {
    cutWhere.cutAt = {}
    processedWhere.approvedAt = {}
    if (dateFrom) {
      cutWhere.cutAt.gte = startOfIstDay(dateFrom)
      processedWhere.approvedAt.gte = startOfIstDay(dateFrom)
    }
    if (dateTo) {
      cutWhere.cutAt.lte = endOfIstDay(dateTo)
      processedWhere.approvedAt.lte = endOfIstDay(dateTo)
    }
  }

  const [allCuts, totalProcessed, paginatedCuts] = await Promise.all([
    db.leadCut.findMany({ where: cutWhere }),
    db.campLeadEvent.count({ where: { ...processedWhere, status: { in: ['APPROVED', 'PAID'] } } }),
    db.leadCut.findMany({
      where: cutWhere,
      orderBy: { cutAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const totalCut = allCuts.length
  const totalReceived = totalCut + totalProcessed
  const cutRate = totalReceived > 0 ? Math.round((totalCut / totalReceived) * 100 * 10) / 10 : 0

  // Collect all offer IDs referenced in cuts
  const offerIds = Array.from(new Set([
    ...allCuts.map((c: any) => c.offerId),
    ...paginatedCuts.map((c: any) => c.offerId),
  ].filter(Boolean)))

  const publisherIds = Array.from(new Set(paginatedCuts.map((c: any) => c.publisherId).filter(Boolean)))

  const [offers, publishers] = await Promise.all([
    offerIds.length ? db.offer.findMany({ where: { id: { in: offerIds } } }) : [],
    publisherIds.length ? db.publisher.findMany({ where: { id: { in: publisherIds } } }) : [],
  ])

  const offerById = new Map((offers as any[]).map((o) => [o.id, o]))
  const publisherById = new Map((publishers as any[]).map((p) => [p.id, p]))

  // By-offer breakdown
  const offerCutCount = new Map<number, number>()
  for (const cut of allCuts as any[]) {
    offerCutCount.set(cut.offerId, (offerCutCount.get(cut.offerId) || 0) + 1)
  }

  const processedByOffer = new Map<number, number>()
  if (offerIds.length) {
    for (const oid of offerIds) {
      const count = await db.campLeadEvent.count({
        where: { ...processedWhere, offerId: oid, status: { in: ['APPROVED', 'PAID'] } },
      })
      processedByOffer.set(oid, count)
    }
  }

  const byOffer = Array.from(offerCutCount.entries()).map(([oid, cut]) => {
    const processed = processedByOffer.get(oid) || 0
    const received = cut + processed
    return {
      offerId: oid,
      offerName: (offerById.get(oid) as any)?.name || `Offer #${oid}`,
      cut,
      processed,
      received,
      cutRate: received > 0 ? Math.round((cut / received) * 100 * 10) / 10 : 0,
    }
  }).sort((a, b) => b.received - a.received)

  // By-date breakdown
  const dateCutCount = new Map<string, number>()
  for (const cut of allCuts as any[]) {
    if (!cut.cutAt) continue
    const key = new Date(cut.cutAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    dateCutCount.set(key, (dateCutCount.get(key) || 0) + 1)
  }

  const processedDates = dateCutCount.size > 0
    ? await db.campLeadEvent.findMany({
        where: { ...processedWhere, status: { in: ['APPROVED', 'PAID'] } },
        select: { approvedAt: true },
      })
    : []

  const dateProcessedCount = new Map<string, number>()
  for (const row of processedDates as any[]) {
    if (!row.approvedAt) continue
    const key = new Date(row.approvedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    dateProcessedCount.set(key, (dateProcessedCount.get(key) || 0) + 1)
  }

  const allDateKeys = new Set([...dateCutCount.keys(), ...dateProcessedCount.keys()])
  const byDate = Array.from(allDateKeys).map((date) => {
    const cut = dateCutCount.get(date) || 0
    const processed = dateProcessedCount.get(date) || 0
    const received = cut + processed
    return {
      date,
      cut,
      processed,
      received,
      cutRate: received > 0 ? Math.round((cut / received) * 100 * 10) / 10 : 0,
    }
  }).sort((a, b) => {
    const [ad, am, ay] = a.date.split('/').map(Number)
    const [bd, bm, by_] = b.date.split('/').map(Number)
    return new Date(ay, am - 1, ad).getTime() > new Date(by_, bm - 1, bd).getTime() ? -1 : 1
  })

  const records = (paginatedCuts as any[]).map((cut) => ({
    id: cut.id,
    offerId: cut.offerId,
    offerName: (offerById.get(cut.offerId) as any)?.name || `Offer #${cut.offerId}`,
    publisherId: cut.publisherId,
    publisherName: (publisherById.get(cut.publisherId) as any)?.name || `Publisher #${cut.publisherId}`,
    clickId: cut.clickId,
    eventName: cut.eventName || '—',
    payout: Number(cut.payout || 0),
    cutAt: cut.cutAt instanceof Date ? cut.cutAt.toISOString() : cut.cutAt,
  }))

  return NextResponse.json({
    totalCut,
    totalProcessed,
    totalReceived,
    cutRate,
    byOffer,
    byDate,
    records,
    total: totalCut,
    page,
    limit,
  })
}
