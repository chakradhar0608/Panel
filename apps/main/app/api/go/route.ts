import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { parseOfferEvents } from '@/lib/offer-events'
import { isDailyQuotaCompleted } from '@/lib/quota'

function detectDevice(ua: string | null): string {
  if (!ua) return 'DESKTOP'
  return /Mobile|Android|iPhone|iPad/i.test(ua) ? 'MOBILE' : 'DESKTOP'
}

function detectBrowser(ua: string | null): string {
  if (!ua) return 'UNKNOWN'
  const clean = ua.toLowerCase()
  if (clean.includes('firefox') || clean.includes('fxios')) return 'FIREFOX'
  if (clean.includes('opr/') || clean.includes('opera')) return 'OPERA'
  if (clean.includes('edge') || clean.includes('edg/')) return 'EDGE'
  if (clean.includes('chrome') || clean.includes('crios')) return 'CHROME'
  if (clean.includes('safari')) return 'SAFARI'
  return 'OTHER'
}

function getIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

function offerNotFoundHtml(offerName?: string): string {
  const displayOffer = offerName ? offerName : 'Requested Campaign';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Offer Unavailable</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100svh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f13;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      padding: 1.5rem;
    }
    .card {
      background: #1a1a24;
      border: 1px solid #2d2d40;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .icon-wrap {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef444422, #b91c1c22);
      border: 1.5px solid #ef444444;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 1.5rem;
      font-size: 2rem;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .offer-badge {
      display: inline-block;
      background: #232333;
      border: 1px solid #3d3d55;
      border-radius: 8px;
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      color: #ef4444;
      font-weight: 500;
      margin-bottom: 1.75rem;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .reset-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: #12121a;
      border: 1px solid #2a2a3a;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    .reset-info span { color: #94a3b8; font-weight: 500; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #ef4444;
      flex-shrink: 0;
      box-shadow: 0 0 6px #ef444488;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">🚫</div>
    <h1>Offer Unavailable</h1>
    <p class="subtitle">
      This campaign is currently paused, completed, or unavailable. Please check other active offers.
    </p>
    <div class="offer-badge">${displayOffer.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="reset-info">
      <div class="dot"></div>
      Check other offers on NC Partners
    </div>
  </div>
</body>
</html>`
}

function dailyLimitHtml(offerName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Daily Limit Reached</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100svh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f0f13;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      padding: 1.5rem;
    }
    .card {
      background: #1a1a24;
      border: 1px solid #2d2d40;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.5);
    }
    .icon-wrap {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b22, #ef444422);
      border: 1.5px solid #f59e0b44;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 1.5rem;
      font-size: 2rem;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .offer-badge {
      display: inline-block;
      background: #232333;
      border: 1px solid #3d3d55;
      border-radius: 8px;
      padding: 0.4rem 0.9rem;
      font-size: 0.8rem;
      color: #7c6fe0;
      font-weight: 500;
      margin-bottom: 1.75rem;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .reset-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: #12121a;
      border: 1px solid #2a2a3a;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-size: 0.82rem;
      color: #64748b;
    }
    .reset-info span { color: #94a3b8; font-weight: 500; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #f59e0b;
      flex-shrink: 0;
      box-shadow: 0 0 6px #f59e0b88;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">🚫</div>
    <h1>Daily Limit Reached</h1>
    <p class="subtitle">
      This offer has hit its daily conversion cap and is temporarily unavailable.
      Please try again tomorrow.
    </p>
    <div class="offer-badge">${offerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="reset-info">
      <div class="dot"></div>
      Resets at <span>midnight IST</span>&nbsp;· Check back tomorrow
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const offerId = Number(url.searchParams.get('o'))
  const publisherId = Number(url.searchParams.get('a'))
  
  console.log('[CLICK_TRACKING] Affiliate link clicked:', {
    url: req.url,
    offerId,
    publisherId,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
    ip: getIp(req.headers),
    allParams: Object.fromEntries(url.searchParams.entries())
  })

  if (!offerId || !publisherId || !Number.isInteger(offerId) || !Number.isInteger(publisherId)) {
    console.log('[CLICK_TRACKING] Invalid tracking link parameters:', { offerId, publisherId })
    return new Response('Invalid tracking link - missing o (offerId) or a (publisherId).', { status: 400 })
  }

  console.log('[CLICK_TRACKING] Looking up offer and publisher')
  const [offer, publisher] = await Promise.all([
    db.offer.findUnique({ where: { id: offerId } }),
    db.publisher.findUnique({ where: { id: publisherId } }),
  ])

  if (!offer || offer.status !== 'ACTIVE') {
    console.log('[CLICK_TRACKING] Offer not available:', { offerId, offerStatus: offer?.status })
    return new Response(offerNotFoundHtml(offer?.name), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  if (!publisher) {
    console.log('[CLICK_TRACKING] Invalid publisher:', { publisherId })
    return new Response('Invalid publisher.', { status: 404 })
  }
  if (offer.isLimited) {
    const access = await db.publisherOffer.findFirst({
      where: { publisherId, offerId, status: 'APPROVED' }
    })
    if (!access) {
      console.log('[CLICK_TRACKING] Limited access offer block:', { offerId, publisherId })
      return new Response(offerNotFoundHtml(offer.name), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }
  if (!offer.affiliateUrl) {
    console.log('[CLICK_TRACKING] Offer has no affiliate URL:', { offerId, offerName: offer.name })
    return new Response('Offer has no affiliate URL configured.', { status: 422 })
  }

  // ── Daily Cap Check ──
  // Must happen BEFORE creating the click record so capped traffic is never counted.
  const capReached = await isDailyQuotaCompleted(offerId, offer.events)
  if (capReached) {
    console.log('[CLICK_TRACKING] Daily cap reached for offer:', { offerId, offerName: offer.name })
    return new Response(dailyLimitHtml(offer.name), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  
  console.log('[CLICK_TRACKING] Valid offer and publisher found:', {
    offerId: offer.id,
    offerName: offer.name,
    publisherId: publisher.id,
    publisherName: publisher.name,
    affiliateUrl: offer.affiliateUrl
  })

  const clickId = crypto.randomUUID()
  const userAgent = req.headers.get('user-agent')
  const ipAddress = getIp(req.headers)
  const device = detectDevice(userAgent)
  const browser = detectBrowser(userAgent)

  const p1Val = url.searchParams.get('p1') || null
  const p2Val = url.searchParams.get('p2') || null
  const p3Val = url.searchParams.get('p3') || null
  const p4Val = url.searchParams.get('p4') || null
  const p5Val = url.searchParams.get('p5') || null

  const sub1Val = url.searchParams.get('sub1') || null
  const sub2Val = url.searchParams.get('sub2') || null
  const sub3Val = url.searchParams.get('sub3') || null
  const sub4Val = url.searchParams.get('sub4') || null
  const sub5Val = url.searchParams.get('sub5') || null

  const idfaVal = url.searchParams.get('idfa') || null

  console.log('[CLICK_TRACKING] Generated click data:', {
    clickId,
    ipAddress,
    userAgent: userAgent?.substring(0, 100) + (userAgent?.length > 100 ? '...' : ''),
    device,
    browser,
    p1: p1Val,
    p2: p2Val,
    p3: p3Val,
    p4: p4Val,
    p5: p5Val,
    sub1: sub1Val,
    sub2: sub2Val,
    sub3: sub3Val,
    sub4: sub4Val,
    sub5: sub5Val,
    idfa: idfaVal
  })

  console.log('[CLICK_TRACKING] Creating click record in database')
  await db.$transaction(async (tx: any) => {
    console.log('[CLICK_TRACKING] Upserting publisher-offer relationship')
    await tx.publisherOffer.upsert({
      where: { publisherId_offerId: { publisherId, offerId } },
      create: { publisherId, offerId },
      update: {},
    })

    console.log('[CLICK_TRACKING] Creating campLead record')
    await tx.campLead.create({
      data: {
        campId: null,
        publisherId,
        offerId,
        clickId,
        p1: p1Val,
        p2: p2Val,
        p3: p3Val,
        p4: p4Val,
        p5: p5Val,
        sub1: sub1Val,
        sub2: sub2Val,
        sub3: sub3Val,
        sub4: sub4Val,
        sub5: sub5Val,
        idfa: idfaVal,
        browser,
        userUpi: null,
        mobileNumber: null,
        status: 'CLICKED',
        ipAddress,
        userAgent,
        device,
        clickedAt: new Date(),
      },
    })
    
    console.log('[CLICK_TRACKING] Click record created successfully')
  })

  const { config } = parseOfferEvents(offer.events)
  const userIdParam = config.affiliateUserIdParam || 'p1'
  const separator = offer.affiliateUrl.includes('?') ? '&' : '?'
  const redirectUrl = `${offer.affiliateUrl}${separator}${userIdParam}=${clickId}`
  
  console.log('[CLICK_TRACKING] Redirecting to affiliate URL:', {
    originalUrl: offer.affiliateUrl,
    userIdParam,
    clickId,
    finalRedirectUrl: redirectUrl
  })

  return NextResponse.redirect(redirectUrl, { status: 302 })
}