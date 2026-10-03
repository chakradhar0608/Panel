import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { sendTelegramMessage } from '@/lib/telegram-bot'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })

  const publisher = await db.publisher.findUnique({ where: { id } })
  if (!publisher) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const pendingStatusWhere = {
    OR: [{ status: 'PENDING' }, { status: '' }, { status: null }],
  }

  const [completedAgg, pendingAgg] = await Promise.all([
    db.walletTransaction.aggregate({
      where: { publisherId: id, status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    db.withdrawalRequest.aggregate({
      where: { publisherId: id, ...pendingStatusWhere },
      _sum: { amount: true },
    }),
  ])

  const requests = await db.publisherOffer.findMany({
    where: { publisherId: id },
    orderBy: [{ status: 'asc' }, { id: 'desc' }],
  })
  const offers = requests.length
    ? await db.offer.findMany({ where: { id: { in: requests.map((item: any) => item.offerId) } } })
    : []
  const offerMap = new Map(offers.map((item: any) => [item.id, item]))

  return NextResponse.json({
    publisher: {
      ...publisher,
      walletBalance: Number(completedAgg._sum.amount ?? 0) - Number(pendingAgg._sum.amount ?? 0),
      publisherOffers: requests.map((item: any) => ({
        id: item.id,
        offerId: item.offerId,
        status: item.status || 'PENDING',
        requestedAt: item.requestedAt || item.createdAt,
        approvedAt: item.approvedAt || null,
        offer: offerMap.get(item.offerId) || null,
      })),
    },
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })

  const body = (await req.json()) as Record<string, unknown>

  if (body.offerId !== undefined) {
    const offerId = Number(body.offerId)
    const nextStatus = String(body.offerStatus || '').toUpperCase()
    if (!Number.isInteger(offerId)) return NextResponse.json({ error: 'INVALID_OFFER_ID' }, { status: 400 })
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(nextStatus)) {
      return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 422 })
    }

    const request = await db.publisherOffer.findFirst({ where: { publisherId: id, offerId } })
    if (!request) return NextResponse.json({ error: 'REQUEST_NOT_FOUND' }, { status: 404 })

    const updated = await db.publisherOffer.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        approvedAt: nextStatus === 'APPROVED' ? new Date() : null,
      },
    })

    if (nextStatus === 'APPROVED' && request.status !== 'APPROVED') {
      void (async () => {
        try {
          const publisher = await db.publisher.findUnique({ where: { id } })
          if (publisher?.telegramChatId) {
            const offer = await db.offer.findUnique({ where: { id: offerId } })
            if (offer) {
              await sendTelegramMessage(
                publisher.telegramChatId,
                `✅ <b>Offer Approved</b>\n\nYou are now approved to run: ${offer.name}.`
              )
            }
          }
        } catch (err) {
          console.error('[ADMIN_PUB_TELEGRAM] Failed to send approval msg:', err)
        }
      })()
    }

    return NextResponse.json({ success: true, updated })
  }

  const data: Record<string, unknown> = {}
  let balanceAdjustment = 0
  if (typeof body.status === 'string') data.status = body.status.toUpperCase()

  if (body.adjustBalance !== undefined) {
    const amount = Number(body.adjustBalance)
    const publisher = await db.publisher.findUnique({ where: { id } })
    if (!publisher) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    balanceAdjustment = amount
    data.walletBalance = Number(publisher.walletBalance || 0) + amount
  }

  if (body.adjustBalance !== undefined) {
    await db.$transaction(async (tx: any) => {
      await tx.publisher.update({ where: { id }, data })
      if (balanceAdjustment !== 0) {
        await tx.walletTransaction.create({
          data: {
            publisherId: id,
            amount: balanceAdjustment,
            type: balanceAdjustment >= 0 ? 'CREDIT' : 'DEBIT',
            status: 'COMPLETED',
            details: `Admin balance adjustment: ${balanceAdjustment >= 0 ? 'credit' : 'debit'}`,
            reference: `admin-adjustment-${Date.now()}`,
          },
        })
      }
    })
  } else {
    await db.publisher.update({ where: { id }, data })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })

  const publisher = await db.publisher.findUnique({ where: { id } })
  if (!publisher) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    await db.$transaction(async (tx: typeof db) => {
      await tx.$executeRawUnsafe('DELETE FROM PartnerPasswordResetToken WHERE publisherId = ?', id)

      try {
        await tx.$executeRawUnsafe('DELETE FROM PasswordResetToken WHERE publisherId = ?', id)
      } catch {
        // Older deployments may not have the legacy table.
      }

      await tx.$executeRawUnsafe('DELETE FROM PublisherPostback WHERE publisherId = ?', id)
      await tx.$executeRawUnsafe('DELETE FROM WalletTransaction WHERE publisherId = ?', id)
      await tx.$executeRawUnsafe('DELETE FROM WithdrawalRequest WHERE publisherId = ?', id)
      await tx.$executeRawUnsafe('DELETE FROM PublisherOffer WHERE publisherId = ?', id)
      await tx.$executeRawUnsafe('DELETE FROM CampLead WHERE publisherId = ?', id)
      await tx.$executeRawUnsafe('DELETE FROM Camp WHERE publisherId = ?', id)
      await tx.publisher.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'DELETE_FAILED' }, { status: 500 })
  }
}
