import { NextResponse } from 'next/server'
import { db, firePublisherPostback } from '@nccamp/db'
import { parseOfferEvents, matchEvent } from '@/lib/offer-events'
import { notifyPublisherConversion } from '@/lib/telegram-bot'

const BASE_CLICK_ID_PARAMS = [
  'clickid', 'click_id', 'clickId',
  'aff_sub', 'aff_sub1',
  'p1', 'sub1', 's1', 'tid', 'transaction_id', 'sid', 'uid',
]

const EVENT_PARAMS = [
  'event', 'event_name', 'goal', 'status', 'type', 'action', 'evt',
]

const PAYOUT_PARAMS = [
  'payout', 'revenue', 'price', 'amount', 'sum', 'earning', 'commission',
]

const COMBINED_SUB_PARAMS = [
  'aff_sub2', 'sub2', 'aff_sub3', 's2',
]

function extractFirst(url: URL, body: Record<string, string>, names: string[]): string {
  for (const name of names) {
    const val = url.searchParams.get(name) || body[name]
    if (val && val.trim()) return val.trim()
  }
  return ''
}

async function getConfiguredClickIdParams(): Promise<string[]> {
  const configured = new Set<string>()
  const offers = await db.offer.findMany({ select: { events: true } })
  for (const offer of offers) {
    const { config } = parseOfferEvents(offer.events)
    const postbackParam = (config.postbackUserIdParam || '').trim()
    const affiliateParam = (config.affiliateUserIdParam || '').trim()
    if (postbackParam) configured.add(postbackParam)
    if (affiliateParam) configured.add(affiliateParam)
  }
  return Array.from(configured)
}

function parseCombinedSub(combined: string): { publisherId: number; subUserId: string } | null {
  if (!combined || !combined.startsWith('pub')) return null
  const withoutPrefix = combined.slice(3)
  const dashIdx = withoutPrefix.indexOf('-')
  if (dashIdx === -1) {
    const publisherId = parseInt(withoutPrefix, 10)
    if (isNaN(publisherId) || publisherId <= 0) return null
    return { publisherId, subUserId: '' }
  }
  const publisherId = parseInt(withoutPrefix.slice(0, dashIdx), 10)
  const subUserId = withoutPrefix.slice(dashIdx + 1)
  if (isNaN(publisherId) || publisherId <= 0) return null
  return { publisherId, subUserId }
}

async function sendTelegramNotification(data: {
  clickId: string
  publisherName: string
  publisherId: number
  offerName: string
  eventName: string
  payout: number
  subUserId: string
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !chatId || token === 'your-bot-token') return

  const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const lines = [
    'New Conversion',
    '',
    `Offer: ${data.offerName}`,
    `Event: ${data.eventName}`,
    `Payout: Rs.${data.payout}`,
    `Publisher: ${data.publisherName} (ID: ${data.publisherId})`,
    data.subUserId ? `Sub-User: ${data.subUserId}` : '',
    `Click: ${data.clickId}`,
    timeStr,
  ].filter(Boolean)

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
  }).catch((err) => console.error('Telegram failed:', err.message))
}

async function logIncomingPostback(db: any, data: {
  rawUrl: string
  rawParams: Record<string, string>
  clickId: string
  eventName: string
  offerId: number | null
  offerName: string
  publisherId: number | null
  publisherName: string
  payout: number
  ipAddress: string
  status: string
  campLeadEventId: number | null
}) {
  try {
    await db.incomingPostback.create({
      data: {
        receivedAt: new Date(),
        rawUrl: data.rawUrl,
        rawParams: JSON.stringify(data.rawParams),
        clickId: data.clickId || null,
        eventName: data.eventName || null,
        offerId: data.offerId || null,
        offerName: data.offerName || null,
        publisherId: data.publisherId || null,
        publisherName: data.publisherName || null,
        payout: data.payout || 0,
        ipAddress: data.ipAddress || null,
        status: data.status,
        campLeadEventId: data.campLeadEventId || null,
      },
    })
  } catch (e) {
    console.error('[INCOMING_POSTBACK_LOG] Failed to log:', e)
  }
}

