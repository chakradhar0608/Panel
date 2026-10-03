import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  const body = (await req.json()) as { status?: 'REJECTED'; adminNote?: string }

  if (!body.status || body.status !== 'REJECTED') {
    return NextResponse.json(
      { error: 'INVALID_STATUS', message: 'Admin can only reject individual conversion events.' },
      { status: 422 }
    )
  }

  const event = await db.campLeadEvent.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  if (!['APPROVED', 'PAID'].includes(event.status)) {
    return NextResponse.json(
      { error: 'INVALID_TRANSITION', message: `Cannot reject an event with status "${event.status}".` },
      { status: 422 }
    )
  }

  const payout = Number(event.payout || 0)

  await db.$transaction(async (tx: any) => {
    await tx.campLeadEvent.delete({ where: { id } })

    if (event.campId) {
      await tx.camp.update({
        where: { id: event.campId },
        data: { totalConversions: { decrement: 1 } },
      })
    }

    if (payout > 0) {
      await tx.publisher.update({
        where: { id: event.publisherId },
        data: {
          walletBalance: { decrement: payout },
          totalEarned: { decrement: payout },
        },
      })

      await tx.walletTransaction.create({
        data: {
          publisherId: event.publisherId,
          amount: -payout,
          type: 'DEBIT',
          status: 'COMPLETED',
          details: `REVERSAL (Event Rejection): Click: ${event.clickId} | Event: ${event.eventName} | Note: ${body.adminNote || 'Admin rejection'}`,
          reference: `${event.clickId}:${event.eventName}:reversal`,
        },
      })
    }

    const remainingApprovedEvents = await tx.campLeadEvent.findMany({
      where: {
        campLeadId: event.campLeadId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      orderBy: [{ approvedAt: 'desc' }, { id: 'desc' }],
      take: 1,
    })

    const latestApprovedEvent = remainingApprovedEvents[0] || null
    await tx.campLead.update({
      where: { id: event.campLeadId },
      data: latestApprovedEvent
        ? {
            status: latestApprovedEvent.status,
            eventName: latestApprovedEvent.eventName,
            payout: Number(latestApprovedEvent.payout || 0),
            convertedAt: latestApprovedEvent.convertedAt,
            approvedAt: latestApprovedEvent.approvedAt,
            adminNote: body.adminNote || null,
          }
        : {
            status: 'REJECTED',
            eventName: null,
            payout: 0,
            convertedAt: null,
            approvedAt: null,
            adminNote: body.adminNote || null,
          },
    })

  })

  return NextResponse.json({
    success: true,
    reversed: payout > 0,
    deleted: true,
    lead: { id, payout },
  })
}
