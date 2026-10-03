import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { isDailyQuotaCompleted } from '@/lib/quota'

export async function GET(_req: Request, { params }: { params: { campSlug: string } }) {
  const camp = await db.camp.findUnique({
    where: { campSlug: params.campSlug },
    include: { offer: { select: { name: true, imageUrl: true, category: true, telegramLink: true, events: true } } },
  })

  if (!camp) return NextResponse.json({ error: 'CAMP_NOT_FOUND' }, { status: 404 })
  if (camp.status === 'PAUSED') {
    return NextResponse.json({ error: 'CAMP_PAUSED', message: 'This camp is not active' }, { status: 404 })
  }

  if (camp.offer) {
    const quotaCompleted = await isDailyQuotaCompleted(camp.offerId, camp.offer.events)
    if (quotaCompleted) {
      return NextResponse.json({ error: 'QUOTA_COMPLETED', message: 'today quota completed' }, { status: 403 })
    }
  }

  return NextResponse.json({
    camp: {
      id: camp.id,
      campSlug: camp.campSlug,
      campName: camp.campName,
      status: camp.status,
      showMobileField: camp.showMobileField,
      showReferField: camp.showReferField,
      userGets: camp.userGets,
      referrerGets: camp.referrerGets,
      offer: camp.offer,
    },
  })
}
