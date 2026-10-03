'use client'

import { useEffect, useMemo, useState } from 'react'

type OfferRequest = {
  id: number
  publisherId: number
  offerId: number
  status: string
  requestedAt?: string
  approvedAt?: string | null
  publisher?: { id: number; name?: string; email?: string } | null
  offer?: { id: number; name?: string; category?: string | null } | null
}

type Offer = {
  id: number
  name: string
  category?: string | null
  status?: string
}

type StatusTab = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_CONFIG: Record<StatusTab, { label: string; color: string; dot: string }> = {
  ALL: { label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || 'PENDING') as StatusTab
  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {s}
    </span>
  )
}

export default function AdminOfferRequestsPage() {
  const [rows, setRows] = useState<OfferRequest[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [openFilters, setOpenFilters] = useState(true)

  // Filters
  const [emailSearch, setEmailSearch] = useState('')
  const [selectedOfferId, setSelectedOfferId] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const [reqRes, offersRes] = await Promise.all([
        fetch('/api/admin/offer-requests', { cache: 'no-store' }),
        fetch('/api/admin/offers', { cache: 'no-store' }),
      ])
      const reqJson = await reqRes.json()
      const offersJson = await offersRes.json()
      setRows(reqJson.requests || [])
      setOffers((offersJson.offers || []).filter((o: Offer) => o.status !== 'DELETED'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // Filtered rows
  const filteredRows = useMemo(() => {
    const emailQ = emailSearch.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (emailQ && !(row.publisher?.email || '').toLowerCase().includes(emailQ)) return false
        if (selectedOfferId !== 'ALL' && String(row.offerId) !== selectedOfferId) return false
        if (activeTab !== 'ALL' && (row.status || 'PENDING') !== activeTab) return false
        return true
      })
      .sort((a, b) => b.id - a.id)
  }, [rows, emailSearch, selectedOfferId, activeTab])

  // Counts (respecting email + offer filters but ignoring tab)
  const counts = useMemo(() => {
    const emailQ = emailSearch.trim().toLowerCase()
    const base = rows.filter((row) => {
      if (emailQ && !(row.publisher?.email || '').toLowerCase().includes(emailQ)) return false
      if (selectedOfferId !== 'ALL' && String(row.offerId) !== selectedOfferId) return false
      return true
    })
    return {
      ALL: base.length,
      PENDING: base.filter((r) => (r.status || 'PENDING') === 'PENDING').length,
      APPROVED: base.filter((r) => r.status === 'APPROVED').length,
      REJECTED: base.filter((r) => r.status === 'REJECTED').length,
    }
  }, [rows, emailSearch, selectedOfferId])

  const updateStatus = async (row: OfferRequest, nextStatus: 'APPROVED' | 'REJECTED') => {
    await fetch(`/api/admin/publishers/${row.publisherId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: row.offerId, offerStatus: nextStatus }),
    })
    await load()
  }

  const activeFiltersCount = [
    emailSearch.trim() !== '',
    selectedOfferId !== 'ALL',
    activeTab !== 'ALL',
  ].filter(Boolean).length

  const clearFilters = () => {
    setEmailSearch('')
    setSelectedOfferId('ALL')
    setActiveTab('ALL')
  }

  const TABS: StatusTab[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #4F46E5, #6366F1, #8B5CF6)' }}
      >
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-lg pointer-events-none" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">ADMIN CONTROLS</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 tracking-tight">Offer Requests</h1>
            <p className="text-xs text-white/85 mt-1 font-medium">Approve or reject publisher access to campaigns</p>
          </div>
          {/* Quick stat pills */}
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase text-white/70">Pending</p>
              <p className="text-lg font-extrabold text-white leading-none">{counts.PENDING}</p>
            </div>
            <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase text-white/70">Approved</p>
              <p className="text-lg font-extrabold text-white leading-none">{counts.APPROVED}</p>
            </div>
            <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase text-white/70">Rejected</p>
              <p className="text-lg font-extrabold text-white leading-none">{counts.REJECTED}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-brand-textPrimary hover:bg-gray-50/50 transition cursor-pointer"
          onClick={() => setOpenFilters((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-extrabold text-gray-800 text-sm">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFilters() }}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
              >
                Clear all
              </button>
            )}
            <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {openFilters && (
          <div className="border-t border-brand-border p-5 bg-gray-50/30 space-y-4">
            {/* Row 1: Email + Offer */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Publisher Email Search */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Publisher Email</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    placeholder="Search by publisher email..."
                    className="w-full rounded-xl border border-brand-border bg-white pl-9 pr-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                  />
                  {emailSearch && (
                    <button
                      onClick={() => setEmailSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Offer Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Filter by Offer</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <select
                    value={selectedOfferId}
                    onChange={(e) => setSelectedOfferId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-brand-border bg-white pl-9 pr-8 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                  >
                    <option value="ALL">All Offers</option>
                    {offers.map((offer) => (
                      <option key={offer.id} value={String(offer.id)}>
                        {offer.name}{offer.category ? ` · ${offer.category}` : ''}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Row 2: Status Tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</label>
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                  const cfg = STATUS_CONFIG[tab]
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? tab === 'ALL'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : `${cfg.color} border-current shadow-sm`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tab !== 'ALL' && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? cfg.dot : 'bg-gray-400'}`} />}
                      {cfg.label}
                      <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-white/25 text-inherit' : 'bg-gray-100 text-gray-500'}`}>
                        {counts[tab]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="border-b border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-gray-50/40">
          <div>
            <h2 className="font-extrabold text-gray-800 text-sm">
              {activeTab === 'ALL' ? 'All Requests' : `${STATUS_CONFIG[activeTab].label} Requests`}
              {selectedOfferId !== 'ALL' && (
                <span className="ml-2 font-semibold text-indigo-600 text-xs">
                  — {offers.find((o) => String(o.id) === selectedOfferId)?.name}
                </span>
              )}
            </h2>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}
              {emailSearch && <span> for <span className="text-indigo-600 font-bold">{emailSearch}</span></span>}
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/50 text-xs uppercase text-brand-textMuted border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Publisher</th>
                <th className="px-4 py-3 text-left font-bold">Offer</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
                <th className="px-4 py-3 text-left font-bold">Date</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td className="px-4 py-16 text-center" colSpan={5}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-400">No requests match your filters</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredRows.map((row) => {
                const status = (row.status || 'PENDING') as StatusTab
                return (
                  <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-xs">{row.publisher?.name || `Publisher #${row.publisherId}`}</p>
                      <p className="text-[10px] text-indigo-500 font-medium mt-0.5">{row.publisher?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-xs">{row.offer?.name || `Offer #${row.offerId}`}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{row.offer?.category || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {status === 'APPROVED' && row.approvedAt
                        ? new Date(row.approvedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : row.requestedAt
                          ? new Date(row.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {status !== 'APPROVED' && (
                          <button
                            onClick={() => void updateStatus(row, 'APPROVED')}
                            className="rounded-xl border border-green-200 bg-green-50 px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-100 hover:border-green-300 transition cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {status !== 'REJECTED' && (
                          <button
                            onClick={() => void updateStatus(row, 'REJECTED')}
                            className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100 hover:border-red-300 transition cursor-pointer"
                          >
                            {status === 'APPROVED' ? 'Suspend' : 'Reject'}
                          </button>
                        )}
                        {status === 'REJECTED' && (
                          <span className="text-[10px] font-medium text-gray-400 px-2 py-1.5">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          {loading && (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          )}
          {!loading && filteredRows.length === 0 && (
            <div className="py-16 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-semibold text-gray-400">No requests match your filters</p>
            </div>
          )}
          {!loading && filteredRows.length > 0 && (
            <div className="space-y-3 p-4">
              {filteredRows.map((row) => {
                const status = (row.status || 'PENDING') as StatusTab
                return (
                  <div key={row.id} className="bg-white rounded-xl border border-brand-border shadow-xs overflow-hidden">
                    {/* Card top: publisher + status */}
                    <div className="flex items-start justify-between px-4 pt-3.5 pb-3 border-b border-gray-100">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-gray-800 text-xs truncate">{row.publisher?.name || `Publisher #${row.publisherId}`}</p>
                        <p className="text-[10px] text-indigo-500 font-semibold mt-0.5 truncate">{row.publisher?.email || '—'}</p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    {/* Card body */}
                    <div className="px-4 py-3 space-y-1.5 bg-gray-50/30">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-400 font-medium shrink-0">Offer:</span>
                        <span className="font-bold text-gray-800 truncate">{row.offer?.name || `Offer #${row.offerId}`}</span>
                        {row.offer?.category && (
                          <span className="rounded-full bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 shrink-0">{row.offer.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-400 font-medium shrink-0">
                          {status === 'APPROVED' ? 'Approved:' : 'Requested:'}
                        </span>
                        <span className="text-gray-600 font-medium text-[11px]">
                          {status === 'APPROVED' && row.approvedAt
                            ? new Date(row.approvedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : row.requestedAt
                              ? new Date(row.requestedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                        </span>
                      </div>
                    </div>
                    {/* Card actions */}
                    <div className="flex gap-2 px-4 py-3 justify-end border-t border-gray-100 bg-white">
                      {status !== 'APPROVED' && (
                        <button
                          onClick={() => void updateStatus(row, 'APPROVED')}
                          className="flex-1 rounded-xl border border-green-200 bg-green-50 py-2 text-xs font-bold text-green-700 hover:bg-green-100 transition cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                      )}
                      {status !== 'REJECTED' && (
                        <button
                          onClick={() => void updateStatus(row, 'REJECTED')}
                          className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        >
                          {status === 'APPROVED' ? '⊘ Suspend' : '✕ Reject'}
                        </button>
                      )}
                      {status === 'REJECTED' && (
                        <span className="flex-1 text-center text-[10px] font-medium text-gray-400 py-2">No actions available</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
