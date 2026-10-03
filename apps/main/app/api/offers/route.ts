import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const offers = await db.offer.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
  })

  return NextResponse.json({
    offers: offers.map((offer: any) => ({
      id: offer.id,
      name: offer.name,
      description: offer.description ?? '',
      imageUrl: offer.imageUrl ?? null,
      badge: offer.badge ?? 'LIVE',
      payoutType: offer.payoutType ?? 'CPA',
      category: offer.category ?? 'General',
      status: offer.status ?? 'ACTIVE',
    })),
  })
}
