import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { parseOfferEvents } from '@/lib/offer-events'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED', message: 'Your account is pending admin approval.' }, { status: 403 })
  }

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })

  const offer = await db.offer.findUnique({ where: { id } })
  if (!offer) return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })
  if ((offer as any).status !== 'ACTIVE') return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })

  const request = await db.publisherOffer.findFirst({ where: { publisherId: publisher.id, offerId: id } })
  // ── Dynamic daily cap usage ──
  // Count today's conversions per event so the publisher sees remaining caps live.
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istTime = new Date(now.getTime() + istOffset)
  
  const yyyy = istTime.getUTCFullYear()
  const mm = istTime.getUTCMonth()
  const dd = istTime.getUTCDate()
  
  const startOfDay = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0) - istOffset)
  const endOfDay   = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999) - istOffset)

  const { events: offerEvents } = parseOfferEvents((offer as any).events)

  const cappedEvents = offerEvents.filter((e) => e.dailyCap && e.dailyCap > 0)

  let capUsage: Record<string, { used: number; cap: number }> = {}

  for (const event of cappedEvents) {
    const key = event.displayName || event.name
    const aliases = [event.displayName, event.name, ...(event.identifiers || [])]
      .filter((v): v is string => Boolean(v))
      .filter((v, i, a) => a.indexOf(v) === i) // dedupe

    const used = await db.campLeadEvent.count({
      where: {
        offerId: id,
        eventName: { in: aliases },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    })

    capUsage[key] = { used, cap: event.dailyCap! }
  }

  return NextResponse.json({
    offer: {
      ...(offer as any),
      publisherId: publisher.id,
      publisherPayout: Number((offer as any).publisherPayout),
      events: (offer as any).events || '[]',
      steps: (offer as any).steps || '[]',
      approvalStatus: request?.status || 'AVAILABLE',
      // Live daily cap data: { 'Install': { used: 450, cap: 1000 }, 'Trial': { used: 500, cap: 500 } }
      capUsage,
    },
  })
}
