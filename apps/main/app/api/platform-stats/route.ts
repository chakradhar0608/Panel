import { db } from '@nccamp/db'
import { NextResponse } from 'next/server'

type PlatformStatsRow = {
  campsCompleted?: number | string | null
  activeUsers?: number | string | null
  totalPaidLakh?: number | string | null
  successRate?: number | string | null
  camps_completed?: number | string | null
  active_users?: number | string | null
  total_paid_lakh?: number | string | null
  success_rate?: number | string | null
}

const DEFAULT_STATS = {
  campsCompleted: 100,
  activeUsers: 2000,
  totalPaidLakh: 2.3,
  successRate: 96,
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET() {
  try {
    const queries = [
      `SELECT campsCompleted, activeUsers, totalPaidLakh, successRate FROM PlatformStat ORDER BY id ASC LIMIT 1`,
      `SELECT camps_completed, active_users, total_paid_lakh, success_rate FROM platform_stats ORDER BY id ASC LIMIT 1`,
    ]

    for (const query of queries) {
      try {
        const rows = (await db.$queryRawUnsafe(query)) as PlatformStatsRow[]
        if (rows.length > 0) {
          const row = rows[0]
          return NextResponse.json({
            campsCompleted: toNumber(
              row.campsCompleted ?? row.camps_completed,
              DEFAULT_STATS.campsCompleted
            ),
            activeUsers: toNumber(row.activeUsers ?? row.active_users, DEFAULT_STATS.activeUsers),
            totalPaidLakh: toNumber(
              row.totalPaidLakh ?? row.total_paid_lakh,
              DEFAULT_STATS.totalPaidLakh
            ),
            successRate: toNumber(row.successRate ?? row.success_rate, DEFAULT_STATS.successRate),
          })
        }
      } catch {
        continue
      }
    }

    return NextResponse.json(DEFAULT_STATS)
  } catch {
    return NextResponse.json(
      { error: 'Unable to fetch platform stats' },
      { status: 500 }
    )
  }
}
