import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { parseOfferEvents } from '@/lib/offer-events'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED', message: 'Your account is pending admin approval.' }, { status: 403 })
  }

  const approvedOnly = new URL(req.url).searchParams.get('approvedOnly') === 'true'
  const publisherOffers = await db.publisherOffer.findMany({ where: { publisherId: publisher.id } })
const approvalMap = new Map(publisherOffers.map((item: any) => [item.offerId, item.status || 'PENDING']))

// Offer IDs this publisher has been explicitly approved for
const approvedOfferIds = publisherOffers
  .filter((po: any) => po.status === 'APPROVED')
  .map((po: any) => po.offerId)

const where: any = {}
if (!approvedOnly) {
  // Show all non-limited active offers, plus limited ones only if publisher has approved access
  where.status = 'ACTIVE'
  where.OR = [
    { isLimited: false },
    { isLimited: null },
    { id: { in: approvedOfferIds } },
  ]
} else {
  where.id = { in: approvedOfferIds }
}

  const offers = await db.offer.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
  })

  // Keep active offers visible even when a limited-access approval is revoked.
  // The detail page will fall back to the restricted/request-access state unless status is APPROVED.
  const visibleOffers = offers as any[]

  // ── Dynamic daily cap usage — single batched query for all offers ──
  const offerIds = visibleOffers.map((o) => o.id)

  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istTime = new Date(now.getTime() + istOffset)
  
  const yyyy = istTime.getUTCFullYear()
  const mm = istTime.getUTCMonth()
  const dd = istTime.getUTCDate()
  
  const startOfDay = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0) - istOffset)
  const endOfDay   = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999) - istOffset)

  // One query: today's conversion counts by (offerId, eventName)
  let conversionRows: any[] = []
  if (offerIds.length > 0) {
    conversionRows = await db.$queryRawUnsafe(
  `SELECT offerId, eventName, COUNT(*) AS cnt
   FROM (
     SELECT offerId, CONVERT(eventName USING utf8mb4) COLLATE utf8mb4_general_ci AS eventName FROM CampLeadEvent
     WHERE offerId IN (${offerIds.join(',')})
       AND createdAt >= ? AND createdAt <= ?
     UNION ALL
     SELECT offerId, CONVERT(eventName USING utf8mb4) COLLATE utf8mb4_general_ci AS eventName FROM LeadCut
     WHERE offerId IN (${offerIds.join(',')})
       AND cutAt >= ? AND cutAt <= ?
   ) AS combined
   GROUP BY offerId, eventName`,
  startOfDay, endOfDay,
  startOfDay, endOfDay
) as any[]
  }

  // Build lookup: offerId → eventName → count
  const convMap: Record<number, Record<string, number>> = {}
  for (const row of conversionRows) {
    const oid = Number(row.offerId)
    if (!convMap[oid]) convMap[oid] = {}
    convMap[oid][String(row.eventName)] = Number(row.cnt)
  }

  // Assemble response: attach capUsage + capReached to each offer
  const enrichedOffers = visibleOffers.map((offer) => {
    const { events: offerEvents } = parseOfferEvents(offer.events)
    const offerConv = convMap[offer.id] || {}

    let capReached = false
    const capUsage: Record<string, { used: number; cap: number }> = {}

    for (const event of offerEvents) {
      const cap = event.dailyCap
      if (cap && cap > 0) {
        const key = event.displayName || event.name
        // Sum across all aliases (displayName + name + identifiers)
        const aliases = [event.displayName, event.name, ...(event.identifiers || [])].filter(Boolean)
        const used = aliases.reduce((sum, alias) => sum + (offerConv[alias] || 0), 0)
        capUsage[key] = { used, cap }
        if (used >= cap) capReached = true
      }
    }

    return {
      ...offer,
      publisherId: publisher.id,
      publisherPayout: Number(offer.publisherPayout),
      events: offer.events || '[]',
      steps: offer.steps || '[]',
      approvalStatus: approvalMap.get(offer.id) || 'AVAILABLE',
      capReached,   // true if ANY event has hit its daily cap today
      capUsage,     // { 'Install': { used: 450, cap: 1000 }, ... }
    }
  })

  return NextResponse.json({
    offers: enrichedOffers.filter((offer) => !approvedOnly || offer.approvalStatus === 'APPROVED'),
  })
}
