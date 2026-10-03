import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { jsonError } from '@/app/api/_utils/common'

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return jsonError('UNAUTHORIZED', 401)

    const url = new URL(req.url)
    const offerIdStr = url.searchParams.get('offerId')
    const offerId = offerIdStr ? Number(offerIdStr) : null

    // Get all active limited access offers for the dropdown
    const limitedOffers = await db.offer.findMany({
      where: { isLimited: true, status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    })

    let grantedPublishers: any[] = []
    if (offerId && Number.isInteger(offerId)) {
      // Find all publishers who have APPROVED access to this offer
      const relations = await db.publisherOffer.findMany({
        where: { offerId, status: 'APPROVED' },
        include: {
          publisher: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      grantedPublishers = relations.map((r: any) => r.publisher).filter(Boolean)
    }

    return NextResponse.json({
      success: true,
      offers: limitedOffers,
      publishers: grantedPublishers
    })
  } catch (error: any) {
    console.error('[ADMIN_OFFER_ACCESS_GET] Error:', error)
    return jsonError('SERVER_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return jsonError('UNAUTHORIZED', 401)

    const body = await req.json()
    const offerId = Number(body.offerId)
    const email = String(body.email || '').trim().toLowerCase()

    if (!offerId || !Number.isInteger(offerId)) {
      return jsonError('VALIDATION_ERROR', 422, { message: 'Valid Offer ID is required' })
    }
    if (!email) {
      return jsonError('VALIDATION_ERROR', 422, { message: 'Publisher email is required' })
    }

    // Check if offer exists and is limited
    const offer = await db.offer.findUnique({ where: { id: offerId } })
    if (!offer) {
      return jsonError('NOT_FOUND', 404, { message: 'Offer not found' })
    }
    if (!offer.isLimited) {
      return jsonError('VALIDATION_ERROR', 400, { message: 'This offer is not configured for Limited Access' })
    }

    // Find publisher by email
    const publisher = await db.publisher.findFirst({ where: { email } })
    if (!publisher) {
      return jsonError('NOT_FOUND', 404, { message: 'Publisher with this email not found' })
    }

    // Create or update status to APPROVED to grant access
    await db.publisherOffer.upsert({
      where: { publisherId_offerId: { publisherId: publisher.id, offerId } },
      create: {
        publisherId: publisher.id,
        offerId,
        status: 'APPROVED',
        approvedAt: new Date(),
        createdAt: new Date()
      },
      update: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      publisher: {
        id: publisher.id,
        name: publisher.name,
        email: publisher.email
      }
    })
  } catch (error: any) {
    console.error('[ADMIN_OFFER_ACCESS_POST] Error:', error)
    return jsonError('SERVER_ERROR', 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return jsonError('UNAUTHORIZED', 401)

    const url = new URL(req.url)
    const offerId = Number(url.searchParams.get('offerId'))
    const publisherId = Number(url.searchParams.get('publisherId'))

    if (!offerId || !Number.isInteger(offerId) || !publisherId || !Number.isInteger(publisherId)) {
      return jsonError('VALIDATION_ERROR', 422, { message: 'Offer ID and Publisher ID are required' })
    }

    // Remove the access record entirely
    await db.publisherOffer.delete({
      where: {
        publisherId,
        offerId
      }
    })

    return NextResponse.json({ success: true, message: 'Access removed successfully' })
  } catch (error: any) {
    console.error('[ADMIN_OFFER_ACCESS_DELETE] Error:', error)
    return jsonError('SERVER_ERROR', 500)
  }
}
