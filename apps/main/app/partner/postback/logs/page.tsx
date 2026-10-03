'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

type LogEntry = {
  id: number
  clickId: string
  eventName: string
  offerName: string
  payout: number
  status: string
  postbackSent: boolean
  postbackSentAt: string | null
  postbackResponse: string | null
  deliveryStatus: 'SUCCESS' | 'FAILED' | 'PENDING'
  createdAt: string
}

type APIResponse = {
  logs: LogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
  error?: string
}

const deliveryBadge = (status: LogEntry['deliveryStatus']) => {
  switch (status) {
    case 'SUCCESS':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Success
        </span>
      )
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 border border-red-100 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Pending
        </span>
      )
  }
}

const formattedDate = (dateStr: string) => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr))
}

export default function PostbackLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All') // All, Success, Failed, Pending
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  // Applied values (committed on search or filter change)
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedStatusFilter, setAppliedStatusFilter] = useState('All')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search: appliedSearch,
        status: appliedStatusFilter,
      })

      const res = await fetch(`/api/partner/postback/logs?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to fetch postback logs')
      }
      const data = (await res.json()) as APIResponse
      if (data.error) {
        throw new Error(data.error)
      }

      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs()
  }, [page, appliedSearch, appliedStatusFilter])

  const handleApplyFilters = () => {
    setAppliedSearch(search.trim())
    setAppliedStatusFilter(statusFilter)
    setPage(1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setAppliedSearch('')
    setAppliedStatusFilter('All')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div
        className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #4F46E5, #6366F1, #8B5CF6)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">CALLBACK SYSTEM</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">Postback Logs</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">Monitor your API webhook triggers and delivery statuses</p>
          
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-1.5 border border-white/10 text-xs font-bold shadow-sm">
            <span>{total} Total Triggers</span>
          </div>
        </div>
      </div>

      {/* 2. Search and Filters */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
          {/* Click ID Search */}
          <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SEARCH CLICK ID</label>
            <input
              type="text"
              placeholder="e.g. click_id_123"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 placeholder:text-gray-400 shadow-xs"
            />
          </div>

          {/* Delivery Status */}
          <div className="flex flex-col gap-1 col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">DELIVERY STATUS</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
            >
              <option value="All">All</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2 col-span-1 lg:col-span-1">
            <button
              onClick={handleApplyFilters}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Apply
            </button>
            <button
              onClick={handleResetFilters}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 3. Logs Table */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm font-semibold text-brand-textMuted flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-600" />
            Loading postback logs...
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 bg-red-50/50">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 transition"
            >
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 shadow-inner mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-800">No logs found</p>
            <p className="text-xs text-gray-400 mt-1">Try modifying your search query or filters.</p>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-4 text-left">Triggered At (IST)</th>
                  <th className="px-5 py-4 text-left">Offer & Event</th>
                  <th className="px-5 py-4 text-left">Click ID</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-left">Delivery</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                      {formattedDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-800">{log.offerName}</div>
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{log.eventName || 'Default'}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                      {log.clickId || '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase ${
                        log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        log.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {deliveryBadge(log.deliveryStatus)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-250 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-150 bg-white">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">Log #{log.id}</span>
                  <span className="text-xs text-gray-500 font-semibold">
                    {formattedDate(log.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{log.offerName}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{log.eventName || 'Default'}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-250 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition flex-shrink-0"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Inspect
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3 text-gray-650">
                  <div>
                    <p className="text-gray-400 font-medium">Status</p>
                    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase mt-1 ${
                      log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      log.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Delivery</p>
                    <div className="mt-1">{deliveryBadge(log.deliveryStatus)}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-xs">
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Click ID</p>
                  <p className="font-mono text-xs text-gray-650 break-all select-all leading-normal">{log.clickId || '-'}</p>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">
            <p className="text-xs font-semibold text-gray-500">
              Showing page <span className="font-bold text-gray-800">{page}</span> of{' '}
              <span className="font-bold text-gray-800">{totalPages}</span> ({total} logs)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Details Drawer (Side slide-out modal) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedLog(null)}
          />

          {/* Drawer container */}
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-800">Postback Delivery Details</h2>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Log ID: #{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Event details block */}
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Offer Name</span>
                    <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedLog.offerName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Event Triggered</span>
                    <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedLog.eventName || 'Default'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Click ID</span>
                    <p className="text-xs font-mono text-gray-600 mt-0.5">{selectedLog.clickId}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Earnings Payout</span>
                    <p className="text-sm font-extrabold text-gray-800 mt-0.5">₹{selectedLog.payout.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Status information block */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Delivery Status</h3>
                  <div className="mt-1.5">{deliveryBadge(selectedLog.deliveryStatus)}</div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Trigger Timing</h3>
                  <div className="mt-1 text-sm font-semibold text-gray-800">
                    {selectedLog.postbackSentAt ? formattedDate(selectedLog.postbackSentAt) : 'Not Attempted'}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">HTTP Webhook Response</h3>
                  <div className="mt-1.5 rounded-xl border border-gray-150 bg-gray-50 p-4 font-mono text-xs text-gray-700 whitespace-pre-wrap break-all shadow-inner leading-relaxed">
                    {selectedLog.postbackResponse || 'No HTTP response recorded. Webhook url might be empty or disabled.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full rounded-xl border border-gray-250 bg-white py-3 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}