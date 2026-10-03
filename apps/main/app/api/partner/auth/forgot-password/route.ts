import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; newPassword?: string }
    const email = body?.email?.trim().toLowerCase()
    const newPassword = body?.newPassword

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required.' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    const publisher = await db.publisher.findFirst({
      where: { email },
    })

    if (!publisher) {
      return NextResponse.json({ error: 'Account not found with this email.' }, { status: 404 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await db.publisher.update({
      where: { id: publisher.id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now login.',
    })
  } catch (e) {
    console.error('Password reset failed:', e)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
