'use client'

import { useEffect, useMemo, useState } from 'react'

type Lead = {
  id: number
  offerName: string
  offerId: number
  eventName: string | null
  clickId: string
  mobileNumber: string | null
  payout: number
  status: string
  clickedAt: string
  convertedAt: string | null
  approvedAt: string | null
  userUpi: string | null
  ipAddress: string | null
  device: string | null
  browser: string | null
  location: string | null
  p2: string | null
  p3: string | null
  p4: string | null
  p5: string | null
  sub1: string | null
  sub2: string | null
  sub3: string | null
  sub4: string | null
  sub5: string | null
  postbackSent: boolean
  postbackSentAt: string | null
  postbackResponse: string | null
}

type OfferOption = {
  id: number
  name: string
  approvalStatus: string
}

type ResponseShape = {
  leads: Lead[]
  total: number
  page: number
  limit: number
  stats: {
    totalClicks: number
  }
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'Custom', value: 'custom' },
] as const

type DatePreset = typeof DATE_PRESETS[number]['value']

function getPresetRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

  if (preset === 'today') { const t = fmt(now); return { dateFrom: t, dateTo: t } }
  if (preset === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1); const t = fmt(d); return { dateFrom: t, dateTo: t }
  }
  if (preset === 'last7') {
    const d = new Date(now); d.setDate(d.getDate() - 6); return { dateFrom: fmt(d), dateTo: fmt(now) }
  }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: fmt(from), dateTo: fmt(now) }
  }
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)
    return { dateFrom: fmt(from), dateTo: fmt(to) }
  }
  return { dateFrom: '', dateTo: '' }
}

