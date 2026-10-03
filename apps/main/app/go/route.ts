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
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offer Unavailable | NC Partners</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

:root{
  --primary:#6366f1;
  --secondary:#8b5cf6;
  --accent:#e11d48;
  --text:#ffffff;
  --muted:#94a3b8;
}

body{
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:24px;
  overflow:hidden;
  font-family:'Inter',sans-serif;
  background:#030712;
  color:white;
}

/* Background */
.background{
  position:fixed;
  inset:0;
  overflow:hidden;
  z-index:-2;
}

.blob{
  position:absolute;
  border-radius:50%;
  filter:blur(100px);
  opacity:.45;
  animation:float 12s ease-in-out infinite;
}

.blob1{
  width:380px;
  height:380px;
  background:#e11d48;
  top:-120px;
  left:-120px;
}

.blob2{
  width:320px;
  height:320px;
  background:#8b5cf6;
  bottom:-100px;
  right:-100px;
  animation-delay:3s;
}

.blob3{
  width:260px;
  height:260px;
  background:#6366f1;
  top:45%;
  left:60%;
  animation-delay:6s;
}

@keyframes float{
  0%,100%{
    transform:translate(0,0);
  }
  50%{
    transform:translate(30px,-40px);
  }
}

.grid{
  position:absolute;
  inset:0;
  background:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size:40px 40px;
  mask-image:radial-gradient(circle at center, black, transparent 90%);
}

/* Card */
.card{
  width:100%;
  max-width:560px;

  padding:40px;

  border-radius:32px;

  background:rgba(15,23,42,.72);
  backdrop-filter:blur(24px);

  border:1px solid rgba(255,255,255,.08);

  box-shadow:
    0 25px 80px rgba(0,0,0,.45),
    inset 0 1px 0 rgba(255,255,255,.06);

  text-align:center;

  animation:cardAppear .8s cubic-bezier(.22,1,.36,1);
}

@keyframes cardAppear{
  from{
    opacity:0;
    transform:translateY(40px) scale(.96);
  }
  to{
    opacity:1;
    transform:translateY(0) scale(1);
  }
}

/* Brand */
.brand{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  margin-bottom:30px;
}

.brand-logo{
  width:52px;
  height:52px;
  border-radius:16px;

  background:linear-gradient(
    135deg,
    #e11d48,
    #8b5cf6
  );

  display:flex;
  align-items:center;
  justify-content:center;

  color:white;
  font-weight:800;
  font-size:18px;

  box-shadow:0 12px 30px rgba(225,29,72,.35);
}

.brand-text{
  display:flex;
  flex-direction:column;
  text-align:left;
}

.brand-text span{
  font-size:1.1rem;
  font-weight:700;
}

.brand-text small{
  color:#94a3b8;
  font-size:.75rem;
}

/* Logo */
.logo-container{
  display:flex;
  justify-content:center;
  align-items:center;
  margin-bottom:24px;
}

.logo{
  width:110px;
  height:110px;
  object-fit:contain;

  padding:12px;

  border-radius:24px;

  background:rgba(255,255,255,.04);

  border:1px solid rgba(255,255,255,.08);

  box-shadow:
    0 15px 40px rgba(0,0,0,.25),
    0 0 50px rgba(225,29,72,.15);

  animation:logoFloat 4s ease-in-out infinite;
}

@keyframes logoFloat{
  0%,100%{
    transform:translateY(0);
  }
  50%{
    transform:translateY(-8px);
  }
}

/* Badge */
.badge{
  display:inline-flex;
  align-items:center;
  gap:8px;

  padding:8px 14px;
  border-radius:999px;

  background:rgba(225,29,72,.12);
  border:1px solid rgba(225,29,72,.25);

  color:#fca5a5;
  font-size:13px;
  font-weight:600;

  margin-bottom:18px;
}

.badge::before{
  content:'';
  width:8px;
  height:8px;
  border-radius:50%;
  background:#e11d48;
  box-shadow:0 0 10px #e11d48;
}

