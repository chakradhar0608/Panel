import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED' }, { status: 403 })
  }

  const offerId = Number(params.id)
  if (!Number.isInteger(offerId)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })

  const offer = await db.offer.findUnique({ where: { id: offerId } })
  if (!offer || offer.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })
  }

  const request = await db.publisherOffer.upsert({
    where: { publisherId_offerId: { publisherId: publisher.id, offerId } },
    update: { status: 'PENDING', requestedAt: new Date(), approvedAt: null },
    create: { publisherId: publisher.id, offerId, status: 'PENDING', requestedAt: new Date() },
  })

  return NextResponse.json({ success: true, request })
}
