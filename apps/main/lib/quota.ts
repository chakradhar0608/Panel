import { db } from '@nccamp/db'
import { parseOfferEvents } from './offer-events'

/**
 * Checks if the daily cap (quota) has been reached for any event on the given offer today.
 * Today is computed in Indian Standard Time (IST, Asia/Kolkata).
 * 
 * @param offerId The database ID of the offer.
 * @param offerEventsRaw The raw events JSON string stored in the offer.
 */
export async function isDailyQuotaCompleted(offerId: number, offerEventsRaw: string | null | undefined): Promise<boolean> {
  const { events } = parseOfferEvents(offerEventsRaw)
  
  // Find start and end of "today" in Indian Standard Time (IST, UTC+05:30) timezone-independently
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const istTime = new Date(now.getTime() + istOffset)
  
  const yyyy = istTime.getUTCFullYear()
  const mm = istTime.getUTCMonth()
  const dd = istTime.getUTCDate()
  
  const startOfDay = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0) - istOffset)
  const endOfDay = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999) - istOffset)
// After
for (const event of events) {
  if (event.dailyCap && event.dailyCap > 0) {
    const [conversionCount, cutCount] = await Promise.all([
      db.campLeadEvent.count({
        where: {
          offerId,
          eventName: { in: [event.displayName, event.name] },
          createdAt: { gte: startOfDay, lte: endOfDay },
        }
      }),
      db.leadCut.count({
        where: {
          offerId,
          eventName: { in: [event.displayName, event.name] },
          cutAt: { gte: startOfDay, lte: endOfDay },
        }
      }),
    ])

    if (conversionCount + cutCount >= event.dailyCap) {
      return true
    }
  }
}

  return false
}