export async function handleGlobalPostback(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as Record<string, string>

  const allParams: Record<string, string> = {}
  for (const [k, v] of url.searchParams.entries()) allParams[k] = v

  let configuredClickParams: string[] = []
  try {
    configuredClickParams = await getConfiguredClickIdParams()
  } catch (error) {
    console.error('Failed to load configured click-id params:', error)
  }
  const clickParamNames = Array.from(new Set([...configuredClickParams, ...BASE_CLICK_ID_PARAMS]))

  let clickId = extractFirst(url, body, clickParamNames)
  const eventName = extractFirst(url, body, EVENT_PARAMS)
  const payoutStr = extractFirst(url, body, PAYOUT_PARAMS)
  const sourceIp = extractFirst(url, body, ['ip', 'user_ip', 'ip_address'])
  const timestampStr = extractFirst(url, body, ['tdate', 'ts', 'time', 'timestamp'])
  const combinedSubRaw = extractFirst(url, body, COMBINED_SUB_PARAMS)

  let lead: any = null
  if (clickId) {
    lead = await db.campLead.findFirst({
      where: { clickId },
      include: { publisher: true },
    })
  }

  if (!lead && !clickId) {
    const candidateValues = Array.from(
      new Set(
        Object.values(allParams)
          .concat(Object.values(body))
          .map((v) => String(v || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 30)
    if (candidateValues.length) {
      lead = await db.campLead.findFirst({
        where: { clickId: { in: candidateValues } },
        include: { publisher: true },
        orderBy: { clickedAt: 'desc' },
      })
      if (lead?.clickId) clickId = lead.clickId
    }
  }

  if (!lead && combinedSubRaw) {
    lead = await db.campLead.findFirst({
      where: { sub1: combinedSubRaw },
      include: { publisher: true },
      orderBy: { clickedAt: 'desc' },
    })
  }

  if (!lead) {
    void logIncomingPostback(db, {
      rawUrl: url.toString(),
      rawParams: allParams,
      clickId,
      eventName,
      offerId: null,
      offerName: '',
      publisherId: null,
      publisherName: '',
      payout: 0,
      ipAddress: sourceIp,
      status: 'CLICK_NOT_FOUND',
      campLeadEventId: null,
    })
    return NextResponse.json({
      error: 'CLICK_NOT_FOUND',
      message: 'No click found. Make sure your postback URL includes the click ID macro.',
      clickId,
      combinedSub: combinedSubRaw,
      tried_click_params: clickParamNames,
      received_params: Object.keys(allParams),
      help: 'Postback URL should include your internal click ID macro, for example: ?sub_aff_id={sub_aff_id}&event_name={event_name}',
    }, { status: 404 })
  }

  const offer = await db.offer.findUnique({ where: { id: lead.offerId } })
  if (!offer) return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })

  const { config, events } = parseOfferEvents(offer.events)
  if (config.postbackSecret) {
    const incomingSecret = extractFirst(url, body, ['secret'])
    if (!incomingSecret || incomingSecret !== config.postbackSecret) {
      return NextResponse.json({ error: 'INVALID_SECRET' }, { status: 401 })
    }
  }

  const finalEventName = eventName || extractFirst(url, body, [config.postbackEventParam, ...EVENT_PARAMS].filter(Boolean) as string[])
  const finalPayoutStr = payoutStr || extractFirst(url, body, [config.postbackPayoutParam, ...PAYOUT_PARAMS].filter(Boolean) as string[])
  const finalIp = sourceIp || extractFirst(url, body, [config.postbackIpParam, 'ip', 'user_ip'].filter(Boolean) as string[])
  const finalGaid = extractFirst(url, body, [config.postbackGaidParam, 'gaid', 'google_aid', 'google_ad_id'].filter(Boolean) as string[])

  const matchedEvent = matchEvent(events, finalEventName)

  // Lead cut — randomly drop the configured percentage of postbacks.
  // The affiliate network gets a 200 OK so they don't retry; the publisher is not credited.
  // Uses per-event leadCutPercentage (set in offer creation per event).
  let shouldCut = false
  let leadCutPercentageUsed = 0

  if (matchedEvent && matchedEvent.leadCutPercentage && matchedEvent.leadCutPercentage > 0) {
    leadCutPercentageUsed = matchedEvent.leadCutPercentage
    shouldCut = Math.random() * 100 < leadCutPercentageUsed
  }

  if (shouldCut) {
    console.log(`[POSTBACK] Lead cut applied for offer ${offer.id} (${leadCutPercentageUsed}% on event: ${matchedEvent?.name})`)
    void db.leadCut.create({
      data: {
        offerId: lead.offerId,
        publisherId: lead.publisherId,
        clickId: lead.clickId,
        eventName: matchedEvent?.displayName || finalEventName || null,
        payout: finalPayoutStr && !isNaN(parseFloat(finalPayoutStr)) ? parseFloat(finalPayoutStr) : (matchedEvent?.payout ?? 0),
        cutAt: new Date(),
      },
    })
    void logIncomingPostback(db, {
      rawUrl: url.toString(),
      rawParams: allParams,
      clickId: lead.clickId,
      eventName: matchedEvent?.displayName || finalEventName || '',
      offerId: offer.id,
      offerName: offer.name,
      publisherId: lead.publisherId,
      publisherName: lead.publisher?.name || '',
      payout: finalPayoutStr && !isNaN(parseFloat(finalPayoutStr)) ? parseFloat(finalPayoutStr) : (matchedEvent?.payout ?? 0),
      ipAddress: finalIp,
      status: 'LEAD_CUT',
      campLeadEventId: null,
    })
    return NextResponse.json({ success: true, message: 'Conversion acknowledged' })
  }

  // Try to extract affiliate's own unique conversion ID using the per-offer configured param.
  // This is set per-offer in the offer config (postbackConversionIdParam), so it works for
  // every affiliate platform — each offer knows its own platform's param name.
  const affiliateConversionId = config.postbackConversionIdParam
    ? extractFirst(url, body, [config.postbackConversionIdParam])
    : ''

  let resolvedPayout = matchedEvent?.payout ?? 0
  if (!matchedEvent && finalPayoutStr && !isNaN(parseFloat(finalPayoutStr))) {
    resolvedPayout = parseFloat(finalPayoutStr)
  }

  const resolvedEventName = matchedEvent?.displayName || finalEventName || events[0]?.displayName || 'Conversion'

  // Resolve conversion time — use affiliate's timestamp if provided, else server time now
  const now = new Date()
  let conversionTime = now
  if (timestampStr && !isNaN(parseInt(timestampStr))) {
    conversionTime = new Date(parseInt(timestampStr, 10) * 1000)
  }

  // ── Deduplication ──
  // Two-tier strategy that works for every affiliate platform:
  //
  // Tier 1 — Affiliate's own conversion ID (most precise, zero false positives):
  //   If the offer is configured with postbackConversionIdParam and the affiliate
  //   sent that param, we check if we already recorded an event with that exact ID.
  //   This works even if the same event type fires multiple times legitimately
  //   (e.g. two separate installs from the same click link on different devices).
  //
  // Tier 2 — clickId + eventName + 10-minute createdAt window (universal fallback):
  //   We use OUR server-side createdAt (not the affiliate's convertedAt) because:
  //   - createdAt is always set by us, regardless of which affiliate sent the postback
  //   - If the affiliate didn't send a date, convertedAt = now, making it unreliable
  //     as a comparison field against older stored records
  //   - A 10-minute window catches network retries / double-fires without blocking
  //     a legitimate second event of the same type sent hours later
  let existingEvent = null

  if (affiliateConversionId) {
    existingEvent = await db.campLeadEvent.findFirst({
      where: {
        clickId: lead.clickId,
        eventName: resolvedEventName,
        affiliateConversionId,
      },
    })
  }

  if (!existingEvent) {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
    existingEvent = await db.campLeadEvent.findFirst({
      where: {
        clickId: lead.clickId,
        eventName: resolvedEventName,
        createdAt: { gte: tenMinutesAgo },
      },
    })
  }

  if (existingEvent) {
    void logIncomingPostback(db, {
      rawUrl: url.toString(),
      rawParams: allParams,
      clickId: lead.clickId,
      eventName: resolvedEventName,
      offerId: offer.id,
      offerName: offer.name,
      publisherId: lead.publisherId,
      publisherName: lead.publisher?.name || '',
      payout: resolvedPayout,
      ipAddress: finalIp,
      status: 'DUPLICATE',
      campLeadEventId: existingEvent.id,
    })
    return NextResponse.json({ success: true, message: 'Event already processed', event: resolvedEventName })
  }

  const storedSub = lead.sub1 || combinedSubRaw || ''
  const parsedSub = parseCombinedSub(storedSub)
  const subUserId = parsedSub?.subUserId || ''

  const processedEvent = await db.$transaction(async (tx: any) => {
    const createdEvent = await tx.campLeadEvent.create({
      data: {
        campLeadId: lead.id,
        campId: lead.campId,
        publisherId: lead.publisherId,
        offerId: lead.offerId,
        clickId: lead.clickId,
        eventName: resolvedEventName,
        payout: resolvedPayout,
        status: 'APPROVED',
        p1: lead.p1,
        p2: subUserId || lead.p2 || null,
        p3: lead.p3,
        p4: lead.p4,
        p5: lead.p5,
        sub1: lead.sub1,
        sub2: lead.sub2,
        sub3: lead.sub3,
        sub4: lead.sub4,
        sub5: lead.sub5,
        idfa: lead.idfa,
        googleAid: finalGaid || lead.googleAid || null,
        browser: lead.browser,
        ipAddress: finalIp || lead.ipAddress || null,
        device: lead.device,
        postbackSent: false,
        convertedAt: conversionTime,
        approvedAt: now,
        createdAt: now,
        // Store affiliate's conversion ID if available — used for Tier 1 dedup on retries
        ...(affiliateConversionId ? { affiliateConversionId } : {}),
      },
    })

    await tx.campLead.update({
      where: { id: lead.id },
      data: {
        status: 'APPROVED',
        isAutoApproved: true,
        eventName: resolvedEventName,
        payout: resolvedPayout,
        convertedAt: conversionTime,
        approvedAt: now,
        ipAddress: finalIp || lead.ipAddress || undefined,
        p2: subUserId || lead.p2 || undefined,
        googleAid: finalGaid || undefined,
      },
    })

    await tx.publisher.update({
      where: { id: lead.publisherId },
      data: {
        walletBalance: { increment: resolvedPayout },
        totalEarned: { increment: resolvedPayout },
      },
    })

    await tx.walletTransaction.create({
      data: {
        publisherId: lead.publisherId,
        amount: resolvedPayout,
        type: 'CREDIT',
        status: 'COMPLETED',
        details: `Click: ${lead.clickId} | Event: ${resolvedEventName} | Offer: ${offer.name}${subUserId ? ` | Sub-User: ${subUserId}` : ''}`,
        reference: `${lead.clickId}:${resolvedEventName}`,
        createdAt: now,
      },
    })

    if (lead.campId) {
      await tx.camp.update({
        where: { id: lead.campId },
        data: { totalConversions: { increment: 1 } },
      })
    }

    return createdEvent
  })

  void sendTelegramNotification({
    clickId: lead.clickId,
    publisherName: lead.publisher?.name || `Publisher #${lead.publisherId}`,
    publisherId: lead.publisherId,
    offerName: offer.name,
    eventName: resolvedEventName,
    payout: resolvedPayout,
    subUserId,
  })

  void notifyPublisherConversion(lead.publisherId, {
    offerName: offer.name,
    eventName: resolvedEventName,
    payout: resolvedPayout,
    clickId: lead.clickId,
    subId: subUserId || lead.sub2 || undefined,
  })

  // Only fire the publisher's global postback for tracking-URL leads (campId is null).
  // Camp-page leads have their own conversion flow and must NOT trigger the global postback.
  if (!lead.campId) {
    void firePublisherPostback(processedEvent.id, db)
  }

  void logIncomingPostback(db, {
    rawUrl: url.toString(),
    rawParams: allParams,
    clickId: lead.clickId,
    eventName: resolvedEventName,
    offerId: offer.id,
    offerName: offer.name,
    publisherId: lead.publisherId,
    publisherName: lead.publisher?.name || '',
    payout: resolvedPayout,
    ipAddress: finalIp,
    status: 'PROCESSED',
    campLeadEventId: processedEvent.id,
  })

  return NextResponse.json({
    success: true,
    clickId: lead.clickId,
    event: resolvedEventName,
    payout: resolvedPayout,
    publisherId: lead.publisherId,
    offerId: lead.offerId,
    subUserId: subUserId || null,
  })
}