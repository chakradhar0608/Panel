import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'
import { endOfDay, startOfDay } from '@/app/api/_utils/common'

function getPublisherRevenueForEvent(event: any, campMap: Map<number, any>) {
  const grossPayout = Number(event.payout || 0)
  const camp = event.campId ? campMap.get(event.campId) : null
  if (!camp) return grossPayout

  const userGets = Number(camp.userGets || 0)
  const referrerGets = event.p4 ? Number(camp.referrerGets || 0) : 0
  return Math.max(0, grossPayout - userGets - referrerGets)
}

function parseRange(url: URL) {
  const type = url.searchParams.get('type') || 'daily'
  const now = new Date()
  if (type === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: endOfDay(now) }
  }
  if (type === 'custom') {
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    if (!dateFrom || !dateTo) return null
    return { start: startOfDay(new Date(dateFrom)), end: endOfDay(new Date(dateTo)) }
  }
  return { start: startOfDay(now), end: endOfDay(now) }
}

export async function GET(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const range = parseRange(url)
  if (!range) return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'dateFrom and dateTo required for custom report' }, { status: 422 })

  const clickWhere: any = {
    publisherId: publisher.id,
    clickedAt: { gte: range.start, lte: range.end },
  }
  const eventWhere: any = {
    publisherId: publisher.id,
    approvedAt: { gte: range.start, lte: range.end },
    status: { in: ['APPROVED', 'PAID'] },
  }

  const offerId = url.searchParams.get('offerId')
  const campId = url.searchParams.get('campId')
  if (offerId) {
    clickWhere.offerId = Number(offerId)
    eventWhere.offerId = Number(offerId)
  }
  if (campId) {
    clickWhere.campId = Number(campId)
    eventWhere.campId = Number(campId)
  }

  const [clicks, events, camps] = await Promise.all([
    db.campLead.findMany({ where: clickWhere, orderBy: { clickedAt: 'desc' } }),
    db.campLeadEvent.findMany({
      where: eventWhere,
      include: {
        offer: { select: { name: true } },
      },
      orderBy: { approvedAt: 'desc' },
    }),
    db.camp.findMany({
      where: campId ? { id: Number(campId), publisherId: publisher.id } : { publisherId: publisher.id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const campMap = new Map<number, any>(camps.map((camp: any) => [camp.id, camp]))
  const totalClicks = clicks.length
  const conversions = events.length
  const grossRevenue = events.reduce((sum, event) => sum + Number(event.payout), 0)
  const totalRevenue = events.reduce((sum, event) => sum + getPublisherRevenueForEvent(event, campMap), 0)

  const grouped = new Map<string, { date: string; clicks: number; mobile: number; desktop: number; conversions: number; revenue: number; grossRevenue: number }>()
  for (const click of clicks) {
    const day = click.clickedAt.toISOString().slice(0, 10)
    const row = grouped.get(day) || { date: day, clicks: 0, mobile: 0, desktop: 0, conversions: 0, revenue: 0, grossRevenue: 0 }
    row.clicks += 1
    if (click.device === 'MOBILE') row.mobile += 1
    else row.desktop += 1
    grouped.set(day, row)
  }
  for (const event of events) {
    const eventDate = (event.approvedAt || event.convertedAt || event.createdAt) as Date
    const day = new Date(eventDate).toISOString().slice(0, 10)
    const row = grouped.get(day) || { date: day, clicks: 0, mobile: 0, desktop: 0, conversions: 0, revenue: 0, grossRevenue: 0 }
    row.conversions += 1
    row.grossRevenue += Number(event.payout)
    row.revenue += getPublisherRevenueForEvent(event, campMap)
    grouped.set(day, row)
  }

  return NextResponse.json({
    summaryStats: {
      totalClicks,
      conversions,
      convRate: totalClicks > 0 ? `${((conversions / totalClicks) * 100).toFixed(2)}%` : '0.00%',
      grossRevenue,
      totalRevenue,
    },
    summaryTable: Array.from(grouped.values()).map((row) => ({
      ...row,
      convRate: row.clicks > 0 ? `${((row.conversions / row.clicks) * 100).toFixed(2)}%` : '0.00%',
    })),
    clickLogs: events.map((event) => ({
      status: event.status,
      eventName: event.eventName,
      offerName: event.offer.name,
      clickId: event.clickId,
      parameters: [event.p2, event.p3, event.p4].filter(Boolean).join(', '),
      payout: getPublisherRevenueForEvent(event, campMap),
      device: event.device,
      time: event.approvedAt instanceof Date ? event.approvedAt.toISOString() : event.approvedAt,
      conversionId: event.id,
      locationIp: event.ipAddress,
    })),
  })
}
