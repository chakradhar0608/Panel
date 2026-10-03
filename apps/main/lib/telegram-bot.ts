export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[TELEGRAM_BOT] TELEGRAM_BOT_TOKEN not set, skipping message to', chatId)
    return false
  }

  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 2000 // 2s between retries

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s per attempt

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`[TELEGRAM_BOT] Failed to send message (attempt ${attempt}/${MAX_RETRIES}):`, await response.text())
        return false // Non-2xx means Telegram rejected it — no point retrying
      }

      return true
    } catch (error: any) {
      clearTimeout(timeoutId)
      const isTimeout = error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.name === 'AbortError'

      if (isTimeout && attempt < MAX_RETRIES) {
        console.warn(`[TELEGRAM_BOT] Timeout on attempt ${attempt}/${MAX_RETRIES}, retrying in ${RETRY_DELAY_MS}ms...`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        continue
      }

      console.error(`[TELEGRAM_BOT] Error sending message (attempt ${attempt}/${MAX_RETRIES}):`, error)
      return false
    }
  }

  return false
}

export async function notifyPublisherConversion(publisherId: number, details: {
  offerName: string
  eventName: string
  payout: number
  clickId: string
  subId?: string
}) {
  try {
    const { db } = await import('@nccamp/db')
    const publisher = await db.publisher.findUnique({ where: { id: publisherId } })

    if (!publisher?.telegramChatId) return false

    const message = `💰 <b>New Conversion!</b>\n\nOffer: ${details.offerName}\nEvent: ${details.eventName}\nPayout: ₹${details.payout}\nClick ID: ${details.clickId}` +
      (details.subId ? `\nSub ID: ${details.subId}` : '')

    return await sendTelegramMessage(publisher.telegramChatId, message)
  } catch (error) {
    console.error('[TELEGRAM_BOT] Error in notifyPublisherConversion:', error)
    return false
  }
}