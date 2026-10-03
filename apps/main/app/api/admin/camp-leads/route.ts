import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { parseOfferEvents } from '@/lib/offer-events'

function startOfIstDay(dateText: string) {
  return new Date(`${dateText}T00:00:00+05:30`)
}

function endOfIstDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999+05:30`)
}

async function getPublisherSummaries() {
  const publishers = await db.publisher.findMany({
    where: { status: 'APPROVED' },
    orderBy: { name: 'asc' },
  })

  const summaries = await Promise.all(
    publishers.map(async (publisher: any) => {
      const [completedAgg, pendingAgg, earnedAgg] = await Promise.all([
        db.walletTransaction.aggregate({
          where: { publisherId: publisher.id, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        db.withdrawalRequest.aggregate({
          where: { publisherId: publisher.id, status: 'PENDING' },
          _sum: { amount: true },
        }),
        db.campLeadEvent.aggregate({
          where: { publisherId: publisher.id, status: { in: ['APPROVED', 'PAID'] } },
          _sum: { payout: true },
        }),
      ])

      const walletBalance = Math.max(
        0,
        Number(completedAgg._sum.amount ?? 0) - Number(pendingAgg._sum.amount ?? 0)
      )

      return {
        id: publisher.id,
        name: publisher.name,
        email: publisher.email,
        walletBalance,
        totalEarned: Number(earnedAgg._sum.payout ?? 0),
      }
    })
  )

  return summaries
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const isSummary = url.searchParams.get('summary') === 'true'
  const isPublisherList = url.searchParams.get('publisherList') === 'true'
  const isOfferList = url.searchParams.get('offerList') === 'true'
  const isManualOfferList = url.searchParams.get('manualOfferList') === 'true'
  const isStats = url.searchParams.get('stats') === 'true'
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)))

  if (isPublisherList) {
    return NextResponse.json({ publishers: await getPublisherSummaries() })
  }

  if (isOfferList) {
    const publisherId = Number(url.searchParams.get('publisherId') || 0)
    if (!Number.isInteger(publisherId) || publisherId <= 0) {
      return NextResponse.json({ offers: [] })
    }

    const offers = await db.offer.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    })

    return NextResponse.json({
      offers: (offers as any[]).map((offer: any) => ({
        id: offer.id,
        name: offer.name,
        events: offer.events || '[]',
      })),
    })
  }

  if (isManualOfferList) {
    const publisherId = Number(url.searchParams.get('publisherId') || 0)
    if (!Number.isInteger(publisherId) || publisherId <= 0) {
      return NextResponse.json({ offers: [] })
    }

    const approvedRequests = await db.publisherOffer.findMany({
      where: { publisherId, status: 'APPROVED' },
      orderBy: { id: 'desc' },
    })

    const offers = approvedRequests.length
      ? await db.offer.findMany({
          where: { id: { in: approvedRequests.map((item: any) => item.offerId) }, status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
        })
      : []

    return NextResponse.json({
      offers: offers.map((offer: any) => ({
        id: offer.id,
        name: offer.name,
        events: offer.events || '[]',
      })),
    })
  }

  const where: any = {}
  const publisherId = url.searchParams.get('publisherId')
  const campId = url.searchParams.get('campId')
  const status = url.searchParams.get('status')
  const offerId = url.searchParams.get('offerId')
  const offerIdsParam = url.searchParams.get('offerIds')
  const eventNamesParam = url.searchParams.get('eventNames')
  const eventName = url.searchParams.get('eventName')
  const searchClickId = url.searchParams.get('searchClickId')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const dateField = url.searchParams.get('dateField') || 'approvedAt'

  if (publisherId) where.publisherId = Number(publisherId)
  if (campId) where.campId = Number(campId)
  // Multi-offer support (offerIds takes precedence over single offerId)
  if (offerIdsParam) {
    const ids = offerIdsParam.split(',').map(Number).filter((n) => n > 0)
    if (ids.length > 0) where.offerId = { in: ids }
  } else if (offerId) {
    where.offerId = Number(offerId)
  }
  // Multi-event support
  if (eventNamesParam) {
    const names = eventNamesParam.split(',').filter(Boolean)
    if (names.length > 0) where.eventName = { in: names }
  } else if (eventName && eventName !== 'ALL') {
    where.eventName = eventName
  }
  if (status && status !== 'ALL') where.status = status
  if (searchClickId) where.clickId = { contains: searchClickId }
  if (!status || status === 'ALL') {
    where.status = { in: ['APPROVED', 'PAID', 'REJECTED'] }
  }

  if (dateFrom || dateTo) {
    where[dateField] = {}
    if (dateFrom) where[dateField].gte = startOfIstDay(dateFrom)
    if (dateTo) where[dateField].lte = endOfIstDay(dateTo)
  }

  if (isStats) {
    const events = await db.campLeadEvent.findMany({
      where,
      include: {
        offer: { select: { id: true, name: true } },
        camp: { select: { id: true, campName: true } },
      },
      orderBy: { approvedAt: 'desc' },
    })

    const byDate = new Map<string, { date: string; conversions: number; payout: number; events: Map<string, number> }>()
    const globalEventCounts: Record<string, number> = {}

    for (const event of events as any[]) {
      // Global event counts
      const globalLabel = event.eventName || '—'
      globalEventCounts[globalLabel] = (globalEventCounts[globalLabel] || 0) + 1

      const dt = event.approvedAt || event.convertedAt || event.createdAt
      if (!dt) continue
      const dateKey = new Date(dt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })

      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, { date: dateKey, conversions: 0, payout: 0, events: new Map() })
      }
      const row = byDate.get(dateKey)!
      row.conversions += 1
      row.payout += Number(event.payout || 0)
      const label = event.eventName || 'Unknown'
      row.events.set(label, (row.events.get(label) || 0) + 1)
    }

    const totalConversions = events.length
    const totalPayout = events.reduce((sum: number, event: any) => sum + Number(event.payout || 0), 0)
    const todayStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    const todayRow = byDate.get(todayStr)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    const yesterdayRow = byDate.get(yesterdayStr)

    return NextResponse.json({
      totalConversions,
      totalPayout,
      todayConversions: todayRow?.conversions || 0,
      todayPayout: todayRow?.payout || 0,
      yesterdayConversions: yesterdayRow?.conversions || 0,
      yesterdayPayout: yesterdayRow?.payout || 0,
      eventCounts: globalEventCounts,
      byDate: Array.from(byDate.values())
        .map((row) => ({
          date: row.date,
          conversions: row.conversions,
          payout: row.payout,
          events: Object.fromEntries(row.events),
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    })
  }

  if (isSummary) {
    const [totalEvents, totalApproved, totalPayout] = await Promise.all([
      db.campLeadEvent.count({ where }),
      db.campLeadEvent.count({ where: { ...where, status: { in: ['APPROVED', 'PAID'] } } }),
      db.campLeadEvent.aggregate({ where: { ...where, status: { in: ['APPROVED', 'PAID'] } }, _sum: { payout: true } }),
    ])

    return NextResponse.json({
      totalLeads: totalEvents,
      approved: totalApproved,
      totalPayoutDue: Number(totalPayout._sum.payout ?? 0),
    })
  }

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
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

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
      isAutoApproved: true,
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
      p5: event.lead?.p5 || null,
      sub2: event.lead?.sub2 || null,
      sub3: event.lead?.sub3 || null,
      postbackSent: event.postbackSent,
      postbackSentAt: event.postbackSentAt instanceof Date ? event.postbackSentAt.toISOString() : event.postbackSentAt,
      postbackResponse: event.postbackResponse,
      referrerUpi: event.p4 || event.lead?.referrerUpi || null,
    })),
    total,
    page,
    limit,
  })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = (await req.json()) as {
    publisherId?: number
    offerId?: number
    counts?: Record<string, number>
  }

  const publisherId = Number(body.publisherId || 0)
  const offerId = Number(body.offerId || 0)
  const counts = body.counts || {}

  if (!Number.isInteger(publisherId) || publisherId <= 0) {
    return NextResponse.json({ error: 'INVALID_PUBLISHER_ID' }, { status: 422 })
  }
  if (!Number.isInteger(offerId) || offerId <= 0) {
    return NextResponse.json({ error: 'INVALID_OFFER_ID' }, { status: 422 })
  }

  const [publisher, offer, publisherOffer] = await Promise.all([
    db.publisher.findUnique({ where: { id: publisherId } }),
    db.offer.findUnique({ where: { id: offerId } }),
    db.publisherOffer.findFirst({ where: { publisherId, offerId, status: 'APPROVED' } }),
  ])

  if (!publisher) return NextResponse.json({ error: 'PUBLISHER_NOT_FOUND' }, { status: 404 })
  if (!offer) return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })
  if (!publisherOffer) return NextResponse.json({ error: 'OFFER_NOT_APPROVED_FOR_PUBLISHER' }, { status: 422 })

  const configuredEvents = parseOfferEvents(offer.events).events
  const selectedEvents = configuredEvents
    .map((event) => ({
      displayName: event.displayName || event.name,
      payout: Number(event.payout || 0),
      count: Number(counts[event.displayName || event.name] || 0),
    }))
    .filter((event) => Number.isFinite(event.count) && event.count > 0)

  if (!selectedEvents.length) {
    return NextResponse.json({ error: 'NO_EVENTS_SELECTED' }, { status: 422 })
  }

  const now = new Date()
  let createdEvents = 0
  let totalPayout = 0

  await db.$transaction(async (tx: any) => {
    for (const event of selectedEvents) {
      for (let index = 0; index < event.count; index += 1) {
        const clickId = `admin-${publisherId}-${offerId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

        const lead = await tx.campLead.create({
          data: {
            campId: null,
            publisherId,
            offerId,
            clickId,
            eventName: event.displayName,
            payout: event.payout,
            status: 'APPROVED',
            adminNote: `Manual conversion added by admin (${admin.email || 'admin'})`,
            ipAddress: 'MANUAL',
            userAgent: 'ADMIN_MANUAL',
            device: 'ADMIN',
            postbackSent: false,
            isAutoApproved: true,
            clickedAt: now,
            convertedAt: now,
            approvedAt: now,
          },
        })

        await tx.campLeadEvent.create({
          data: {
            campLeadId: lead.id,
            campId: null,
            publisherId,
            offerId,
            clickId,
            eventName: event.displayName,
            payout: event.payout,
            status: 'APPROVED',
            ipAddress: 'MANUAL',
            device: 'ADMIN',
            postbackSent: false,
            postbackResponse: `Manual conversion added by admin (${admin.email || 'admin'})`,
            convertedAt: now,
            approvedAt: now,
            createdAt: now,
          },
        })

        await tx.walletTransaction.create({
          data: {
            publisherId,
            amount: event.payout,
            type: 'CREDIT',
            status: 'COMPLETED',
            details: `Manual admin conversion | Offer: ${offer.name} | Event: ${event.displayName}`,
            reference: `${clickId}:${event.displayName}`,
            createdAt: now,
          },
        })

        await tx.publisher.update({
          where: { id: publisherId },
          data: {
            walletBalance: { increment: event.payout },
            totalEarned: { increment: event.payout },
          },
        })

        createdEvents += 1
        totalPayout += event.payout
      }
    }
  })

  return NextResponse.json({
    success: true,
    createdEvents,
    totalPayout,
  })
}
