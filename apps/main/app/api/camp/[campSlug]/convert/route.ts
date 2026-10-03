import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { parseOfferEvents, matchEvent } from '@/lib/offer-events'
import { notifyPublisherConversion } from '@/lib/telegram-bot'

export async function POST(req: Request, { params }: { params: { campSlug: string } }) {
  const url = new URL(req.url)
  let clickId = url.searchParams.get('clickId') || ''
  let event = url.searchParams.get('event') || ''
  let payoutParam = url.searchParams.get('payout')

  if (!clickId || !event) {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>
    clickId = clickId || body.clickId || ''
    event = event || body.event || ''
    payoutParam = payoutParam || body.payout || null
  }

  if (!clickId || !event) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 422 })
  }

  const lead = await db.campLead.findUnique({ where: { clickId }, include: { camp: true, offer: true } })
  if (!lead) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  if (lead.camp?.campSlug !== params.campSlug) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  const { events } = parseOfferEvents(lead.offer.events)

  const matchedEvent = matchEvent(events, event) || events.find((item) => item.name === event) || null
  const resolvedEventName = matchedEvent?.displayName || event
  const resolvedPayout = payoutParam ? Number(payoutParam) : Number(matchedEvent?.payout ?? 0)
  const conversionTime = new Date()

  // Dedup: same clickId + same eventName within a 10-minute window = duplicate retry
  // Using clickId (not campLeadId) so multi-event offers don't block distinct events
  const tenMinutesAgo = new Date(conversionTime.getTime() - 10 * 60 * 1000)
  const existingEvent = await db.campLeadEvent.findFirst({
    where: {
      clickId: lead.clickId,
      eventName: resolvedEventName,
      convertedAt: { gte: tenMinutesAgo },
    },
  })
  if (existingEvent) {
    return NextResponse.json({ success: true })
  }

  const createdEvent = await db.$transaction(async (tx) => {
    const nextEvent = await tx.campLeadEvent.create({
      data: {
        campLeadId: lead.id,
        campId: lead.campId,
        publisherId: lead.publisherId,
        offerId: lead.offerId,
        clickId: lead.clickId,
        eventName: resolvedEventName,
        payout: resolvedPayout,
        status: 'APPROVED',
        p2: lead.p2,
        p3: lead.p3,
        p4: lead.p4,
        ipAddress: lead.ipAddress,
        device: lead.device,
        postbackSent: false,
        convertedAt: conversionTime,
        approvedAt: conversionTime,
        createdAt: conversionTime,
      },
    })


    await tx.campLead.update({
      where: { id: lead.id },
      data: {
        status: 'APPROVED',
        eventName: resolvedEventName,
        payout: resolvedPayout,
        convertedAt: conversionTime,
        approvedAt: conversionTime,
      },
    })

    await tx.publisher.update({
      where: { id: lead.publisherId },
      data: {
        walletBalance: { increment: resolvedPayout },
        totalEarned: { increment: resolvedPayout },
      },
    })

    await tx.walletTransaction.create({
      data: {
        publisherId: lead.publisherId,
        amount: resolvedPayout,
        type: 'CREDIT',
        status: 'COMPLETED',
        details: `Click: ${lead.clickId} | Event: ${resolvedEventName} | Offer: ${lead.offer.name}`,
        reference: `${lead.clickId}:${resolvedEventName}`,
        createdAt: conversionTime,
      },
    })

    if (lead.campId) {
      await tx.camp.update({ where: { id: lead.campId }, data: { totalConversions: { increment: 1 } } })
    }

    return nextEvent
  })

  // Camp-page conversions do NOT fire the publisher's global postback.
  // Only tracking-URL leads (campId = null, created via /api/go) should trigger it.

  void notifyPublisherConversion(lead.publisherId, {
    offerName: lead.offer.name,
    eventName: resolvedEventName,
    payout: resolvedPayout,
    clickId: lead.clickId,
  })

  return NextResponse.json({ success: true })
}