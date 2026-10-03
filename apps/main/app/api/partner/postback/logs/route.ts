import { NextResponse } from 'next/server'
import { requirePublisher } from '@/lib/auth'
import { db } from '@nccamp/db'

export async function GET(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'))
  const offset = (page - 1) * limit

  const search = searchParams.get('search')?.trim() || ''
  const statusFilter = searchParams.get('status') || 'All' // All, Success, Failed, Pending

  const where: any = {
    publisherId: publisher.id,
  }

  // Handle status filter
  if (statusFilter === 'Success') {
    where.postbackSent = true
    where.postbackResponse = { startsWith: '2' }
  } else if (statusFilter === 'Failed') {
    where.OR = [
      { postbackSent: false, postbackResponse: { not: null } },
      { postbackSent: true, postbackResponse: { not: { startsWith: '2' } } }
    ]
  } else if (statusFilter === 'Pending') {
    where.postbackResponse = null
  }

  // Handle search by ClickID
  if (search) {
    where.clickId = { contains: search }
  }

  try {
    const [count, rows] = await Promise.all([
      db.campLeadEvent.count({ where }),
      db.campLeadEvent.findMany({
        where,
        include: {
          offer: {
            select: { name: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        limit,
        offset
      })
    ])

    const logs = rows.map((row: any) => {
      let deliveryStatus = 'PENDING'
      if (row.postbackResponse) {
        if (row.postbackSent && row.postbackResponse.startsWith('2')) {
          deliveryStatus = 'SUCCESS'
        } else {
          deliveryStatus = 'FAILED'
        }
      }

      return {
        id: row.id,
        clickId: row.clickId,
        eventName: row.eventName,
        offerName: row.offer?.name || 'Unknown',
        payout: Number(row.payout),
        status: row.status, // Conversion status: APPROVED, REJECTED, PENDING
        postbackSent: row.postbackSent,
        postbackSentAt: row.postbackSentAt,
        postbackResponse: row.postbackResponse,
        deliveryStatus,
        createdAt: row.createdAt
      }
    })

    return NextResponse.json({
      logs,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    })
  } catch (e: any) {
    console.error('Failed to load postback logs:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
