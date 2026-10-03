'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type DashboardResponse = {
  publisherId: number
  publisherName: string
  telegramLinked: boolean
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  conversionRate: string
  pendingConversions: number
  approvedConversions: number
  walletBalance: number
  weeklyPerformance: Array<{ date: string; clicks: number; conversions: number }>
  recentActivity: Array<{ offerName: string; payout: number; status: string; date: string }>
}

type SessionResponse = {
  authenticated?: boolean
  user?: { status?: string }
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

export default function PartnerDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvalPending, setApprovalPending] = useState(false)
  const [now, setNow] = useState(new Date())
  const [showBanner, setShowBanner] = useState(true)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/partner/dashboard', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 403) {
          const sessionRes = await fetch('/api/partner/auth/session', { cache: 'no-store' })
          const sessionJson = (await sessionRes.json().catch(() => ({}))) as SessionResponse
          if (sessionJson.user?.status === 'PENDING') {
            setApprovalPending(true)
            setData(null)
            return
          }
        }
        throw new Error('Failed to load')
      }
      const json = (await res.json()) as DashboardResponse
      setApprovalPending(false)
      setData(json)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const dismissed = localStorage.getItem('banner_dismissed')
    if (dismissed === 'true') setShowBanner(false)
    void load()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const greet = useMemo(() => {
    const h = now.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
  }, [now])

  const firstName = useMemo(() => {
    if (!data?.publisherName) return 'Partner'
    return data.publisherName.split(' ')[0]
  }, [data])

  const maxMetric = Math.max(
    1,
    ...(data?.weeklyPerformance.flatMap((item) => [item.clicks, item.conversions]) || [1])
  )

  const formattedDateTime = useMemo(() => {
    return now.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }, [now])

  return (
    <div className="space-y-4">
      {approvalPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-black">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Approval Pending</p>
          <h1 className="mt-2 text-3xl font-bold">Your partner account is waiting for admin approval.</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-700">
            You can log in, but dashboard stats, offer access, tracking links, and camp creation will stay locked until an admin approves your account.
          </p>
        </div>
      ) : null}

      {approvalPending ? null : (
        <>
          {/* 1. Premium Glowing Sun Orange/Yellow Gradient Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#FF7E40] via-[#FFB020] to-[#FFD000] p-6 text-white shadow-md relative overflow-hidden">
            {/* Glowing Sun graphics */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-12 h-56 w-56 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 h-36 w-36 rounded-full bg-white/25 blur-xl pointer-events-none" />

            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">PARTNER DASHBOARD</p>
              <h1 className="text-2xl font-extrabold text-white mt-0.5 tracking-tight">{greet}, {firstName}!</h1>
              <p className="text-xs text-white/90 mt-1 font-medium">Here's your performance overview</p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {/* Date Glassmorphic badge */}
                <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-[11px] font-bold text-white shadow-xs">
                  <svg className="h-3.5 w-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formattedDateTime}</span>
                </div>

                {/* Wallet Balance Gold badge */}
                <div className="rounded-xl bg-white/25 px-4 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-[11px] font-black text-yellow-950 shadow-xs">
                  <svg className="h-3.5 w-3.5 text-yellow-950/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>₹{Number(data?.walletBalance || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Download APK android banner */}
          {showBanner && (
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#2A2B82] to-[#403BBF] p-4 text-white shadow-sm border border-indigo-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-emerald-400 shadow-inner flex-shrink-0">
                  {/* Android Robot Icon */}
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.52 2.14L19.23.43a.5.5 0 01.71 0c.2.2.2.51 0 .71l-1.77 1.76a10 10 0 012.33 3.6h-2.1a8 8 0 00-11 0h-2.1a10 10 0 012.33-3.6L5.86 1.14a.5.5 0 010-.71.5.5 0 01.71 0l1.71 1.71a9.92 9.92 0 019.24 0zM7 10a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2zM3 12.5a8 8 0 008 8 8 8 0 008-8H3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-extrabold">Partner App is Live!</p>
                  <p className="text-[10px] text-white/80 font-medium">Manage campaigns faster on the go</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/ncpartners.apk"
                  download
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-xs hover:bg-gray-50 transition flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <button
                  type="button"
                  className="p-1 text-white/60 hover:text-white text-xl transition focus:outline-none"
                  onClick={() => {
                    setShowBanner(false)
                    localStorage.setItem('banner_dismissed', 'true')
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="font-semibold">Failed to load dashboard data</p>
              <button onClick={load} className="mt-2 rounded-xl border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-red-700 shadow-xs hover:bg-red-50 transition">Try Again</button>
            </div>
          ) : null}

          {/* 3. Redesigned 4 Metrics Status Grid Cards */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
            ) : (
              <>
                {/* TOTAL CLICKS */}
                <div className="rounded-2xl border border-gray-150 border-t-4 border-t-indigo-500 bg-white p-5 shadow-xs hover:shadow-md transition">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TOTAL CLICKS</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{data?.totalClicks.toLocaleString('en-IN') || 0}</p>
                  <span className="text-[10px] font-black text-indigo-600 mt-3.5 block">Today &gt; 0</span>
                </div>

                {/* CONVERSIONS */}
                <div className="rounded-2xl border border-gray-150 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs hover:shadow-md transition">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CONVERSIONS</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{data?.totalConversions.toLocaleString('en-IN') || 0}</p>
                  <span className="text-[10px] font-black text-emerald-600 mt-3.5 block">Today &gt; 0</span>
                </div>

                {/* REVENUE */}
                <div className="rounded-2xl border border-gray-150 border-t-4 border-t-pink-500 bg-white p-5 shadow-xs hover:shadow-md transition">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shadow-inner">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">REVENUE</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">₹{Number(data?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                  <span className="text-[10px] font-black text-pink-600 mt-3.5 block">Today &gt; ₹0</span>
                </div>

                {/* CVR */}
                <div className="rounded-2xl border border-gray-150 border-t-4 border-t-amber-500 bg-white p-5 shadow-xs hover:shadow-md transition">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CVR</p>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">{data?.conversionRate || '0.00%'}</p>
                  <span className="text-[10px] font-bold text-gray-400 mt-3.5 block">Click-to-conversion</span>
                </div>
              </>
            )}
          </div>

          {/* 4. Weekly Performance Chart & Activity */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Weekly performance Card */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm xl:col-span-2 flex flex-col justify-between">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-sm text-brand-textPrimary flex items-center gap-1.5">
                    <svg className="h-4.5 w-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Weekly Performance</span>
                  </p>
                  <p className="text-[10px] text-brand-textMuted mt-0.5">Clicks vs Conversions — Last 7 Days</p>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live</span>
                </span>
              </div>
              <div className="flex h-56 items-end gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
                {(data?.weeklyPerformance || []).map((item) => (
                  <div key={item.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex items-end gap-1">
                      <div
                        className="w-3 rounded-t bg-purple-500"
                        style={{ height: item.clicks > 0 ? `${Math.max(8, (item.clicks / maxMetric) * 120)}px` : '0px' }}
                      />
                      <div
                        className="w-3 rounded-t bg-green-500"
                        style={{ height: item.conversions > 0 ? `${Math.max(8, (item.conversions / maxMetric) * 120)}px` : '0px' }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{item.date}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs font-semibold text-brand-textMuted pl-2">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-t bg-purple-500" /> Clicks</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-3 rounded-t bg-green-500" /> Conversions</span>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-extrabold text-sm text-brand-textPrimary flex items-center gap-1.5">
                  <svg className="h-4.5 w-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Recent Activity</span>
                </p>
                <Link href="/partner/conversions" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
              </div>
              <div className="divide-y divide-brand-border max-h-[224px] overflow-y-auto pr-1">
                {(data?.recentActivity || []).length === 0 ? <p className="py-6 text-center text-xs font-semibold text-brand-textMuted">No conversions yet</p> : null}
                {(data?.recentActivity || []).map((item, idx) => (
                  <div key={`${item.offerName}-${idx}`} className="py-2.5 flex items-center justify-between text-xs transition hover:bg-gray-50/20">
                    <div>
                      <p className="font-bold text-brand-textPrimary">{item.offerName}</p>
                      <p className="text-[10px] text-brand-textMuted mt-0.5">{new Date(item.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-extrabold text-brand-textPrimary">₹{item.payout.toFixed(2)}</p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100/50 uppercase">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
