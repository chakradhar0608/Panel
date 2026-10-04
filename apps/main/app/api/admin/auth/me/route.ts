import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await requireAdmin()

    if (!admin) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
    })
  } catch (error) {
    console.error('Admin session check error:', error)

    return NextResponse.json(
      { error: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
