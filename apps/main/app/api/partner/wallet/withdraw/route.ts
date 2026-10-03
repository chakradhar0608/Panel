import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

const UPI_REGEX = /^[\w.\-]+@[\w]+$/

export async function POST(req: Request) {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = (await req.json()) as { amount?: number; method?: 'UPI' | 'BANK'; paymentDetails?: Record<string, string> }
  const amount = Number(body.amount || 0)
  const method = body.method
  const paymentDetails = body.paymentDetails || {}

  if (!Number.isFinite(amount) || amount < 2500) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'amount', message: 'Minimum withdrawal is ₹2500' }, { status: 422 })
  }

  const pendingStatusWhere = {
  OR: [{ status: 'PENDING' }, { status: '' }, { status: null }],
}

// Block if publisher already has a pending withdrawal
const existingPending = await db.withdrawalRequest.findFirst({
  where: { publisherId: publisher.id, ...pendingStatusWhere },
})
if (existingPending) {
  return NextResponse.json(
    { error: 'PENDING_WITHDRAWAL_EXISTS', message: 'You already have a pending withdrawal request. Please wait for it to be processed before making a new one.' },
    { status: 422 }
  )
}

  const [completedAgg, pendingAgg] = await Promise.all([
    db.walletTransaction.aggregate({ where: { publisherId: publisher.id, status: 'COMPLETED' }, _sum: { amount: true } }),
    db.withdrawalRequest.aggregate({ where: { publisherId: publisher.id, ...pendingStatusWhere }, _sum: { amount: true } }),
  ])
  const availableBalance = Number(completedAgg._sum.amount ?? 0) - Number(pendingAgg._sum.amount ?? 0)

  if (amount > availableBalance) {
    return NextResponse.json({ error: 'INSUFFICIENT_BALANCE', message: 'Withdrawal amount exceeds your available balance' }, { status: 422 })
  }

  if (method !== 'UPI' && method !== 'BANK') {
    return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'method', message: 'Method must be UPI or BANK' }, { status: 422 })
  }

  if (method === 'UPI') {
    if (!paymentDetails.upiId || !UPI_REGEX.test(paymentDetails.upiId)) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'upiId', message: 'Invalid UPI ID format' }, { status: 422 })
    }
  }

  if (method === 'BANK') {
    if (!paymentDetails.accountNo || !paymentDetails.ifsc || !paymentDetails.holderName) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', field: 'paymentDetails', message: 'accountNo, ifsc and holderName are required' }, { status: 422 })
    }
  }

  await db.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.create({
      data: {
        publisherId: publisher.id,
        amount,
        method,
        paymentDetails: JSON.stringify(paymentDetails),
        status: 'PENDING',
        requestedAt: new Date(),
      },
    })

    await tx.walletTransaction.create({
      data: {
        publisherId: publisher.id,
        amount: -amount,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        details: 'Withdrawal request',
        reference: String(request.id),
      },
    })

    await tx.publisher.update({
      where: { id: publisher.id },
      data: { pendingWithdrawal: { increment: amount } },
    })
  })

  return NextResponse.json({ success: true, message: 'Withdrawal request submitted successfully.' }, { status: 201 })
}
