export async function firePublisherPostback(campLeadEventId: number, db: any) {
  console.log('[PUBLISHER_POSTBACK] Starting postback process for event:', campLeadEventId)
  
  const event = await db.campLeadEvent.findUnique({
    where: { id: campLeadEventId },
    include: { publisher: true, lead: true },
  })
  
  if (!event) {
    console.log('[PUBLISHER_POSTBACK] Event not found:', campLeadEventId)
    return
  }
  
  console.log('[PUBLISHER_POSTBACK] Event found:', {
    eventId: event.id,
    clickId: event.clickId,
    eventName: event.eventName,
    payout: event.payout,
    publisherId: event.publisherId,
    publisherName: event.publisher?.name || 'Unknown'
  })

  const postbackConfig = await db.publisherPostback.findUnique({
    where: { publisherId: event.publisherId },
  })
  
  if (!postbackConfig) {
    console.log('[PUBLISHER_POSTBACK] No postback config found for publisher:', event.publisherId)
    return
  }
  
  console.log('[PUBLISHER_POSTBACK] Postback config found:', {
    publisherId: postbackConfig.publisherId,
    isActive: postbackConfig.isActive,
    postbackUrl: postbackConfig.postbackUrl ? 'CONFIGURED' : 'MISSING',
    hasGlobalPostback: !!postbackConfig.postbackUrl
  })
  
  if (!postbackConfig.isActive || !postbackConfig.postbackUrl) {
    console.log('[PUBLISHER_POSTBACK] Postback skipped - inactive or missing URL')
    return
  }

  let resolvedUrl = postbackConfig.postbackUrl
  console.log('[PUBLISHER_POSTBACK] Original postback URL:', postbackConfig.postbackUrl)

  let publisherEventName = event.eventName ?? ''
  try {
    const offer = await db.offer.findUnique({
      where: { id: event.offerId },
      select: { events: true },
    })
    if (offer?.events) {
      const mapped = resolveDisplayNameFromOfferEvents(offer.events, event.eventName)
      if (mapped) publisherEventName = mapped
    }
  } catch (err) {
    console.error('[PUBLISHER_POSTBACK] Failed to resolve display event name:', err)
  }

  // Track all replacements
  const replacements: Record<string, string> = {}
  
  replacements['{click_id}'] = event.clickId ?? ''
  resolvedUrl = resolvedUrl.replace(/{click_id}/g, event.clickId ?? '')
  
  replacements['{clickid}'] = event.clickId ?? ''
  resolvedUrl = resolvedUrl.replace(/{clickid}/g, event.clickId ?? '')
  
  replacements['{p1}'] = event.p1 ?? ''
  resolvedUrl = resolvedUrl.replace(/{p1}/g, event.p1 ?? '')
  replacements['{sub1}'] = event.sub1 ?? ''
  resolvedUrl = resolvedUrl.replace(/{sub1}/g, event.sub1 ?? '')
  
  replacements['{p2}'] = event.p2 ?? ''
  resolvedUrl = resolvedUrl.replace(/{p2}/g, event.p2 ?? '')
  replacements['{sub2}'] = event.sub2 ?? ''
  resolvedUrl = resolvedUrl.replace(/{sub2}/g, event.sub2 ?? '')
  
  replacements['{p3}'] = event.p3 ?? ''
  resolvedUrl = resolvedUrl.replace(/{p3}/g, event.p3 ?? '')
  replacements['{sub3}'] = event.sub3 ?? ''
  resolvedUrl = resolvedUrl.replace(/{sub3}/g, event.sub3 ?? '')
  
  replacements['{p4}'] = event.p4 ?? ''
  resolvedUrl = resolvedUrl.replace(/{p4}/g, event.p4 ?? '')
  replacements['{sub4}'] = event.sub4 ?? ''
  resolvedUrl = resolvedUrl.replace(/{sub4}/g, event.sub4 ?? '')
  
  replacements['{p5}'] = event.p5 ?? ''
  resolvedUrl = resolvedUrl.replace(/{p5}/g, event.p5 ?? '')
  replacements['{sub5}'] = event.sub5 ?? ''
  resolvedUrl = resolvedUrl.replace(/{sub5}/g, event.sub5 ?? '')
  
  replacements['{event_name}'] = publisherEventName
  resolvedUrl = resolvedUrl.replace(/{event_name}/g, publisherEventName)
  
  replacements['{payout}'] = String(event.payout ?? 0)
  resolvedUrl = resolvedUrl.replace(/{payout}/g, String(event.payout ?? 0))
  
  replacements['{offer_id}'] = String(event.offerId ?? '')
  resolvedUrl = resolvedUrl.replace(/{offer_id}/g, String(event.offerId ?? ''))
  
  replacements['{offerid}'] = String(event.offerId ?? '')
  resolvedUrl = resolvedUrl.replace(/{offerid}/g, String(event.offerId ?? ''))
  
  replacements['{ip}'] = event.ipAddress ?? ''
  resolvedUrl = resolvedUrl.replace(/{ip}/g, event.ipAddress ?? '')
  
  replacements['{conversion_id}'] = String(event.id)
  resolvedUrl = resolvedUrl.replace(/{conversion_id}/g, String(event.id))
  
  replacements['{device}'] = event.device ?? ''
  resolvedUrl = resolvedUrl.replace(/{device}/g, event.device ?? '')

  replacements['{browser}'] = event.browser ?? ''
  resolvedUrl = resolvedUrl.replace(/{browser}/g, event.browser ?? '')

  replacements['{idfa}'] = event.idfa ?? ''
  resolvedUrl = resolvedUrl.replace(/{idfa}/g, event.idfa ?? '')

  replacements['{gaid}'] = event.googleAid ?? ''
  resolvedUrl = resolvedUrl.replace(/{gaid}/g, event.googleAid ?? '')

  replacements['{google_aid}'] = event.googleAid ?? ''
  resolvedUrl = resolvedUrl.replace(/{google_aid}/g, event.googleAid ?? '')
  
  replacements['{publisher_id}'] = String(event.publisherId)
  resolvedUrl = resolvedUrl.replace(/{publisher_id}/g, String(event.publisherId))

  const nowTs = Math.floor(Date.now() / 1000).toString()
  const tdate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(event.approvedAt || event.convertedAt || new Date())

  const clickTimeStr = event.lead?.clickedAt 
    ? Math.floor(new Date(event.lead.clickedAt).getTime() / 1000).toString()
    : nowTs

  const clickTDate = event.lead?.clickedAt
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(event.lead.clickedAt))
    : tdate

  replacements['{click_time}'] = clickTimeStr
  resolvedUrl = resolvedUrl.replace(/{click_time}/g, clickTimeStr)

  replacements['{click_tdate}'] = clickTDate
  resolvedUrl = resolvedUrl.replace(/{click_tdate}/g, clickTDate)

  replacements['{track_time}'] = nowTs
  resolvedUrl = resolvedUrl.replace(/{track_time}/g, nowTs)

  replacements['{conversion_time}'] = nowTs
  resolvedUrl = resolvedUrl.replace(/{conversion_time}/g, nowTs)
  
  replacements['{timestamp}'] = nowTs
  resolvedUrl = resolvedUrl.replace(/{timestamp}/g, nowTs)
  
  replacements['{tdate}'] = tdate
  resolvedUrl = resolvedUrl.replace(/{tdate}/g, tdate)
  
  console.log('[PUBLISHER_POSTBACK] URL parameter replacements:', replacements)
  console.log('[PUBLISHER_POSTBACK] Resolved postback URL:', resolvedUrl)

  if (isInternalPostbackTarget(resolvedUrl)) {
    console.error('[PUBLISHER_POSTBACK] Skipping self-target postback URL:', resolvedUrl)
    await db.campLeadEvent.update({
      where: { id: campLeadEventId },
      data: {
        postbackSent: false,
        postbackResponse: 'SKIPPED: INTERNAL_POSTBACK_TARGET',
      },
    })
    return
  }

  console.log('[PUBLISHER_POSTBACK] Sending postback request to publisher')
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    console.log('[PUBLISHER_POSTBACK] Request timeout set to 10 seconds')

    const response = await fetch(resolvedUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'NCCamp-Postback/1.0' },
    })
    clearTimeout(timeout)
    
    console.log('[PUBLISHER_POSTBACK] Postback response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })
    
    const responseText = await response.text()
    console.log('[PUBLISHER_POSTBACK] Response body:', responseText)

    await db.campLeadEvent.update({
      where: { id: campLeadEventId },
      data: {
        postbackSent: true,
        postbackSentAt: new Date(),
        postbackResponse: `${response.status} - ${response.statusText}`,
      },
    })
    
    console.log('[PUBLISHER_POSTBACK] Database updated - postback marked as sent')
  } catch (error) {
    const errMsg = 'FAILED: ' + (error instanceof Error ? error.message : String(error))
    console.error('[PUBLISHER_POSTBACK] Postback failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      eventId: campLeadEventId,
      publisherId: event.publisherId
    })
    
    await db.campLeadEvent.update({
      where: { id: campLeadEventId },
      data: {
        postbackSent: false,
        postbackResponse: errMsg,
      },
    })
    
    console.log('[PUBLISHER_POSTBACK] Database updated - postback marked as failed')
  }
}

