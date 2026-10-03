import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { parseOfferEvents } from '@/lib/offer-events'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  const camp = await db.camp.findUnique({ where: { id }, include: { offer: true } })
  if (!camp) return NextResponse.json({ error: 'CAMP_NOT_FOUND' }, { status: 404 })
  if (camp.publisherId !== publisher.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = (await req.json()) as Record<string, unknown>
  const selectedEventName = String(body.selectedEventName ?? camp.selectedEventName)
  const userGets = Number(body.userGets ?? camp.userGets)
  const referrerGets = Number(body.referrerGets ?? camp.referrerGets)
  const event = parseOfferEvents(camp.offer.events).events.find((item) => item.name === selectedEventName)
  if (!event) return NextResponse.json({ error: 'VALIDATION_ERROR', fields: [{ field: 'selectedEventName', message: 'Invalid event' }] }, { status: 422 })

  if (userGets + referrerGets > Number(event.payout)) {
    return NextResponse.json({ error: 'SPLIT_EXCEEDED', message: `User + Referrer split cannot exceed ₹${event.payout}` }, { status: 422 })
  }

  const steps = Array.isArray(body.steps) ? body.steps.filter((item) => String(item).trim()) : undefined
  if (steps && steps.length === 0) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', fields: [{ field: 'steps', message: 'At least one step is required' }] }, { status: 422 })
  }

  const updated = await db.camp.update({
    where: { id },
    data: {
      campName: typeof body.campName === 'string' ? body.campName : undefined,
      selectedEventName,
      userGets,
      referrerGets,
      showMobileField: typeof body.showMobileField === 'boolean' ? body.showMobileField : undefined,
      showReferField: typeof body.showReferField === 'boolean' ? body.showReferField : undefined,
      steps: steps ? JSON.stringify(steps) : undefined,
    },
  })

  return NextResponse.json({ camp: updated })
}
