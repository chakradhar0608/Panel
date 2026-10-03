import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { parseOfferEvents } from '@/lib/offer-events'

const MAX_CLICK_IDS = 20000

function cleanClickIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of input) {
    const clickId = String(value ?? '').trim()
    if (!clickId || seen.has(clickId)) continue
    seen.add(clickId)
    result.push(clickId)
    if (result.length >= MAX_CLICK_IDS) break
  }
  return result
}

async function loadContext(offerId: number, eventName: string, clickIds: string[]) {
  const [offer, leads] = await Promise.all([
    db.offer.findUnique({ where: { id: offerId } }),
    db.campLead.findMany({ where: { offerId, clickId: { in: clickIds } } }),
  ])

  if (!offer) throw new Error('OFFER_NOT_FOUND')

  const event = parseOfferEvents(offer.events).events.find(
    (item) => item.name === eventName || item.displayName === eventName
  )
  if (!event) throw new Error('EVENT_NOT_FOUND')

  const leadIds = (leads as any[]).map((lead) => lead.id)
  const existingEvents = leadIds.length
    ? await db.campLeadEvent.findMany({ where: { campLeadId: { in: leadIds }, eventName: { in: [event.name, event.displayName] } } })
    : []

  const existingByLeadId = new Map<number, any>()
  for (const item of existingEvents as any[]) existingByLeadId.set(item.campLeadId, item)

  const leadsByClickId = new Map<string, any>()
  for (const lead of leads as any[]) leadsByClickId.set(lead.clickId, lead)

  const rows = clickIds.map((clickId) => {
    const lead = leadsByClickId.get(clickId)
    if (!lead) {
      return { clickId, status: 'NOT_FOUND', publisher: null, payout: Number(event.payout || 0) }
    }

    const existing = existingByLeadId.get(lead.id)
    if (existing) {
      return {
        clickId,
        status: 'ALREADY_PROCESSED',
        publisher: lead.publisherId,
        payout: Number(existing.payout || event.payout || 0),
        eventId: existing.id,
      }
    }

    return {
      clickId,
      status: 'READY',
      publisher: lead.publisherId,
      payout: Number(event.payout || 0),
      leadId: lead.id,
      clickedAt: lead.clickedAt,
    }
  })

  return { offer, event, rows }
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const offers = await db.offer.findMany({
    where: { status: { in: ['ACTIVE', 'PAUSED'] } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
  })

  return NextResponse.json({
    offers: (offers as any[]).map((offer) => ({
      id: offer.id,
      name: offer.name,
      publisherPayout: Number(offer.publisherPayout || 0),
      events: offer.events || '[]',
    })),
  })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json().catch(() => null) as any
  const mode = String(body?.mode || 'preview')
  const offerId = Number(body?.offerId || 0)
  const eventName = String(body?.eventName || '').trim()
  const clickIds = cleanClickIds(body?.clickIds)

  if (!Number.isInteger(offerId) || offerId <= 0) {
    return NextResponse.json({ error: 'INVALID_OFFER_ID' }, { status: 422 })
  }
  if (!eventName) return NextResponse.json({ error: 'INVALID_EVENT' }, { status: 422 })
  if (!clickIds.length) return NextResponse.json({ error: 'NO_CLICK_IDS' }, { status: 422 })
  if (clickIds.length > MAX_CLICK_IDS) return NextResponse.json({ error: 'TOO_MANY_CLICK_IDS' }, { status: 422 })

  try {
    if (mode === 'preview') {
      const { offer, event, rows } = await loadContext(offerId, eventName, clickIds)
      const ready = rows.filter((row: any) => row.status === 'READY')
      const already = rows.filter((row: any) => row.status === 'ALREADY_PROCESSED')
      const notFound = rows.filter((row: any) => row.status === 'NOT_FOUND')
      return NextResponse.json({
        success: true,
        mode: 'preview',
        offer: { id: offer.id, name: offer.name },
        event: { name: event.name, displayName: event.displayName, payout: Number(event.payout || 0) },
        rows,
        summary: {
          total: rows.length,
          ready: ready.length,
          alreadyProcessed: already.length,
          notFound: notFound.length,
          payable: ready.reduce((sum: number, row: any) => sum + Number(row.payout || 0), 0),
        },
      })
    }

    if (mode !== 'confirm') return NextResponse.json({ error: 'INVALID_MODE' }, { status: 422 })

    const result = await db.$transaction(async (tx: any) => {
      const offer = await tx.offer.findUnique({ where: { id: offerId } })
      if (!offer) throw new Error('OFFER_NOT_FOUND')
      const event = parseOfferEvents(offer.events).events.find(
        (item) => item.name === eventName || item.displayName === eventName
      )
      if (!event) throw new Error('EVENT_NOT_FOUND')

      const leads = await tx.campLead.findMany({ where: { offerId, clickId: { in: clickIds } } })
      const leadIds = (leads as any[]).map((lead) => lead.id)
      const existingEvents = leadIds.length
        ? await tx.campLeadEvent.findMany({ where: { campLeadId: { in: leadIds }, eventName } })
        : []
      const existingByLeadId = new Set<number>((existingEvents as any[]).map((item) => item.campLeadId))

      const now = new Date()
      let credited = 0
      let skipped = 0
      let totalPayout = 0

      for (const lead of leads as any[]) {
        if (existingByLeadId.has(lead.id)) {
          skipped += 1
          continue
        }

        const payout = Number(event.payout || 0)
        await tx.campLeadEvent.create({
          data: {
            campLeadId: lead.id,
            campId: lead.campId,
            publisherId: lead.publisherId,
            offerId: lead.offerId,
            clickId: lead.clickId,
            eventName: event.displayName,
            payout,
            status: 'APPROVED',
            p1: lead.p1,
            p2: lead.p2,
            p3: lead.p3,
            p4: lead.p4,
            p5: lead.p5,
            sub1: lead.sub1,
            sub2: lead.sub2,
            sub3: lead.sub3,
            sub4: lead.sub4,
            sub5: lead.sub5,
            idfa: lead.idfa,
            googleAid: lead.googleAid,
            browser: lead.browser,
            ipAddress: lead.ipAddress,
            device: lead.device,
            postbackSent: false,
            postbackResponse: `Client report confirmed by admin (${admin.email || 'admin'})`,
            convertedAt: now,
            approvedAt: now,
            createdAt: now,
          },
        })

        await tx.campLead.update({
          where: { id: lead.id },
          data: {
            status: 'APPROVED',
            isAutoApproved: true,
            eventName: event.displayName,
            payout,
            convertedAt: lead.convertedAt || now,
            approvedAt: now,
          },
        })

        await tx.walletTransaction.create({
          data: {
            publisherId: lead.publisherId,
            amount: payout,
            type: 'CREDIT',
            status: 'COMPLETED',
            details: `Client report | Offer: ${offer.name} | Event: ${event.displayName} | Click: ${lead.clickId}`,
            reference: `client-report:${lead.clickId}:${event.name}`,
            createdAt: now,
          },
        })

        await tx.publisher.update({
          where: { id: lead.publisherId },
          data: {
            walletBalance: { increment: payout },
            totalEarned: { increment: payout },
          },
        })

        if (lead.campId) {
          await tx.camp.update({
            where: { id: lead.campId },
            data: { totalConversions: { increment: 1 } },
          })
        }

        credited += 1
        totalPayout += payout
      }

      return { credited, skipped, totalPayout }
    })

    return NextResponse.json({ success: true, mode: 'confirm', ...result })
  } catch (error: any) {
    const message = error?.message || 'SERVER_ERROR'
    const status = ['OFFER_NOT_FOUND', 'EVENT_NOT_FOUND'].includes(message) ? 404 : 500
    console.error('[ADMIN_CLIENT_REPORTS]', error)
    return NextResponse.json({ error: message }, { status })
  }
}