export default function PartnerClicksPage() {
  const [data, setData] = useState<ResponseShape | null>(null)
  const [offers, setOffers] = useState<OfferOption[]>([])
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<Lead | null>(null)
  const [openFilters, setOpenFilters] = useState(true)

  // Filters State
  const [status, setStatus] = useState('All')
  const [offerId, setOfferId] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)

  // Applied Query States (committed on Apply)
  const [appliedStatus, setAppliedStatus] = useState('All')
  const [appliedOfferId, setAppliedOfferId] = useState('')
  const [appliedDatePreset, setAppliedDatePreset] = useState<DatePreset>('thisMonth')
  const [appliedCustomFrom, setAppliedCustomFrom] = useState('')
  const [appliedCustomTo, setAppliedCustomTo] = useState('')

  // Date picker range default values
  useEffect(() => {
    const range = getPresetRange('thisMonth')
    setCustomFrom(range.dateFrom)
    setCustomTo(range.dateTo)
    setAppliedCustomFrom(range.dateFrom)
    setAppliedCustomTo(range.dateTo)
  }, [])

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (appliedStatus && appliedStatus !== 'All') params.set('status', appliedStatus)
    if (appliedOfferId) params.set('offerId', appliedOfferId)
    if (appliedCustomFrom) params.set('dateFrom', appliedCustomFrom)
    if (appliedCustomTo) params.set('dateTo', appliedCustomTo)
    return params.toString()
  }, [appliedStatus, appliedOfferId, appliedCustomFrom, appliedCustomTo, page])

  const loadOffers = async () => {
    try {
      const res = await fetch('/api/partner/offers?approvedOnly=true', { cache: 'no-store' })
      const json = await res.json()
      const list = Array.isArray(json) ? json : Array.isArray(json.offers) ? json.offers : []
      setOffers(list.filter((o: any) => o.approvalStatus === 'APPROVED'))
    } catch (e) {
      console.error('Failed to load offers dropdown filter', e)
    }
  }

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/partner/clicks?${query}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load clicks data')
      const json = (await res.json()) as ResponseShape
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOffers()
  }, [])

  useEffect(() => {
    void load()
  }, [query])

  const applyFilters = () => {
    setAppliedStatus(status)
    setAppliedOfferId(offerId)
    setAppliedDatePreset(datePreset)
    setAppliedCustomFrom(customFrom)
    setAppliedCustomTo(customTo)
    setPage(1)
  }

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset)
    const range = getPresetRange(preset)
    setCustomFrom(range.dateFrom)
    setCustomTo(range.dateTo)
  }

  const resetFilters = () => {
    setStatus('All')
    setOfferId('')
    setDatePreset('thisMonth')
    const range = getPresetRange('thisMonth')
    setCustomFrom(range.dateFrom)
    setCustomTo(range.dateTo)

    setAppliedStatus('All')
    setAppliedOfferId('')
    setAppliedDatePreset('thisMonth')
    setAppliedCustomFrom(range.dateFrom)
    setAppliedCustomTo(range.dateTo)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 20)))
  const currentDateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }, [])

  return (
    <div className="space-y-4">
      {/* 1. Header Gradient Banner Card */}
      <div
        className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #4F46E5, #6366F1, #8B5CF6)' }}
      >
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-lg pointer-events-none" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">CLICKS ANALYTICS</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">My Clicks</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">Track and manage your click logs</p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {/* Total Clicks Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>{data?.stats.totalClicks || 0} Total Clicks</span>
            </div>

            {/* Time Stamp Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} IST</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metrics Status Card */}
      <div className="max-w-md">
        <div className="rounded-2xl bg-white border border-gray-150 border-t-4 border-t-blue-500 p-5 shadow-sm flex items-center gap-4 transition hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner flex-shrink-0">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TOTAL CLICKS</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{data?.stats.totalClicks || 0}</p>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Filters Form Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        {/* Toggle Bar */}
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-brand-textPrimary hover:bg-gray-50/50 transition cursor-pointer"
          onClick={() => setOpenFilters((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-4.5 w-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-extrabold text-gray-800 text-sm">Filter Clicks</span>
            <span className="rounded-full bg-gray-100/80 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{currentDateLabel}</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter inputs container */}
        {openFilters && (
          <div className="border-t border-brand-border p-5 space-y-4 bg-gray-50/30">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {/* STATUS */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">STATUS</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="All">All</option>
                  <option value="CLICKED">Clicked</option>
                </select>
              </div>

              {/* OFFER SELECT DROPDOWN */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">OFFER</label>
                <select
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="">All Offers</option>
                  {offers.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.name} (#{o.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* FROM DATE */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FROM</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setDatePreset('custom') }}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                />
              </div>

              {/* TO DATE */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TO</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setDatePreset('custom') }}
                  className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                />
              </div>
            </div>

            {/* Action Buttons row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-150">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={applyFilters}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Apply
                </button>
              </div>

              {/* Date Presets quick filters */}
              <div className="flex flex-wrap gap-1.5">
                {(['today', 'last7', 'thisMonth'] as const).map((p) => {
                  const label = p === 'today' ? 'Today' : p === 'last7' ? '7 Days' : 'This Month'
                  const active = datePreset === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold border transition ${
                        active
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Results Table with responsive scroll */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex items-center justify-between">
          <p className="font-extrabold text-sm text-gray-800">Results</p>
        </div>

        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-150 text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left">ID</th>
                <th className="px-5 py-3 text-left">Offer Details</th>
                <th className="px-5 py-3 text-left">Click Details</th>
                <th className="px-5 py-3 text-left">Datetime (IST)</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                      Loading Click logs...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && (data?.leads || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 shadow-inner mb-4">
                      <svg className="h-8 w-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-800">No clicks found</p>
                    <p className="text-xs text-gray-400 mt-1">No clicks recorded matching this query.</p>
                  </td>
                </tr>
              )}

              {!loading && (data?.leads || []).map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-400 font-semibold">
                    #{lead.id}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center font-bold rounded-lg text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100">
                        ID-{lead.offerId}
                      </span>
                      <span className="font-extrabold text-gray-800">{lead.offerName}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{lead.eventName || 'Default Event'}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="font-mono text-xs text-gray-600 font-medium">{lead.clickId.slice(0, 20)}...</p>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-gray-400 font-semibold mt-1">
                      {lead.p1 && <span>P1: {lead.p1}</span>}
                      {lead.p2 && <span>P2: {lead.p2}</span>}
                      {lead.p3 && <span>P3: {lead.p3}</span>}
                      {lead.p4 && <span>P4: {lead.p4}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs">
                    {lead.clickedAt ? (
                      <>
                        <p className="font-bold text-gray-800">
                          {new Date(lead.clickedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                          {new Date(lead.clickedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => setDrawer(lead)}
                      className="inline-flex items-center gap-1 rounded-xl border border-gray-250 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                    >
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-gray-100 bg-white">
          {loading && (
            <div className="px-5 py-8 text-center text-xs text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                Loading Click logs...
              </div>
            </div>
          )}

          {!loading && (data?.leads || []).length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 shadow-inner mb-4">
                <svg className="h-8 w-8 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-800">No clicks found</p>
              <p className="text-xs text-gray-400 mt-1">No clicks recorded matching this query.</p>
            </div>
          )}

          {!loading && (data?.leads || []).map((lead) => (
            <div key={lead.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">#{lead.id}</span>
                <span className="text-xs font-semibold text-gray-800">
                  {lead.clickedAt ? (
                    new Date(lead.clickedAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  ) : (
                    '-'
                  )}
                </span>
              </div>

              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center font-bold rounded bg-purple-50 text-purple-700 border border-purple-100 text-[10px] px-1.5 py-0.5">
                      ID-{lead.offerId}
                    </span>
                    <span className="font-bold text-gray-800 text-sm">{lead.offerName}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{lead.eventName || 'Default Event'}</p>
                </div>
                
                <button
                  onClick={() => setDrawer(lead)}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-250 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition flex-shrink-0"
                >
                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1">
                <p className="text-[10px] text-gray-400 font-medium uppercase">Click Token</p>
                <p className="font-mono text-xs text-gray-600 break-all select-all">{lead.clickId}</p>
                {(lead.p1 || lead.p2 || lead.p3 || lead.p4) && (
                  <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-gray-400 font-semibold mt-1.5 pt-1.5 border-t border-gray-200/50">
                    {lead.p1 && <span>P1: {lead.p1}</span>}
                    {lead.p2 && <span>P2: {lead.p2}</span>}
                    {lead.p3 && <span>P3: {lead.p3}</span>}
                    {lead.p4 && <span>P4: {lead.p4}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">
            <p className="text-xs font-semibold text-gray-500">
              Showing page <span className="font-bold text-gray-800">{page}</span> of{' '}
              <span className="font-bold text-gray-800">{totalPages}</span> ({data?.total || 0} clicks)
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

      {/* 5. Click Drawer Modal */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawer(null)}
          />

          {/* Drawer container */}
          <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-800">Click Inspection</h2>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Click log ID: #{drawer.id}</p>
              </div>
              <button
                onClick={() => setDrawer(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Click Status badge */}
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Status</span>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100 uppercase">
                    {drawer.status}
                  </span>
                </div>
              </div>

              {/* Offer Info */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">Offer Information</p>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Offer Name</span>
                    <p className="text-gray-800 mt-0.5">{drawer.offerName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Offer ID</span>
                    <p className="text-gray-800 mt-0.5">#{drawer.offerId}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Event Trigger</span>
                    <p className="text-gray-800 mt-0.5">{drawer.eventName || 'Default Event'}</p>
                  </div>
                </div>
              </div>

              {/* Click Info */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">Click Info</p>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Click ID (Click token)</span>
                    <p className="font-mono text-[11px] text-gray-700 break-all bg-white border border-gray-200 rounded px-2.5 py-1.5 mt-1 select-all shadow-xs leading-relaxed">
                      {drawer.clickId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">IP Address</span>
                      <p className="text-gray-800 mt-0.5">{drawer.ipAddress || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Country / Location</span>
                      <p className="text-gray-800 mt-0.5">{drawer.location || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User credentials */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">User Details</p>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Mobile Number</span>
                    <p className="text-gray-800 mt-0.5">{drawer.mobileNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">User UPI ID</span>
                    <p className="text-gray-800 mt-0.5">{drawer.userUpi || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Tracking Parameters */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">Tracking Parameters</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">P1</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.p1 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">P2</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.p2 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">P3</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.p3 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">P4</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.p4 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">P5</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.p5 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Sub 1</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.sub1 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Sub 2</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.sub2 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Sub 3</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.sub3 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Sub 4</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.sub4 || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Sub 5</span>
                    <p className="text-gray-800 mt-0.5 break-all">{drawer.sub5 || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Device and Browser */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">Device & Browser</p>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Device</span>
                    <p className="text-gray-800 mt-0.5">{drawer.device || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Browser</span>
                    <p className="text-gray-800 mt-0.5">{drawer.browser || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Webhook Postback callback info */}
              <div className="rounded-xl border border-gray-150 bg-gray-50 p-4 space-y-3.5 shadow-inner">
                <p className="text-xs font-black text-gray-800 tracking-tight uppercase border-b border-gray-200 pb-1.5">Postback Callback Trigger</p>
                <div className="space-y-3 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Postback Status</span>
                      <p className="text-gray-800 mt-0.5">{drawer.postbackSent ? 'Sent Successfully' : 'Not Sent / Trigger Skipped'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Sent At Timing</span>
                      <p className="text-gray-800 mt-0.5">
                        {drawer.postbackSentAt
                          ? new Date(drawer.postbackSentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Webhook HTTP Callback Response</span>
                    <pre className="mt-1 overflow-x-auto rounded border border-gray-200 bg-white p-2.5 font-mono text-[10px] text-gray-700 leading-normal break-all whitespace-pre-wrap">
                      {drawer.postbackResponse || '-'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4">
              <button
                onClick={() => setDrawer(null)}
                className="w-full rounded-xl border border-gray-250 bg-white py-3 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
