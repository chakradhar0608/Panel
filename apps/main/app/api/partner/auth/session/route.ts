import { NextResponse } from 'next/server'
import { requirePublisher } from '@/lib/auth'

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({
    authenticated: true,
    user: { id: publisher.id, name: publisher.name, email: publisher.email, status: publisher.status },
  })
}
