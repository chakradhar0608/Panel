import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { parseOfferEvents, matchEvent } from '@/lib/offer-events'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')?.trim() || searchParams.get('upiId')?.trim()
  const campSlug = searchParams.get('camp')?.trim()
  const campIdParam = searchParams.get('campId')?.trim()
  const campId = campIdParam ? Number(campIdParam) : null

  if (!query) {

    return NextResponse.json({ error: 'Search value is required' }, { status: 400 })
  }
  if (!campSlug && !Number.isInteger(campId)) {

    return NextResponse.json({ error: 'Camp ID is required' }, { status: 400 })
  }

  try {

    const camp = Number.isInteger(campId)
      ? await db.camp.findUnique({ where: { id: campId }, include: { offer: true } })
      : await db.camp.findUnique({ where: { campSlug: campSlug! }, include: { offer: true } })

    if (!camp) {

      return NextResponse.json({ error: 'CAMP_NOT_FOUND' }, { status: 404 })
    }
    if (campSlug && camp.campSlug !== campSlug) {

      return NextResponse.json({ error: 'CAMP_MISMATCH' }, { status: 400 })
    }

    const offer = camp.offer
    const { events: offerEvents } = parseOfferEvents(offer?.events)



    const clickLeads = await db.campLead.findMany({
      where: {
        campId: camp.id,
        OR: [
          { userUpi: query },
          { mobileNumber: query },
        ],
      },
      orderBy: { clickedAt: 'desc' },
    })

    const clickIds = clickLeads.map((lead) => lead.clickId).filter(Boolean)
    const eventsForUser = clickIds.length
      ? await db.campLeadEvent.findMany({
          where: {
            campId: camp.id,
            clickId: { in: clickIds },
            status: { in: ['APPROVED', 'PAID'] },
          },
          orderBy: { approvedAt: 'desc' },
        })
      : []

    const leadRows = eventsForUser.map((event) => {
      const matched = matchEvent(offerEvents, event.eventName)
      const eventKey = matched?.name || event.eventName || 'conversion'
      const userPayoutForLead = eventKey === camp.selectedEventName ? Number(camp.userGets || 0) : 0

      return {
        id: event.id,
        eventDisplayName: matched?.displayName || event.eventName || 'Conversion',
        eventKey,
        payout: userPayoutForLead,
        status: event.status,
        approvedAt: event.approvedAt,
        clickedAt: event.convertedAt,
      }
    })

    const eventSummary = offerEvents.map((ev) => {
      const matching = leadRows.filter((row) => row.eventKey === ev.name)
      const userPayoutForEvent = ev.name === camp.selectedEventName ? Number(camp.userGets || 0) : 0

      return {
        eventKey: ev.name,
        displayName: ev.displayName,
        payout: userPayoutForEvent,
        count: matching.length,
        totalEarned: matching.length * userPayoutForEvent,
        lastConvertedAt: matching[0]?.approvedAt || null,
      }
    })

    const totalEarned = leadRows.reduce((sum, row) => sum + row.payout, 0)
    const totalConversions = leadRows.length
    
    const responseData = {
      success: true,
      campId: camp.id,
      campName: camp.campName,
      campSlug: camp.campSlug,
      offerName: offer?.name || '',
      offerImage: offer?.imageUrl || '/next.svg',
      eventSummary,
      leads: leadRows,
      totalEarned,
      totalConversions,
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[TRACKER_API] Tracker API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 })
  }
}
