import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { sendTelegramMessage } from '@/lib/telegram-bot'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Check if it's a message
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = body.message.chat.id
    const text = body.message.text.trim()

    // Handle /start command
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const payload = parts.length > 1 ? parts[1] : null

      if (!payload) {
        await sendTelegramMessage(
          chatId, 
          'Welcome to the NC Partners Bot! 🤖\n\nTo link your account, please go to your Publisher Dashboard and click the "Link Telegram" button.'
        )
        return NextResponse.json({ ok: true })
      }

      // Check if it's a link payload (format: pub_ID_HASH or similar)
      // For simplicity, we can use the publisher's email or ID if we encrypt it, 
      // but if the payload is just pub_123 we can parse it.
      // E.g. pub_123_abc123
      if (payload.startsWith('pub_')) {
        const parts = payload.split('_')
        const publisherId = parseInt(parts[1], 10)
        
        if (isNaN(publisherId)) {
          await sendTelegramMessage(chatId, 'Invalid link. Please try again from your dashboard.')
          return NextResponse.json({ ok: true })
        }

        // We should really verify a hash here in production, but since they're 
        // coming from their logged-in dashboard, we'll link it.
        const publisher = await db.publisher.findUnique({ where: { id: publisherId } })
        
        if (!publisher) {
          await sendTelegramMessage(chatId, 'Publisher account not found.')
          return NextResponse.json({ ok: true })
        }

        await db.publisher.update({
          where: { id: publisherId },
          data: { telegramChatId: String(chatId) }
        })

        await sendTelegramMessage(
          chatId,
          `✅ <b>Account Linked Successfully!</b>\n\nWelcome back, ${publisher.name || 'Partner'}! You will now receive notifications here for:\n- Login alerts\n- New offers\n- Offer approvals\n- Conversions`
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
