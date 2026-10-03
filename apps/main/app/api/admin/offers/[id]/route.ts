import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { jsonError } from '@/app/api/_utils/common'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return jsonError('UNAUTHORIZED', 401)

  const id = Number(params.id)
  if (!Number.isInteger(id)) return jsonError('INVALID_ID', 400)

  const body = (await req.json()) as Record<string, unknown>
  const events = typeof body.events === 'string' ? body.events : body.events ? JSON.stringify(body.events) : undefined
  const steps = Array.isArray(body.steps) ? JSON.stringify(body.steps) : typeof body.steps === 'string' ? body.steps : undefined

  const oldOffer = await db.offer.findUnique({ where: { id } })
  const isChangingToLimited = (body.isLimited === true || body.isLimited === 'true') && !oldOffer?.isLimited

  if (isChangingToLimited) {
    // Revoke all existing approvals for this offer so only explicitly added ones have access
    await db.publisherOffer.delete({
      where: { offerId: id }
    })
  }

  const offer = await db.offer.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' ? body.name : undefined,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      payoutType: typeof body.payoutType === 'string' ? body.payoutType : undefined,
      publisherPayout: body.payoutAmount !== undefined || body.publisherPayout !== undefined ? Number(body.payoutAmount ?? body.publisherPayout) : undefined,
      status: typeof body.status === 'string' ? (body.status.toUpperCase() as any) : undefined,
      badge: typeof body.badge === 'string' ? body.badge : undefined,
      affiliateUrl: typeof body.affiliateUrl === 'string' ? body.affiliateUrl : undefined,
      telegramLink: typeof body.telegramLink === 'string' ? body.telegramLink : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      isLimited: body.isLimited !== undefined ? (body.isLimited === true || body.isLimited === 'true') : undefined,
      steps,
      events,
    },
  })

  return NextResponse.json({ offer: { ...offer, publisherPayout: Number(offer.publisherPayout) } })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return jsonError('UNAUTHORIZED', 401)

  const id = Number(params.id)
  if (!Number.isInteger(id)) return jsonError('INVALID_ID', 400)

  // Soft-delete: mark as DELETED instead of removing the row.
  // This preserves all CampLead and CampLeadEvent records linked to this offer
  // so conversion history remains visible in admin and partner dashboards.
  await db.offer.update({ where: { id }, data: { status: 'DELETED' } })
  return NextResponse.json({ success: true })
}
