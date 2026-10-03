import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

function startOfIstDay(dateText: string) {
  return new Date(`${dateText}T00:00:00+05:30`)
}

function endOfIstDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999+05:30`)
}

export async function GET(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const offerIds = (url.searchParams.get('offerIds') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
  const eventNames = (url.searchParams.get('eventNames') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const status = url.searchParams.get('status') || 'All'
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)))

  const where: any = { publisherId: publisher.id }
  if (offerIds.length) where.offerId = { in: offerIds }
  if (eventNames.length) where.eventName = { in: eventNames }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = startOfIstDay(dateFrom)
    if (dateTo) where.createdAt.lte = endOfIstDay(dateTo)
  }

  const whereWithStatus = { ...where }
  if (status !== 'All') {
    if (status === 'APPROVED') {
      whereWithStatus.status = { in: ['APPROVED', 'PAID'] }
    } else {
      whereWithStatus.status = status
    }
  }

  const [totalFiltered, events, statsAgg, eventCountRows, totalConversionsCount] = await Promise.all([
    db.campLeadEvent.count({ where: whereWithStatus }),
    db.campLeadEvent.findMany({
      where: whereWithStatus,
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.campLeadEvent.aggregate({
      where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { payout: true },
    }),
    db.campLeadEvent.findMany({
      where,
      select: { eventName: true, offerId: true },
    }),
    db.campLeadEvent.count({ where }),
  ])

  const clickIds = Array.from(new Set(events.map((event) => event.clickId).filter(Boolean)))
  const campIdsForRows = Array.from(new Set(events.map((event) => event.campId).filter(Boolean)))
  const leads = clickIds.length
    ? await db.campLead.findMany({
        where: { clickId: { in: clickIds } },
      })
    : []
  const camps = campIdsForRows.length
    ? await db.camp.findMany({
        where: { id: { in: campIdsForRows } },
      })
    : []
  const leadByClickId = new Map(leads.map((lead) => [lead.clickId, lead]))
  const campById = new Map(camps.map((camp) => [camp.id, camp]))

  // Gather all unique offer IDs across active records and count records to fetch their images/names
  const allOfferIds = Array.from(
    new Set([
      ...events.map((e) => e.offerId),
      ...eventCountRows.map((r) => r.offerId),
    ].filter(Boolean))
  )
  const offersData = allOfferIds.length
    ? await db.offer.findMany({
        where: { id: { in: allOfferIds } },
        select: { id: true, name: true, imageUrl: true },
      })
    : []
  const offerMap = new Map(offersData.map((o) => [o.id, o]))

  // Build per-offer/event count map from all records
  const eventCountsMap = new Map<string, number>()
  for (const row of eventCountRows) {
    const key = `${row.offerId}:${row.eventName || '—'}`
    eventCountsMap.set(key, (eventCountsMap.get(key) || 0) + 1)
  }
  const eventCounts = Array.from(eventCountsMap.entries()).map(([key, count]) => {
    const [offerIdStr, eventName] = key.split(':')
    const offerId = Number(offerIdStr)
    const offer = offerMap.get(offerId)
    return {
      offerId,
      offerName: offer?.name || `Offer #${offerId}`,
      eventName,
      count,
    }
  })

  return NextResponse.json({
    leads: events.map((event) => {
      const leadDetails = leadByClickId.get(event.clickId) as any || {}
      const offer = offerMap.get(event.offerId)
      return {
        ...leadDetails,
        id: event.id,
        clickId: event.clickId,
        mobileNumber: leadDetails.mobileNumber || null,
        userUpi: leadDetails.userUpi || null,
        offerName: offer?.name || `Offer #${event.offerId}`,
        offerId: event.offerId,
        offerImageUrl: offer?.imageUrl || null,
        campName: event.campId ? (campById.get(event.campId) as any)?.campName || '-' : '-',
        campId: event.campId || null,
        eventName: event.eventName,
        payout: Number(event.payout),
        status: event.status,
        device: event.device,
        browser: event.browser,
        ipAddress: event.ipAddress,
        idfa: event.idfa || leadDetails.idfa || null,
        googleAid: event.googleAid || leadDetails.googleAid || null,
        p1: event.p1,
        p2: event.p2,
        p3: event.p3,
        p4: event.p4,
        p5: event.p5,
        sub1: event.sub1 || leadDetails.sub1 || null,
        sub2: event.sub2 || leadDetails.sub2 || null,
        sub3: event.sub3 || leadDetails.sub3 || null,
        sub4: event.sub4 || leadDetails.sub4 || null,
        sub5: event.sub5 || leadDetails.sub5 || null,
        postbackSent: event.postbackSent,
        postbackSentAt: event.postbackSentAt,
        postbackResponse: event.postbackResponse,
        clickedAt:
          leadDetails.clickedAt instanceof Date
            ? leadDetails.clickedAt.toISOString()
            : leadDetails.clickedAt || event.convertedAt,
        convertedAt: event.convertedAt,
        approvedAt: event.approvedAt,
        location: null,
      }
    }),
    total: totalFiltered,
    page,
    limit,
    stats: {
      totalConversions: totalConversionsCount,
      totalPayout: Number(statsAgg._sum.payout ?? 0),
      eventCounts,
    },
  })
}
