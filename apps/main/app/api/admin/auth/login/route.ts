import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { createSessionCookieValue } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string
      password?: string
    }

    const email = body.email?.trim().toLowerCase()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    const adminEmail = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase()

    const adminPasswordHash =
      process.env.ADMIN_PASSWORD_HASH || ''

    if (!adminEmail || !adminPasswordHash) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD_HASH is missing')

      return NextResponse.json(
        { error: 'ADMIN_CONFIG_MISSING' },
        { status: 500 }
      )
    }

    if (email !== adminEmail) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(
      password,
      adminPasswordHash
    )

    if (!valid) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // Environment admin session.
    // Do NOT include adminId because that would trigger
    // a database lookup later.
    const sessionPayload = {
      email: adminEmail,
    }

    const response = NextResponse.json({
      success: true,
    })

    response.cookies.set(
      'admin_session',
      createSessionCookieValue(sessionPayload),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24,
      }
    )

    response.cookies.set('admin_token', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    return response
  } catch (error) {
    console.error('Admin login error:', error)

    return NextResponse.json(
      { error: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
