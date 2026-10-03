import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requireAdmin } from '@/lib/auth'
import { sendTelegramMessage } from '@/lib/telegram-bot'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const id = Number(params.id)
  const body = (await req.json()) as { status?: 'PAID' | 'REJECTED'; adminNote?: string; transactionRef?: string }
  if (!body.status || !['PAID', 'REJECTED'].includes(body.status)) {
    return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 422 })
  }

  const request = await db.withdrawalRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  await db.$transaction(async (tx) => {
    if (body.status === 'PAID') {
      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'PAID',
          adminNote: body.adminNote || null,
          transactionRef: body.transactionRef || null,
          processedAt: new Date(),
        },
      })

      await tx.walletTransaction.updateMany({
        where: { publisherId: request.publisherId, type: 'WITHDRAWAL', reference: String(id) },
        data: { status: 'COMPLETED' },
      })

      await tx.publisher.update({
        where: { id: request.publisherId },
        data: {
          walletBalance: { decrement: request.amount },
          totalWithdrawn: { increment: request.amount },
          pendingWithdrawal: { decrement: request.amount },
        },
      })
    } else {
      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNote: body.adminNote || null,
          processedAt: new Date(),
        },
      })

      await tx.walletTransaction.updateMany({
        where: { publisherId: request.publisherId, type: 'WITHDRAWAL', reference: String(id) },
        data: { status: 'FAILED' },
      })

      await tx.publisher.update({
        where: { id: request.publisherId },
        data: { pendingWithdrawal: { decrement: request.amount } },
      })
    }
  })

  // Send Telegram notification to publisher
  void (async () => {
    try {
      const publisher = await db.publisher.findUnique({
        where: { id: request.publisherId },
        select: { telegramChatId: true, name: true },
      })

      if (!publisher?.telegramChatId) return

      const amount = `₹${Number(request.amount).toLocaleString('en-IN')}`

      if (body.status === 'PAID') {
        const lines = [
          '✅ <b>Withdrawal Successful!</b>',
          '',
          `Amount: <b>${amount}</b>`,
          `Method: ${request.method}`,
          body.transactionRef ? `Transaction Ref: <code>${body.transactionRef}</code>` : '',
          body.adminNote ? `Note: ${body.adminNote}` : '',
          '',
          'Your withdrawal has been processed. The amount will reflect in your account shortly.',
        ].filter(Boolean).join('\n')

        await sendTelegramMessage(publisher.telegramChatId, lines)
      } else {
        const lines = [
          '❌ <b>Withdrawal Rejected</b>',
          '',
          `Amount: <b>${amount}</b>`,
          `Method: ${request.method}`,
          body.adminNote ? `Reason: ${body.adminNote}` : '',
          '',
          'Your withdrawal request has been rejected. The amount has been returned to your wallet. Please contact support if you have questions.',
        ].filter(Boolean).join('\n')

        await sendTelegramMessage(publisher.telegramChatId, lines)
      }
    } catch (err) {
      console.error('[WITHDRAWAL_NOTIFY] Failed to send Telegram message:', err)
    }
  })()

  return NextResponse.json({ success: true })
}