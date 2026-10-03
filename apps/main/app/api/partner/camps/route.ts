import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { generateSlugBase, randomChars } from '@/app/api/_utils/common'
import { parseOfferEvents } from '@/lib/offer-events'

function validateCampBody(body: Record<string, unknown>) {
  const errors: Array<{ field: string; message: string }> = []
  const campName = String(body.campName || '').trim()
  if (!campName) errors.push({ field: 'campName', message: 'Camp name is required' })
  if (campName.length > 30) errors.push({ field: 'campName', message: 'Maximum 30 characters' })
  if (!/^[a-zA-Z0-9-]+$/.test(campName)) errors.push({ field: 'campName', message: 'Only letters, numbers, and hyphens allowed' })

  const selectedEventName = String(body.selectedEventName || '').trim()
  if (!selectedEventName) errors.push({ field: 'selectedEventName', message: 'Event is required' })

  const userGets = Number(body.userGets ?? 0)
  const referrerGets = Number(body.referrerGets ?? 0)
  if (!Number.isInteger(userGets) || userGets < 0) errors.push({ field: 'userGets', message: 'Invalid value' })
  if (!Number.isInteger(referrerGets) || referrerGets < 0) errors.push({ field: 'referrerGets', message: 'Invalid value' })

  const steps = Array.isArray(body.steps) ? body.steps.filter((item) => String(item).trim()) : []
  if (steps.length < 1) errors.push({ field: 'steps', message: 'At least one step is required' })

  return { errors, campName, selectedEventName, userGets, referrerGets, steps }
}

async function generateUniqueSlug(campName: string) {
  const base = generateSlugBase(campName)
  let slug = `${base}-${randomChars(4)}`
  while (await db.camp.findUnique({ where: { campSlug: slug } })) {
    slug = `${base}-${randomChars(4)}`
  }
  return slug
}

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED' }, { status: 403 })
  }

  const camps = await db.camp.findMany({
    where: { publisherId: publisher.id, status: { not: 'DELETED' } },
    include: { offer: { select: { name: true, imageUrl: true, category: true, payoutType: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return NextResponse.json({
    camps: camps.map((camp) => ({
      ...camp,
      offerLink: `${baseUrl}/offer/-${camp.campSlug}`,
    })),
  })
}

export async function POST(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (publisher.status !== 'APPROVED') {
    return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const { errors, campName, selectedEventName, userGets, referrerGets, steps } = validateCampBody(body)

  const offerId = Number(body.offerId)
  if (!Number.isInteger(offerId)) errors.push({ field: 'offerId', message: 'Offer is required' })

  const offer = Number.isInteger(offerId)
    ? await db.offer.findFirst({ where: { id: offerId, status: 'ACTIVE' } })
    : null

  if (!offer) errors.push({ field: 'offerId', message: 'Offer not found or inactive' })
  const offerApproval = Number.isInteger(offerId)
    ? await db.publisherOffer.findFirst({ where: { publisherId: publisher.id, offerId, status: 'APPROVED' } })
    : null
  if (!offerApproval) errors.push({ field: 'offerId', message: 'Offer is not approved for your account yet' })

  const event = parseOfferEvents(offer?.events || null).events.find((item) => item.name === selectedEventName)
  if (!event) errors.push({ field: 'selectedEventName', message: 'Selected event is invalid' })

  if (event && userGets + referrerGets > Number(event.payout)) {
    return NextResponse.json({
      error: 'SPLIT_EXCEEDED',
      message: `User + Referrer split cannot exceed ₹${event.payout}`,
    }, { status: 422 })
  }

  if (errors.length) return NextResponse.json({ error: 'VALIDATION_ERROR', fields: errors }, { status: 422 })

  const campSlug = await generateUniqueSlug(campName)
  const camp = await db.camp.create({
    data: {
      publisherId: publisher.id,
      offerId,
      campName,
      campSlug,
      selectedEventName,
      userGets,
      referrerGets,
      showMobileField: body.showMobileField === undefined ? true : Boolean(body.showMobileField),
      showReferField: body.showReferField === undefined ? true : Boolean(body.showReferField),
      steps: JSON.stringify(steps),
      status: 'ACTIVE',
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return NextResponse.json({
    camp: {
      ...camp,
      offerLink: `${baseUrl}/offer/-${camp.campSlug}`,
    },
  }, { status: 201 })
}
