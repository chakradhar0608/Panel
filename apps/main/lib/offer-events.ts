export type OfferEventConfig = {
  // The param name appended to affiliate URL to pass our clickId
  // e.g. if "p1", affiliate URL becomes: https://network.com/click?...&p1=UUID
  affiliateUserIdParam: string

  // Postback incoming param names — what the affiliate network sends back
  postbackUserIdParam: string        // param carrying our clickId back
  postbackPayoutParam: string        // param carrying payout amount
  postbackEventParam: string         // param carrying event name
  postbackOfferIdParam: string       // param carrying their offer id
  postbackIpParam: string            // param carrying user IP
  postbackTimestampParam: string
  // Affiliate platform's own unique conversion ID param name.
  // Set this per-offer to whatever param their postback sends (e.g. "offer_lead_id", "txid").
  // Leave empty if the platform doesn't send one — a 10-minute window fallback applies.
  postbackConversionIdParam: string

  // Optional: secret key validation
  postbackSecret: string

  // GAID (Google Ad ID) incoming param name — what the affiliate network sends back (e.g. "gaid", "google_aid")
  postbackGaidParam: string

  // Lead cut percentage (0-100). Randomly drop this % of incoming postbacks.
  // E.g. 30 = only 70 out of 100 postbacks are processed; the rest are silently acknowledged.
  leadCutPercentage: number

  // Specific event name to cut (based on internal event name), or 'all' to cut any event.
  leadCutEvent: string

  // Logging
  verboseLogging: boolean

  // Timezone + locale for notifications
  timezone: string
  dateLocale: string

  // Currency symbol
  currency: string
}

export type OfferEvent = {
  // Internal key — used as the primary lookup key e.g. "install"
  name: string
  // Multiple aliases the affiliate network might send for this same event
  // e.g. ["install", "Install", "app_install", "INSTALL"]
  identifiers: string[]
  // What to display in the UI
  displayName: string
  // Payout amount in rupees
  payout: number
  // Optional daily cap
  dailyCap?: number | null
  // Per-event lead cut percentage (0-100). Randomly drop this % of postbacks for this event.
  leadCutPercentage?: number
}

type OfferEventsPayload = {
  config?: Partial<OfferEventConfig>
  events?: OfferEvent[]
}

export const defaultOfferEventConfig: OfferEventConfig = {
  affiliateUserIdParam: 'p1',
  postbackUserIdParam: 'clickId',
  postbackPayoutParam: 'payout',
  postbackEventParam: 'event',
  postbackOfferIdParam: 'offer_id',
  postbackIpParam: 'ip',
  postbackTimestampParam: 'tdate',
  postbackConversionIdParam: '',
  postbackSecret: '',
  postbackGaidParam: 'gaid',
  leadCutPercentage: 0,
  leadCutEvent: 'all',
  verboseLogging: false,
  timezone: 'Asia/Kolkata',
  dateLocale: 'en-IN',
  currency: '₹',
}

export function parseOfferEvents(raw: string | null | undefined): {
  config: OfferEventConfig
  events: OfferEvent[]
} {
  if (!raw) {
    return { config: defaultOfferEventConfig, events: [] }
  }

  try {
    const parsed = JSON.parse(raw) as OfferEventsPayload | OfferEvent[]

    if (Array.isArray(parsed)) {
      return {
        config: defaultOfferEventConfig,
        events: parsed.map(normalizeEvent).filter(Boolean) as OfferEvent[],
      }
    }

    return {
      config: { ...defaultOfferEventConfig, ...(parsed.config || {}) },
      events: Array.isArray(parsed.events)
        ? parsed.events.map(normalizeEvent).filter(Boolean) as OfferEvent[]
        : [],
    }
  } catch {
    return { config: defaultOfferEventConfig, events: [] }
  }
}

export function serializeOfferEvents(input: {
  config?: Partial<OfferEventConfig>
  events: OfferEvent[]
}) {
  return JSON.stringify({
    config: { ...defaultOfferEventConfig, ...(input.config || {}) },
    events: input.events.map((event) => ({
      name: event.name.trim(),
      identifiers: Array.isArray(event.identifiers)
        ? event.identifiers.map((id) => id.trim()).filter(Boolean)
        : [event.name.trim()],
      displayName: (event.displayName || event.name).trim(),
      payout: Number(event.payout || 0),
      dailyCap: event.dailyCap ?? null,
      leadCutPercentage: Number(event.leadCutPercentage ?? 0),
    })),
  })
}

// Match an incoming event name against all events using identifiers array
// This mirrors the postback.js logic exactly
export function matchEvent(events: OfferEvent[], incomingEventName: string | null | undefined): OfferEvent | null {
  if (!incomingEventName) return null
  const normalized = incomingEventName.toLowerCase().trim()

  for (const event of events) {
    const identifiers = Array.isArray(event.identifiers)
      ? event.identifiers.map((id) => id.toLowerCase().trim())
      : [event.name.toLowerCase().trim()]

    // Also always check against name and displayName
    const allAliases = [...identifiers, event.name.toLowerCase().trim(), (event.displayName || '').toLowerCase().trim()]

    if (allAliases.includes(normalized)) {
      return event
    }
  }
  return null
}

function normalizeEvent(event: OfferEvent | null | undefined): OfferEvent | null {
  if (!event || !event.name) return null
  return {
    name: String(event.name),
    identifiers: Array.isArray(event.identifiers)
      ? event.identifiers.map(String).filter(Boolean)
      : [String(event.name)],
    displayName: event.displayName ? String(event.displayName) : String(event.name),
    payout: Number(event.payout || 0),
    dailyCap: event.dailyCap ?? null,
    leadCutPercentage: Number((event as any).leadCutPercentage ?? 0),
  }
}