/* Heading */
h1{
  font-size:2.3rem;
  line-height:1.1;
  font-weight:800;
  letter-spacing:-0.04em;
  margin-bottom:16px;
}

.gradient{
  background:linear-gradient(
    90deg,
    #f87171,
    #c084fc,
    #818cf8
  );

  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

/* Text */
.subtitle{
  color:#94a3b8;
  font-size:1rem;
  line-height:1.8;
  margin-bottom:24px;
}

.offer{
  padding:16px 18px;
  border-radius:16px;

  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);

  color:#e2e8f0;
  font-weight:600;

  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;

  margin-bottom:22px;
}

.footer{
  color:#64748b;
  font-size:.85rem;
}

@media(max-width:640px){
  .card{
    padding:30px 22px;
  }

  h1{
    font-size:1.9rem;
  }

  .logo{
    width:90px;
    height:90px;
  }
}
</style>
</head>

<body>

<div class="background">
  <div class="blob blob1"></div>
  <div class="blob blob2"></div>
  <div class="blob blob3"></div>
  <div class="grid"></div>
</div>

<div class="card">

  <div class="brand">
    <div class="brand-logo">NC</div>
    <div class="brand-text">
      <span>NC Partners</span>
      <small>Affiliate Growth Platform</small>
    </div>
  </div>

  <div class="logo-container">
    <img src="/logo.jpeg" alt="NC Partners Logo" class="logo">
  </div>

  <div class="badge">
    Campaign Unavailable
  </div>

  <h1>
    Offer <span class="gradient">Not Active</span>
  </h1>

  <p class="subtitle">
    This campaign is currently paused, completed, or unavailable on
    <strong>NC Partners</strong>. Explore our platform for more earning
    opportunities and discover other active offers available right now.
  </p>

  <div class="offer">
    ${displayOffer.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </div>

  <div class="footer">
    © 2026 NC Partners • New campaigns and offer slots become available regularly.
  </div>

</div>

</body>
</html>`;
}

function dailyLimitHtml(offerName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offer Limit Reached | NC Partners</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

:root{
  --primary:#6366f1;
  --secondary:#8b5cf6;
  --accent:#06b6d4;
  --text:#ffffff;
  --muted:#94a3b8;
}

body{
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  padding:24px;
  overflow:hidden;
  font-family:'Inter',sans-serif;
  background:#030712;
  color:white;
}

/* Background */
.background{
  position:fixed;
  inset:0;
  overflow:hidden;
  z-index:-2;
}

.blob{
  position:absolute;
  border-radius:50%;
  filter:blur(100px);
  opacity:.45;
  animation:float 12s ease-in-out infinite;
}

.blob1{
  width:380px;
  height:380px;
  background:#6366f1;
  top:-120px;
  left:-120px;
}

.blob2{
  width:320px;
  height:320px;
  background:#8b5cf6;
  bottom:-100px;
  right:-100px;
  animation-delay:3s;
}

.blob3{
  width:260px;
  height:260px;
  background:#06b6d4;
  top:45%;
  left:60%;
  animation-delay:6s;
}

@keyframes float{
  0%,100%{
    transform:translate(0,0);
  }
  50%{
    transform:translate(30px,-40px);
  }
}

.grid{
  position:absolute;
  inset:0;
  background:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size:40px 40px;
  mask-image:radial-gradient(circle at center, black, transparent 90%);
}

/* Card */
.card{
  width:100%;
  max-width:560px;

  padding:40px;

  border-radius:32px;

  background:rgba(15,23,42,.72);
  backdrop-filter:blur(24px);

  border:1px solid rgba(255,255,255,.08);

  box-shadow:
    0 25px 80px rgba(0,0,0,.45),
    inset 0 1px 0 rgba(255,255,255,.06);

  text-align:center;

  animation:cardAppear .8s cubic-bezier(.22,1,.36,1);
}

@keyframes cardAppear{
  from{
    opacity:0;
    transform:translateY(40px) scale(.96);
  }
  to{
    opacity:1;
    transform:translateY(0) scale(1);
  }
}

/* Brand */
.brand{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  margin-bottom:30px;
}

.brand-logo{
  width:52px;
  height:52px;
  border-radius:16px;

  background:linear-gradient(
    135deg,
    #6366f1,
    #8b5cf6
  );

  display:flex;
  align-items:center;
  justify-content:center;

  color:white;
  font-weight:800;
  font-size:18px;

  box-shadow:0 12px 30px rgba(99,102,241,.35);
}

.brand-text{
  display:flex;
  flex-direction:column;
  text-align:left;
}

.brand-text span{
  font-size:1.1rem;
  font-weight:700;
}

.brand-text small{
  color:#94a3b8;
  font-size:.75rem;
}

/* Logo */
.logo-container{
  display:flex;
  justify-content:center;
  align-items:center;
  margin-bottom:24px;
}

.logo{
  width:110px;
  height:110px;
  object-fit:contain;

  padding:12px;

  border-radius:24px;

  background:rgba(255,255,255,.04);

  border:1px solid rgba(255,255,255,.08);

  box-shadow:
    0 15px 40px rgba(0,0,0,.25),
    0 0 50px rgba(99,102,241,.15);

  animation:logoFloat 4s ease-in-out infinite;
}

@keyframes logoFloat{
  0%,100%{
    transform:translateY(0);
  }
  50%{
    transform:translateY(-8px);
  }
}

/* Badge */
.badge{
  display:inline-flex;
  align-items:center;
  gap:8px;

  padding:8px 14px;
  border-radius:999px;

  background:rgba(99,102,241,.12);
  border:1px solid rgba(99,102,241,.25);

  color:#a5b4fc;
  font-size:13px;
  font-weight:600;

  margin-bottom:18px;
}

.badge::before{
  content:'';
  width:8px;
  height:8px;
  border-radius:50%;
  background:#6366f1;
  box-shadow:0 0 10px #6366f1;
}

/* Heading */
h1{
  font-size:2.3rem;
  line-height:1.1;
  font-weight:800;
  letter-spacing:-0.04em;
  margin-bottom:16px;
}

.gradient{
  background:linear-gradient(
    90deg,
    #818cf8,
    #c084fc,
    #22d3ee
  );

  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

/* Text */
.subtitle{
  color:#94a3b8;
  font-size:1rem;
  line-height:1.8;
  margin-bottom:24px;
}

.offer{
  padding:16px 18px;
  border-radius:16px;

  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);

  color:#e2e8f0;
  font-weight:600;

  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;

  margin-bottom:22px;
}

.footer{
  color:#64748b;
  font-size:.85rem;
}

@media(max-width:640px){
  .card{
    padding:30px 22px;
  }

  h1{
    font-size:1.9rem;
  }

  .logo{
    width:90px;
    height:90px;
  }
}
</style>
</head>

<body>

<div class="background">
  <div class="blob blob1"></div>
  <div class="blob blob2"></div>
  <div class="blob blob3"></div>
  <div class="grid"></div>
</div>

<div class="card">

  <div class="brand">
    <div class="brand-logo">NC</div>
    <div class="brand-text">
      <span>NC Partners</span>
      <small>Affiliate Growth Platform</small>
    </div>
  </div>

  <div class="logo-container">
    <img src="/logo.jpeg" alt="NC Partners Logo" class="logo">
  </div>

  <div class="badge">
    Campaign Capacity Reached
  </div>

  <h1>
    Offer Limit <span class="gradient">Reached</span>
  </h1>

  <p class="subtitle">
    This campaign has reached its maximum daily capacity on
    <strong>NC Partners</strong>. Explore our platform for more earning
    opportunities and discover other active offers available right now.
  </p>

  <div class="offer">
    ${offerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </div>

  <div class="footer">
    © 2026 NC Partners • New campaigns and offer slots become available regularly.
  </div>

</div>

</body>
</html>`;
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