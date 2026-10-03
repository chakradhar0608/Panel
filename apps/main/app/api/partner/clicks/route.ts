import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { endOfDay, startOfDay } from '@/app/api/_utils/common'

export async function GET(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) {

    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  


  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const offerId = url.searchParams.get('offerId')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)))

  const where: any = { publisherId: publisher.id, status: 'CLICKED' } 
  if (offerId) where.offerId = Number(offerId)
  if (dateFrom || dateTo) {
    where.clickedAt = {}
    if (dateFrom) where.clickedAt.gte = startOfDay(new Date(dateFrom))
    if (dateTo) where.clickedAt.lte = endOfDay(new Date(dateTo))
  }
  



  const [total, leads] = await Promise.all([
    db.campLead.count({ where }),
    db.campLead.findMany({
      where,
      include: {
        offer: { select: { id: true, name: true } },
        camp: { select: { id: true, campName: true } },
      },
      orderBy: { clickedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const processedLeads = leads.map((lead) => ({
    id: lead.id,
    clickId: lead.clickId,
    mobileNumber: lead.mobileNumber,
    userUpi: lead.userUpi ? `${lead.userUpi.substring(0, 3)}***` : null,
    offerName: lead.offer.name,
    offerId: lead.offer.id,
    campName: lead.camp?.campName || '-',
    campId: lead.camp?.id || null,
    eventName: lead.eventName,
    payout: Number(lead.payout),
    status: lead.status,
    device: lead.device,
    p1: lead.p1,
    p2: lead.p2,
    p3: lead.p3,
    p4: lead.p4,
    p5: lead.p5,
    sub1: lead.sub1,
    sub2: lead.sub2,
    sub3: lead.sub3,
    postbackSent: lead.postbackSent,
    postbackSentAt: lead.postbackSentAt,
    clickedAt: lead.clickedAt ? (lead.clickedAt instanceof Date ? lead.clickedAt.toISOString() : new Date(lead.clickedAt).toISOString()) : null,
    convertedAt: lead.convertedAt,
    approvedAt: lead.approvedAt,
    ipAddress: lead.ipAddress,
    referrerUpi: lead.referrerUpi ? `${lead.referrerUpi.substring(0, 3)}***` : null,
    postbackResponse: lead.postbackResponse,
    location: lead.location,
  }))
  

  return NextResponse.json({
    leads: processedLeads,
    total,
    page,
    limit,
    stats: {
      totalClicks: total,
    },
  })
}
