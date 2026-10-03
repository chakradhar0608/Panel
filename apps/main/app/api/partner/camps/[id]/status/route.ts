import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  const camp = await db.camp.findUnique({ where: { id } })
  if (!camp) return NextResponse.json({ error: 'CAMP_NOT_FOUND' }, { status: 404 })
  if (camp.publisherId !== publisher.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const body = (await req.json()) as { status?: 'ACTIVE' | 'PAUSED' | 'DELETED' }
  if (!body.status || !['ACTIVE', 'PAUSED', 'DELETED'].includes(body.status)) {
    return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 422 })
  }

  await db.camp.update({ where: { id }, data: { status: body.status } })
  return NextResponse.json({ success: true, status: body.status })
}
