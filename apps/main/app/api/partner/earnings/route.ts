import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function GET() {
  const publisher = await requirePublisher()
  if (!publisher) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const conversions = await db.campLeadEvent.findMany({
    where: {
      publisherId: publisher.id,
      status: { in: ['APPROVED', 'PAID'] },
    },
    include: { offer: { select: { name: true } } },
    orderBy: { approvedAt: 'desc' },
  })

  const earningsData = conversions.map((conversion) => ({
    id: conversion.id,
    date: conversion.approvedAt instanceof Date ? conversion.approvedAt.toISOString() : (conversion.approvedAt || conversion.convertedAt instanceof Date ? conversion.convertedAt.toISOString() : conversion.convertedAt),
    offer: conversion.offer.name,
    offerName: conversion.offer.name,
    clickId: conversion.clickId,
    status: conversion.status,
    payout: Number(conversion.payout),
    amount: Number(conversion.payout),
  }))

  const totalEarned = earningsData.reduce((sum, item) => sum + item.payout, 0)
  const pending = earningsData
    .filter((item) => item.status !== 'PAID')
    .reduce((sum, item) => sum + item.payout, 0)
  const balance = totalEarned - pending

  return NextResponse.json({
    rows: earningsData,
    summary: {
      balance,
      totalEarned,
      pending,
    },
  })
}
