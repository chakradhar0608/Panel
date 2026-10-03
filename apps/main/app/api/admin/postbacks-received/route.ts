import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'

function startOfIstDay(dateText: string) {
  return new Date(`${dateText}T00:00:00+05:30`)
}
function endOfIstDay(dateText: string) {
  return new Date(`${dateText}T23:59:59.999+05:30`)
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)

  // Offer list for filter dropdowns
  if (url.searchParams.get('offerList') === 'true') {
    const offers = await db.offer.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
    })
    return NextResponse.json({
      offers: (offers as any[]).map((o) => ({
        id: o.id,
        name: o.name,
        events: o.events || '[]',
      })),
    })
  }

  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Number(url.searchParams.get('limit') || 50))

  const offerIdsParam = url.searchParams.get('offerIds')
  const eventNamesParam = url.searchParams.get('eventNames')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const statusFilter = url.searchParams.get('status') || 'All'
  const search = url.searchParams.get('search')?.trim() || ''

  const where: any = {}

  if (offerIdsParam) {
    const ids = offerIdsParam.split(',').map(Number).filter((n) => n > 0)
    if (ids.length > 0) where.offerId = { in: ids }
  }

  if (eventNamesParam) {
    const names = eventNamesParam.split(',').filter(Boolean)
    if (names.length > 0) where.eventName = { in: names }
  }

  if (dateFrom || dateTo) {
    where.receivedAt = {} as any
    if (dateFrom) (where.receivedAt as any).gte = startOfIstDay(dateFrom)
    if (dateTo) (where.receivedAt as any).lte = endOfIstDay(dateTo)
  }

  if (statusFilter !== 'All') {
    where.status = statusFilter
  }

  if (search) {
    where.clickId = { contains: search }
  }

  try {
    const [count, rows] = await Promise.all([
      db.incomingPostback.count({ where }),
      db.incomingPostback.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      logs: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    })
  } catch (e: any) {
    console.error('Failed to load incoming postbacks:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