function resolveDisplayNameFromOfferEvents(raw: string, incomingEventName: string | null | undefined): string | null {
  if (!raw || !incomingEventName) return null

  const normalizedIncoming = String(incomingEventName).toLowerCase().trim()
  if (!normalizedIncoming) return null

  try {
    const parsed = JSON.parse(raw) as any
    const events = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : []
    if (!Array.isArray(events)) return null

    for (const item of events) {
      if (!item || !item.name) continue

      const identifiers = Array.isArray(item.identifiers) && item.identifiers.length
        ? item.identifiers
        : [item.name]
      const aliases = [
        ...identifiers,
        item.name,
        item.displayName,
      ]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase().trim())

      if (aliases.includes(normalizedIncoming)) {
        return String(item.displayName || item.name)
      }
    }
  } catch {
    return null
  }

  return null
}

function isInternalPostbackTarget(urlString: string): boolean {
  try {
    const target = new URL(urlString)
    const isPostbackPath =
      target.pathname === '/api/postback' ||
      target.pathname.startsWith('/api/postback/')
    if (!isPostbackPath) return false

    const candidateHosts = new Set<string>()
    if (target.host === 'localhost:8080' || target.host === '127.0.0.1:8080') return true

    const base = process.env.NEXT_PUBLIC_BASE_URL
    if (base) {
      try {
        candidateHosts.add(new URL(base).host)
      } catch {}
    }

    const railwayPublic = process.env.RAILWAY_PUBLIC_DOMAIN
    if (railwayPublic) {
      candidateHosts.add(railwayPublic)
    }

    const railwayStatic = process.env.RAILWAY_STATIC_URL
    if (railwayStatic) {
      try {
        candidateHosts.add(new URL(railwayStatic).host)
      } catch {}
    }

    return candidateHosts.has(target.host)
  } catch {
    return false
  }
}

export const firePostback = firePublisherPostback
