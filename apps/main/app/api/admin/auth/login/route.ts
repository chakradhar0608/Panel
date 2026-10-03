import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { createSessionCookieValue } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = body.email?.trim().toLowerCase()
    const password = body.password || ''
    if (!email || !password) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })

    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH || ''
    const isEnvAdmin = envEmail === email && envPasswordHash

    const admin = isEnvAdmin ? null : await db.adminUser.findUnique({ where: { email } })
    const passwordHash = isEnvAdmin ? envPasswordHash : admin?.passwordHash
    if (!passwordHash) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })

    const valid = await bcrypt.compare(password, passwordHash)
    if (!valid) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })

    const sessionPayload = isEnvAdmin
      ? { email }
      : { adminId: admin!.id, email: admin!.email }

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', createSessionCookieValue(sessionPayload), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    response.cookies.set('admin_token', '1', { path: '/', maxAge: 60 * 60 * 24 })
    return response
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
