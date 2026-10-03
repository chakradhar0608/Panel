import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { createSessionCookieValue } from '@/lib/auth'
import { sendTelegramMessage } from '@/lib/telegram-bot'

export async function POST(req: Request) {

  
  try {
    const body = (await req.json()) as { email?: string; password?: string; remember?: boolean }
    const email = body.email?.trim().toLowerCase()
    const password = body.password || ''
    const remember = body.remember || false

    if (!email || !password) {

      return NextResponse.json({ errorCode: 'VALIDATION_ERROR', message: 'Email and password required' }, { status: 422 })
    }


    const publisher = await db.publisher.findUnique({ where: { email } })
    
    if (!publisher) {

      return NextResponse.json({ errorCode: 'INVALID_CREDENTIALS' }, { status: 401 })
    }
    if (publisher.status === 'PENDING') {

      return NextResponse.json({ errorCode: 'ACCOUNT_NOT_APPROVED' }, { status: 403 })
    }

    if (publisher.status === 'SUSPENDED') {

      return NextResponse.json({ errorCode: 'SUSPENDED' }, { status: 403 })
    }


    const valid = await bcrypt.compare(password, publisher.passwordHash)
    
    if (!valid) {

      return NextResponse.json({ errorCode: 'INVALID_CREDENTIALS' }, { status: 401 })
    }


    
    const response = NextResponse.json({ success: true, status: publisher.status })
    
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    }
    
    response.cookies.set('publisher_session', createSessionCookieValue({ publisherId: publisher.id, email: publisher.email }), cookieOptions)
    
    // Telegram Notification
    if (publisher.telegramChatId) {
      const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      const device = req.headers.get('user-agent') || 'Unknown Device'
      
      const message = `🚨 <b>New Login Alert</b>\n\nAccount: ${publisher.email}\nIP: ${ip}\nDevice: ${device}\nTime: ${timeStr}`
      // Fire and forget
      void sendTelegramMessage(publisher.telegramChatId, message)
    }


    return response
  } catch (error) {
    console.error('[PARTNER_LOGIN_API] Server error:', error)
    return NextResponse.json({ errorCode: 'SERVER_ERROR' }, { status: 500 })
  }
}
