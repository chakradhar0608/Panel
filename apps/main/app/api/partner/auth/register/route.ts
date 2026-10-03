import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string>
    const email = body.email?.trim().toLowerCase()
    const password = body.password || ''
    const fullName = body.fullName?.trim()

    if (!email || !password || !fullName) {
      return NextResponse.json({ errorCode: 'VALIDATION_ERROR', message: 'Missing required fields' }, { status: 422 })
    }

    const exists = await db.publisher.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ errorCode: 'EMAIL_EXISTS', message: 'Email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await db.publisher.create({
      data: {
        name: fullName,
        email,
        passwordHash,
        mobile: body.mobile?.trim() || null,
        websiteOrTelegram: body.websiteOrTelegram?.trim() || null,
        trafficSource: body.trafficSource?.trim() || null,
        paymentMethod: body.paymentMethod?.trim() || null,
        upiId: body.upiId?.trim() || null,
        accountNumber: body.accountNumber?.trim() || null,
        ifsc: body.ifsc?.trim() || null,
        accountHolderName: body.accountHolderName?.trim() || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('partner/auth/register error:', error)
    const message =
      process.env.NODE_ENV === 'development'
        ? (error as Error)?.message || 'Something went wrong'
        : 'Something went wrong'
    return NextResponse.json({ errorCode: 'SERVER_ERROR', message }, { status: 500 })
  }
}
