'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Lead = {
  id?: string | number
  date?: string
  offer?: string
  offerName?: string
  clickId?: string
  status?: string
  payout?: number | string
  amount?: number | string
}

type EarningsResponse = {
  rows?: Lead[]
  data?: Lead[]
  summary?: {
    balance?: number | string
    totalEarned?: number | string
    pending?: number | string
  }
}

function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div className="fixed bottom-4 right-4 z-[90] rounded-xl border border-brand-border bg-white border border-brand-border shadow-sm px-4 py-3 text-sm text-brand-textPrimary shadow-lg">
      {message}
    </div>
  )
}

function toNumber(value: number | string | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function PartnerEarningsPage() {
  const router = useRouter()

  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Lead[]>([])
  const [balance, setBalance] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [pending, setPending] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [offerFilter, setOfferFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const rowsPerPage = 20

  useEffect(() => {
    let alive = true
    const checkSession = async () => {
      try {
        const candidates = ['/api/partner/auth/session', '/api/auth/session']
        let authenticated = false
        for (const endpoint of candidates) {
          try {
            const res = await fetch(endpoint, { cache: 'no-store' })
            if (!res.ok) continue
            const data = await res.json()
            if (data?.authenticated || data?.user || data?.email) {
              authenticated = true
              break
            }
          } catch {
            continue
          }
        }
        if (!authenticated) {
          router.replace('/partner/login')
          return
        }
      } finally {
        if (alive) setAuthChecking(false)
      }
    }
    void checkSession()
    return () => {
      alive = false
    }
  }, [router])

  useEffect(() => {
    if (authChecking) return
    let alive = true
    const loadEarnings = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/partner/earnings', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch earnings')
        const data = (await res.json()) as EarningsResponse

        const list = Array.isArray(data.rows) ? data.rows : Array.isArray(data.data) ? data.data : []
        if (!alive) return
        setRows(list)

        const computedTotal = list.reduce((sum, row) => sum + toNumber(row.payout ?? row.amount), 0)
        const computedPending = list
          .filter((row) => (row.status || '').toUpperCase() !== 'PAID')
          .reduce((sum, row) => sum + toNumber(row.payout ?? row.amount), 0)
        const computedBalance = computedTotal - computedPending

        setBalance(toNumber(data.summary?.balance) || computedBalance)
        setTotalEarned(toNumber(data.summary?.totalEarned) || computedTotal)
        setPending(toNumber(data.summary?.pending) || computedPending)
      } catch {
        if (alive) setToast('Something went wrong. Please try again.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void loadEarnings()
    return () => {
      alive = false
    }
  }, [authChecking])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const status = (row.status || '').toUpperCase()
      const matchStatus = statusFilter === 'ALL' || status === statusFilter
      const matchOffer =
        !offerFilter.trim() ||
        (row.offerName || row.offer || '').toLowerCase().includes(offerFilter.toLowerCase())

      const rowDate = new Date(row.date || '').getTime()
      const fromOk = !dateFrom || rowDate >= new Date(dateFrom).getTime()
      const toOk = !dateTo || rowDate <= new Date(dateTo).getTime() + 86400000 - 1
      return matchStatus && matchOffer && fromOk && toOk
    })
  }, [rows, statusFilter, offerFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
  const pageRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-[#4F46E5]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-brand-textPrimary">
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <h1 className="text-3xl font-extrabold">Earnings</h1>

        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-textMuted">Balance</p>
            <p className="mt-1 text-2xl font-bold">Rs {balance.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-textMuted">Total Earned</p>
            <p className="mt-1 text-2xl font-bold">Rs {totalEarned.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-4">
            <p className="text-xs text-brand-textMuted">Pending</p>
            <p className="mt-1 text-2xl font-bold">Rs {pending.toFixed(2)}</p>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="CLICKED">CLICKED</option>
              <option value="CONVERTED">CONVERTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <input
              value={offerFilter}
              onChange={(e) => setOfferFilter(e.target.value)}
              placeholder="Filter by offer"
              className="rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-[#1F2937]">
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Offer</th>
                  <th className="px-2 py-2">Click ID</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Payout</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-brand-border">
                      <td className="px-2 py-3"><div className="h-4 w-24 animate-pulse rounded bg-white border border-brand-border shadow-sm" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-28 animate-pulse rounded bg-white border border-brand-border shadow-sm" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-20 animate-pulse rounded bg-white border border-brand-border shadow-sm" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-16 animate-pulse rounded bg-white border border-brand-border shadow-sm" /></td>
                      <td className="px-2 py-3"><div className="h-4 w-14 animate-pulse rounded bg-white border border-brand-border shadow-sm" /></td>
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-brand-textMuted">
                      No earnings records found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => (
                    <tr key={`${row.id ?? idx}`} className="border-b border-brand-border">
                      <td className="px-2 py-3">{row.date ? new Date(row.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'No date'}</td>
                      <td className="px-2 py-3">{row.offerName || row.offer || '-'}</td>
                      <td className="px-2 py-3">{row.clickId || '-'}</td>
                      <td className="px-2 py-3">{(row.status || '').toUpperCase()}</td>
                      <td className="px-2 py-3">Rs {toNumber(row.payout ?? row.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden mt-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-28 rounded-2xl bg-gray-150 animate-pulse border border-brand-border" />
              ))
            ) : pageRows.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-brand-textMuted shadow-sm">
                No earnings records found.
              </div>
            ) : (
              pageRows.map((row, idx) => (
                <div
                  key={`${row.id ?? idx}`}
                  className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-xs text-gray-400 font-semibold">
                      {row.date ? new Date(row.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      (row.status || '').toUpperCase() === 'APPROVED' || (row.status || '').toUpperCase() === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                      (row.status || '').toUpperCase() === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-250' :
                      'bg-amber-50 text-amber-700 border border-amber-250'
                    }`}>
                      {(row.status || '').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Offer</p>
                      <h3 className="font-bold text-gray-800 text-sm mt-0.5">{row.offerName || row.offer || '-'}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-medium">Payout</p>
                      <p className="text-base font-bold text-emerald-600">Rs {toNumber(row.payout ?? row.amount).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-xs">
                    <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Click ID</p>
                    <p className="font-mono text-xs text-gray-650 break-all select-all leading-normal">{row.clickId || '-'}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <p>
              Rows per page: <strong>{rowsPerPage}</strong>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-brand-border px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}

