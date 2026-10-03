import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { detectDevice, getIp } from '@/app/api/_utils/common'
import { parseOfferEvents } from '@/lib/offer-events'
import { isDailyQuotaCompleted } from '@/lib/quota'

const MOBILE_REGEX = /^[6-9]\d{9}$/
const UPI_REGEX = /^[\w.\-]+@[\w]+$/

export async function POST(req: Request, { params }: { params: { campSlug: string } }) {
  const body = (await req.json()) as { upiId?: string; mobileNumber?: string; referrerUpi?: string }
  
  const camp = await db.camp.findUnique({
    where: { campSlug: params.campSlug },
    include: { offer: true }
  })
  if (!camp || camp.status === 'PAUSED') {
    return NextResponse.json({ error: 'CAMP_NOT_FOUND' }, { status: 404 })
  }

  if (camp.offer) {
    const quotaCompleted = await isDailyQuotaCompleted(camp.offerId, camp.offer.events)
    if (quotaCompleted) {
      return NextResponse.json({ error: 'QUOTA_COMPLETED', message: 'today quota completed' }, { status: 403 })
    }
  }

  const upiId = body.upiId?.trim() || ''
  if (!upiId || !UPI_REGEX.test(upiId)) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'upiId', message: 'Invalid UPI ID format' }, { status: 422 })
  }

  const mobileNumber = body.mobileNumber?.trim() || null
  if (camp.showMobileField && (!mobileNumber || !MOBILE_REGEX.test(mobileNumber))) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'mobileNumber', message: 'Enter a valid mobile number' }, { status: 422 })
  }
  

  // Use offer preloaded in camp relation to build the affiliate redirect URL
  const offer = camp.offer

  const clickId = crypto.randomUUID()
  const userAgent = req.headers.get('user-agent')
  const ipAddress = getIp(req.headers)
  const device = detectDevice(userAgent)

  await db.$transaction(async (tx) => {
    await tx.campLead.create({
      data: {
        campId: camp.id,
        publisherId: camp.publisherId,
        offerId: camp.offerId,
        clickId,
        userUpi: upiId,
        mobileNumber,
        referrerUpi: body.referrerUpi?.trim() || null,
        ipAddress,
        userAgent,
        device,
        status: 'CLICKED',
        clickedAt: new Date(),
      },
    })
    
    await tx.camp.update({ where: { id: camp.id }, data: { totalClicks: { increment: 1 } } })
    
  })

  // Build the affiliate redirect URL using the configured user ID param name
  let affiliateRedirectUrl: string | null = null
  if (offer?.affiliateUrl) {
    const { config } = parseOfferEvents(offer.events)
    const userIdParam = config.affiliateUserIdParam || 'p1'
    const separator = offer.affiliateUrl.includes('?') ? '&' : '?'
    affiliateRedirectUrl = `${offer.affiliateUrl}${separator}${userIdParam}=${clickId}`
  } else {
    affiliateRedirectUrl = null
  }

  const redirectToken = jwt.sign(
    { campId: camp.id, offerId: camp.offerId, clickId },
    process.env.CAMP_JWT_SECRET || 'camp-secret',
    { expiresIn: '5m' }
  )

  const responseData = { success: true, clickId, redirectToken, affiliateRedirectUrl }
  
  return NextResponse.json(responseData)
}
