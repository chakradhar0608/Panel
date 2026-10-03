'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'

type DashboardStats = {
  offers?: number
  publishers?: number
  totalCampLeads?: number
  pendingCampLeads?: number
  pendingWithdrawals?: number
  totalCampLeadsToday?: number
  totalWalletBalance?: number
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({})
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
        const data = await res.json()
        if (alive) setStats(data || {})
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

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
    <div className="space-y-6">
      {/* 1. Admin Header Gradient Banner Card */}
      <div
        className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #1E1B4B, #312E81, #4338CA)' }}
      >
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-lg pointer-events-none" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">ADMINISTRATOR CONTROL</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-indigo-100 mt-1 font-medium">NCCamp platform configuration and stats overview</p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {/* Clock Glassmorphic badge */}
            <div className="rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-indigo-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formattedDateTime} IST</span>
            </div>

            {/* Platform status badge */}
            <div className="rounded-xl bg-emerald-500/20 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-emerald-400/20 text-xs font-bold text-emerald-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Platform Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Redesigned Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl bg-gray-100 animate-pulse border border-gray-100" />
          ))
        ) : (
          <>
            {/* OFFERS */}
            <div className="rounded-2xl border border-gray-150 border-t-4 border-t-indigo-500 bg-white p-5 shadow-xs hover:shadow-md transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Offers</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.offers ?? 0}</p>
            </div>

            {/* PUBLISHERS */}
            <div className="rounded-2xl border border-gray-150 border-t-4 border-t-blue-500 bg-white p-5 shadow-xs hover:shadow-md transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Publishers</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.publishers ?? 0}</p>
            </div>

            {/* TOTAL CLICKS */}
            <div className="rounded-2xl border border-gray-150 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs hover:shadow-md transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Clicks</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{(stats.totalCampLeads ?? 0).toLocaleString('en-IN')}</p>
            </div>

            {/* CLICKS TODAY */}
            <div className="rounded-2xl border border-gray-150 border-t-4 border-t-teal-500 bg-white p-5 shadow-xs hover:shadow-md transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-inner">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Clicks Today</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{(stats.totalCampLeadsToday ?? 0).toLocaleString('en-IN')}</p>
            </div>

            {/* TOTAL BALANCE */}
            <div className="rounded-2xl border border-gray-150 border-t-4 border-t-pink-500 bg-white p-5 shadow-xs hover:shadow-md transition">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shadow-inner">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Platform Balances</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">₹{Number(stats.totalWalletBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>


            {/* PENDING WITHDRAWALS (Alert conditional link) */}
            <Link
              href="/admin/withdrawals?status=PENDING"
              className="block rounded-2xl border border-gray-150 border-t-4 border-t-rose-500 bg-white p-5 shadow-xs hover:shadow-md hover:border-rose-400 transition"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                {Number(stats.pendingWithdrawals ?? 0) > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Withdrawals</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.pendingWithdrawals ?? 0}</p>
            </Link>
          </>
        )}
      </div>

      {/* 3. Helper System Actions Card */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-extrabold text-sm text-gray-800">Quick Shortcuts</h2>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Manage key sections of the admin interface</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/admin/offers"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
          >
            <span>Configure Offers</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/admin/publishers"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
          >
            <span>Review Publishers</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
          >
            <span>System Settings</span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
