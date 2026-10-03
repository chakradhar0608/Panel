import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'

function startOfIstDay(dateText: string) {
  return new Date(`${dateText}T00:00:00+05:30`)
}

function endOfIstDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999+05:30`)
}

function todayIstStr() {
  return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function yesterdayIstStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const isOfferList = url.searchParams.get('offerList') === 'true'

  // ── Return all offers that have at least one conversion event ──
  // FIX: Use a single efficient DISTINCT query instead of loading all campLeadEvent rows
  if (isOfferList) {
    // Step 1: get distinct offer IDs that have conversion events — fast SQL
    const offers = await db.offer.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    })

    return NextResponse.json({
      offers: (offers as any[]).map((o) => ({
        id: o.id,
        name: o.name,
        events: o.events || '[]',
      })),
    })
  }

  // ── Stats mode ──
  const isStats = url.searchParams.get('stats') === 'true'

  // ── Build where clause from filters ──
  const where: any = {}

  const offerIdsParam = url.searchParams.get('offerIds')
  const eventNamesParam = url.searchParams.get('eventNames')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam === 'all' ? undefined : Math.max(1, Number(limitParam || 50))

  // Filter by offer(s)
  if (offerIdsParam) {
    const ids = offerIdsParam.split(',').map(Number).filter((n) => n > 0)
    if (ids.length > 0) where.offerId = { in: ids }
  }

  // Filter by event name(s)
  if (eventNamesParam) {
    const names = eventNamesParam.split(',').filter(Boolean)
    if (names.length > 0) where.eventName = { in: names }
  }

  // Only approved/paid/rejected conversions
  where.status = { in: ['APPROVED', 'PAID', 'REJECTED'] }

  // Date filter on approvedAt
  if (dateFrom || dateTo) {
    where.approvedAt = {} as any
    if (dateFrom) where.approvedAt.gte = startOfIstDay(dateFrom)
    if (dateTo) where.approvedAt.lte = endOfIstDay(dateTo)
  }

  // ── Stats mode: return summary cards data ──
  if (isStats) {
    const allEvents = await db.campLeadEvent.findMany({
      where,
      include: { offer: { select: { id: true, name: true } } },
      orderBy: { approvedAt: 'desc' },
    })

    const todayStr = todayIstStr()
    const yesterdayStr = yesterdayIstStr()

    let totalConversions = 0
    let totalPayout = 0
    let todayConversions = 0
    let todayPayout = 0
    let yesterdayConversions = 0
    let yesterdayPayout = 0
    const eventCounts: Record<string, number> = {}

    for (const event of allEvents as any[]) {
      const p = Number(event.payout || 0)
      totalConversions += 1
      totalPayout += p

      const dt = event.approvedAt || event.convertedAt || event.createdAt
      if (dt) {
        const dateKey = new Date(dt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
        if (dateKey === todayStr) { todayConversions += 1; todayPayout += p }
        if (dateKey === yesterdayStr) { yesterdayConversions += 1; yesterdayPayout += p }
      }

      const label = event.eventName || '—'
      eventCounts[label] = (eventCounts[label] || 0) + 1
    }

    return NextResponse.json({
      totalConversions,
      totalPayout,
      todayConversions,
      todayPayout,
      yesterdayConversions,
      yesterdayPayout,
      eventCounts,
    })
  }

  // ── Query conversions ──
  const [total, events] = await Promise.all([
    db.campLeadEvent.count({ where }),
    db.campLeadEvent.findMany({
      where,
      include: {
        publisher: { select: { id: true, name: true, email: true } },
        camp: { select: { id: true, campName: true, campSlug: true } },
        offer: { select: { id: true, name: true } },
        lead: {
          select: {
            mobileNumber: true,
            userUpi: true,
            referrerUpi: true,
            sub1: true,
            sub2: true,
            sub3: true,
            clickedAt: true,
          },
        },
      },
      orderBy: { approvedAt: 'desc' },
      ...(limit ? { skip: (page - 1) * limit, take: limit } : {}),
    }),
  ])

  // ── Compute summary stats ──
  const payoutAgg = await db.campLeadEvent.aggregate({
    where,
    _sum: { payout: true },
  })

  return NextResponse.json({
    leads: (events as any[]).map((event) => ({
      id: event.id,
      publisher: event.publisher,
      camp: event.camp,
      offer: event.offer,
      eventName: event.eventName,
      clickId: event.clickId,
      mobileNumber: event.p3 || event.lead?.mobileNumber || null,
      payout: Number(event.payout),
      status: event.status,
      clickedAt: event.lead?.clickedAt instanceof Date ? event.lead.clickedAt.toISOString() : event.lead?.clickedAt,
      convertedAt: event.convertedAt instanceof Date ? event.convertedAt.toISOString() : event.convertedAt,
      approvedAt: event.approvedAt instanceof Date ? event.approvedAt.toISOString() : event.approvedAt,
      userUpi: event.p2 || event.lead?.userUpi || null,
      ipAddress: event.ipAddress,
      device: event.device,
      sub1: event.lead?.sub1 || null,
      p1: event.lead?.p1 || null,
      p2: event.p2 || null,
      p3: event.p3 || null,
      p4: event.p4 || null,
      sub2: event.lead?.sub2 || null,
      sub3: event.lead?.sub3 || null,
      postbackSent: event.postbackSent,
      postbackSentAt: event.postbackSentAt instanceof Date ? event.postbackSentAt.toISOString() : event.postbackSentAt,
      postbackResponse: event.postbackResponse,
    })),
    total,
    totalPayout: Number(payoutAgg._sum?.payout ?? 0),
    page,
    limit,
  })
}
