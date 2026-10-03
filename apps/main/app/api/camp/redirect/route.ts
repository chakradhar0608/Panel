import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { parseOfferEvents } from '@/lib/offer-events'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  
  if (!token) {

    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 })
  }

  try {

    const payload = jwt.verify(token, process.env.CAMP_JWT_SECRET || 'camp-secret') as {
      offerId: number
      clickId: string
    }

    const offer = await db.offer.findUnique({ where: { id: payload.offerId } })
    if (!offer?.affiliateUrl) {
      return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })
    }

    const redirectUrl = new URL(offer.affiliateUrl)
    const { config } = parseOfferEvents(offer.events)
    const userIdParam = config.affiliateUserIdParam || 'p1'
    
    redirectUrl.searchParams.set(userIdParam, payload.clickId)
    
    return NextResponse.redirect(redirectUrl.toString(), { status: 302 })
  } catch (error) {
    if (error instanceof TokenExpiredError) {

      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 410 })
    }
    console.error('[CAMP_REDIRECT] Token verification failed:', error)
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 })
  }
}
