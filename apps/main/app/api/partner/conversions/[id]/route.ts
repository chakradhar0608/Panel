import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  const lead = await db.campLead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  if (lead.publisherId !== publisher.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  return NextResponse.json({ lead: { ...lead, payout: Number(lead.payout) } })
}
