import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { jsonError } from '@/app/api/_utils/common'
import { sendTelegramMessage } from '@/lib/telegram-bot'

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) return jsonError('UNAUTHORIZED', 401)

    const offers = await db.offer.findMany({ where: { status: { not: 'DELETED' } }, orderBy: { id: 'desc' } })
    return NextResponse.json({
      offers: offers.map((offer) => ({ ...offer, publisherPayout: Number(offer.publisherPayout), steps: offer.steps ? JSON.parse(offer.steps) : [], events: offer.events || '[]' })),
    })
  } catch (error) {
    console.error('[ADMIN_OFFERS_GET] Error:', error)
    return jsonError('SERVER_ERROR', 500)
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return jsonError('UNAUTHORIZED', 401)

  const body = (await req.json()) as Record<string, unknown>
  const name = String(body.name || '').trim()
  const slug = String(body.slug || '').trim()
  if (!name || !slug) return jsonError('VALIDATION_ERROR', 422, { message: 'Name and slug are required' })

  const events = typeof body.events === 'string' ? body.events : JSON.stringify(body.events || [])
  const steps = Array.isArray(body.steps) ? JSON.stringify(body.steps) : typeof body.steps === 'string' ? body.steps : null

  const offer = await db.offer.create({
    data: {
      name,
      slug,
      imageUrl: (body.imageUrl as string) || null,
      category: (body.category as string) || null,
      payoutType: (body.payoutType as string) || null,
      publisherPayout: Number(body.payoutAmount ?? body.publisherPayout ?? 0),
      status: String(body.status || 'ACTIVE').toUpperCase() as any,
      badge: (body.badge as string) || null,
      affiliateUrl: (body.affiliateUrl as string) || null,
      telegramLink: (body.telegramLink as string) || null,
      description: (body.description as string) || null,
      sortOrder: Number(body.sortOrder || 0),
      isLimited: body.isLimited === true || body.isLimited === 'true',
      steps,
      events,
    },
  })

  // Broadcast to publishers if offer is active
  const statusStr = String(body.status || 'ACTIVE').toUpperCase()
  if (statusStr === 'ACTIVE') {
    void (async () => {
      try {
        const publishers = await db.publisher.findMany({
          where: {
            status: 'APPROVED',
            telegramChatId: { not: null }
          }
        })

        const message = `🎁 <b>New Offer Available!</b>\n\nOffer: ${name}\nPayout: ₹${offer.publisherPayout}\n\nLogin to your dashboard to request approval.`
        
        // Send to all linked publishers
        for (const pub of publishers) {
          if (pub.telegramChatId) {
            await sendTelegramMessage(pub.telegramChatId, message)
          }
        }
      } catch (err) {
        console.error('[ADMIN_OFFERS_TELEGRAM] Failed to broadcast:', err)
      }
    })()
  }

  return NextResponse.json({ offer: { ...offer, publisherPayout: Number(offer.publisherPayout) } }, { status: 201 })
}
