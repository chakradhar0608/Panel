'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type OfferOption = { id: number; name: string; events?: string }

type LogEntry = {
  id: number
  receivedAt: string
  rawUrl: string
  rawParams: string       // JSON string
  clickId: string | null
  eventName: string | null
  offerId: number | null
  offerName: string | null
  publisherId: number | null
  publisherName: string | null
  payout: number
  ipAddress: string | null
  status: 'PROCESSED' | 'DUPLICATE' | 'CLICK_NOT_FOUND' | 'LEAD_CUT' | 'ERROR'
  campLeadEventId: number | null
}

function formatIstDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value || '0000'
  const m = parts.find((p) => p.type === 'month')?.value || '01'
  const d = parts.find((p) => p.type === 'day')?.value || '01'
  return `${y}-${m}-${d}`
}
function getTodayISO() { return formatIstDateInput(new Date()) }
function getYesterdayISO() {
  const d = new Date(); d.setDate(d.getDate() - 1); return formatIstDateInput(d)
}

function formattedDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(dateStr))
}

function encodeEventValue(offerId: number, eventName: string) { return `${offerId}::${eventName}` }
function decodeEventValue(value: string) {
  const sep = value.indexOf('::'); return sep >= 0 ? value.slice(sep + 2) : value
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PROCESSED:       { label: 'Processed',       bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500'  },
  DUPLICATE:       { label: 'Duplicate',        bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'     },
  CLICK_NOT_FOUND: { label: 'Click Not Found',  bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'      },
  LEAD_CUT:        { label: 'Lead Cut',         bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400'    },
  ERROR:           { label: 'Error',            bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'     },
}

function StatusBadge({ status }: { status: LogEntry['status'] }) {
  const m = STATUS_META[status] || STATUS_META.ERROR
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg ${m.bg} px-2.5 py-1 text-xs font-bold ${m.text} border border-black/5 uppercase`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

function MultiSelectDropdown({
  label, options, selectedValues, onChange, allLabel = 'All', disabled = false,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selectedValues: string[]
  onChange: (values: string[]) => void
  allLabel?: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const isAllSelected = selectedValues.length === 0
  const toggle = (val: string) => {
    if (val === 'All') { onChange([]); return }
    onChange(selectedValues.includes(val) ? selectedValues.filter((v) => v !== val) : [...selectedValues, val])
  }

  const displayText = useMemo(() => {
    if (isAllSelected) return allLabel
    if (selectedValues.length === 1) return options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
    return `${selectedValues.length} Selected`
  }, [selectedValues, options, isAllSelected, allLabel])

  return (
    <div className={`relative flex flex-col gap-1 ${isOpen ? 'z-30' : 'z-20'}`} ref={ref}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-left text-gray-800 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate pr-2">{disabled ? 'Select an offer first' : displayText}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-[calc(100%+0.25rem)] left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-150 bg-white shadow-xl p-2 space-y-0.5 animate-in fade-in duration-100">
          <button type="button" onClick={() => toggle('All')} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition text-sm text-left font-bold text-blue-600 focus:outline-none">
            <input type="checkbox" readOnly checked={isAllSelected} className="h-4 w-4 rounded border-gray-300 text-blue-600 pointer-events-none" />
            <span>{allLabel}</span>
          </button>
          <div className="h-px bg-gray-100 my-1 mx-2" />
          {options.length === 0
            ? <p className="p-2.5 text-xs text-gray-400 text-center">No options available</p>
            : options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition text-sm text-left focus:outline-none">
                <input type="checkbox" readOnly checked={selectedValues.includes(opt.value)} className="h-4 w-4 rounded border-gray-300 text-blue-600 pointer-events-none" />
                <span className="text-gray-700 font-medium truncate pointer-events-none">{opt.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export default function PostbacksReceivedPage() {
  const [offers, setOffers] = useState<OfferOption[]>([])

  // Draft filter state
  const [draftOfferIds, setDraftOfferIds] = useState<number[]>([])
  const [draftEventValues, setDraftEventValues] = useState<string[]>([])
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [draftStatus, setDraftStatus] = useState('All')
  const [draftSearch, setDraftSearch] = useState('')

  // Applied filter state
  const [filtersApplied, setFiltersApplied] = useState(false)
  const [appliedParams, setAppliedParams] = useState({
    offerIds: [] as number[], eventNames: [] as string[],
    dateFrom: '', dateTo: '', status: 'All', search: '',
  })

  // Results
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [openFilters, setOpenFilters] = useState(true)

  useEffect(() => {
    fetch('/api/admin/postbacks-received?offerList=true', { cache: 'no-store' })
      .then((r) => r.json()).then((d) => setOffers(d.offers || [])).catch(() => {})
  }, [])

  const eventsByOffer = useMemo(() => {
    if (draftOfferIds.length === 0) return []
    return offers
      .filter((o) => draftOfferIds.includes(o.id))
      .map((offer) => ({
        offerId: offer.id, offerName: offer.name,
        events: parseOfferEvents(offer.events).events.map((e) => e.displayName || e.name || '').filter(Boolean),
      }))
      .filter((g) => g.events.length > 0)
  }, [offers, draftOfferIds])

  const availableEventValues = useMemo(
    () => Array.from(new Set(eventsByOffer.flatMap((g) => g.events.map((name) => encodeEventValue(g.offerId, name))))),
    [eventsByOffer]
  )
  useEffect(() => {
    setDraftEventValues((curr) => curr.filter((v) => availableEventValues.includes(v)))
  }, [availableEventValues])

  const { dateFrom, dateTo } = useMemo(() => {
    if (dateMode === 'today') return { dateFrom: getTodayISO(), dateTo: getTodayISO() }
    if (dateMode === 'yesterday') return { dateFrom: getYesterdayISO(), dateTo: getYesterdayISO() }
    return { dateFrom: customFrom, dateTo: customTo }
  }, [dateMode, customFrom, customTo])

  const offerOptions = useMemo(() => offers.map((o) => ({ value: String(o.id), label: `${o.name} (#${o.id})` })), [offers])
  const eventOptions = useMemo(() =>
    eventsByOffer.flatMap((g) => g.events.map((name) => ({ value: encodeEventValue(g.offerId, name), label: `${name} (${g.offerName})` }))),
    [eventsByOffer]
  )

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true); setError('')
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (appliedParams.dateFrom) params.set('dateFrom', appliedParams.dateFrom)
      if (appliedParams.dateTo) params.set('dateTo', appliedParams.dateTo)
      if (appliedParams.status !== 'All') params.set('status', appliedParams.status)
      if (appliedParams.search) params.set('search', appliedParams.search)
      if (appliedParams.offerIds.length > 0) params.set('offerIds', appliedParams.offerIds.join(','))
      if (appliedParams.eventNames.length > 0) params.set('eventNames', appliedParams.eventNames.join(','))
      const res = await fetch(`/api/admin/postbacks-received?${params}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [page, appliedParams])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  const applyFilters = () => {
    setAppliedParams({
      offerIds: draftOfferIds.length > 0 ? draftOfferIds : offers.map((o) => o.id),
      eventNames: draftEventValues.length > 0 ? Array.from(new Set(draftEventValues.map(decodeEventValue))) : [],
      dateFrom,
      dateTo,
      status: draftStatus,
      search: draftSearch.trim(),
    })
    setFiltersApplied(true)
    setPage(1)
  }

  const resetFilters = () => {
    setDraftOfferIds([]); setDraftEventValues([])
    setDateMode('today'); setCustomFrom(''); setCustomTo('')
    setDraftStatus('All'); setDraftSearch('')
    setAppliedParams({ offerIds: [], eventNames: [], dateFrom: '', dateTo: '', status: 'All', search: '' })
    setFiltersApplied(false); setPage(1)
  }

  const currentDateLabel = useMemo(() => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), [])

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden" style={{ background: 'linear-gradient(to right, #0F766E, #0D9488, #14B8A6)' }}>
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-lg pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">AFFILIATE TRACKING</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">Postbacks Received</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">Every postback fired by affiliate networks — URL, offer, event, and outcome</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-1.5 border border-white/10 text-xs font-bold shadow-sm backdrop-blur-md">
            <span>{total.toLocaleString()} Postbacks</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-visible">
        <button className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setOpenFilters((v) => !v)}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-extrabold text-gray-800 text-sm">Filter Postbacks</span>
            <span className="rounded-full bg-gray-100/80 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{currentDateLabel}</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {openFilters && (
          <div className="border-t border-brand-border p-5 space-y-5 bg-gray-50/30">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

              {/* Offer */}
              <MultiSelectDropdown
                label="OFFER"
                options={offerOptions}
                selectedValues={draftOfferIds.map(String)}
                onChange={(vals) => {
                  const ids = vals.map(Number)
                  setDraftOfferIds(ids)
                  const valid = offers.filter((o) => ids.includes(o.id))
                    .flatMap((o) => parseOfferEvents(o.events).events.map((e) => e.displayName || e.name || '').filter(Boolean).map((n) => encodeEventValue(o.id, n)))
                  setDraftEventValues((curr) => curr.filter((v) => valid.includes(v)))
                }}
                allLabel="All Offers"
              />

              {/* Event (cascades from offer) */}
              <MultiSelectDropdown
                label="EVENT"
                options={eventOptions}
                selectedValues={draftEventValues}
                onChange={setDraftEventValues}
                allLabel="All Events"
                disabled={draftOfferIds.length === 0}
              />

              {/* Date mode */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date Range</span>
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-0.5 bg-white">
                  {(['today', 'yesterday', 'custom'] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setDateMode(mode)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-all ${dateMode === mode ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {dateMode === 'custom' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FROM</span>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TO</span>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs" />
                  </div>
                </>
              )}

              {/* Status */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs">
                  <option value="All">All</option>
                  <option value="PROCESSED">Processed</option>
                  <option value="DUPLICATE">Duplicate</option>
                  <option value="CLICK_NOT_FOUND">Click Not Found</option>
                  <option value="LEAD_CUT">Lead Cut</option>
                  <option value="ERROR">Error</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Search Click ID</span>
                <input type="text" placeholder="e.g. click_id_123" value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 placeholder:text-gray-400 shadow-xs" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-150">
              <button onClick={applyFilters}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition flex items-center gap-1.5 cursor-pointer">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Apply Filters
              </button>
              <button type="button" onClick={resetFilters}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition cursor-pointer">
                Reset All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-600" />
              <p className="text-sm font-semibold text-brand-textMuted">Loading postbacks...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center bg-red-50/50">
              <p className="font-semibold text-red-600">{error}</p>
              <button onClick={fetchLogs} className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition">Try Again</button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm font-bold text-gray-800">No postbacks found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-5 py-4 text-left">Received At</th>
                      <th className="px-5 py-4 text-left">Offer / Event</th>
                      <th className="px-5 py-4 text-left">Publisher</th>
                      <th className="px-5 py-4 text-left">Click ID</th>
                      <th className="px-5 py-4 text-left">Payout</th>
                      <th className="px-5 py-4 text-left">Status</th>
                      <th className="px-5 py-4 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{formattedDate(log.receivedAt)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-gray-800 text-sm">{log.offerName || '—'}</div>
                          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{log.eventName || '—'}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-700">{log.publisherName || '—'}</div>
                          {log.publisherId && <div className="text-[10px] text-gray-400">ID #{log.publisherId}</div>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-gray-600 max-w-[180px]">
                          <span className="truncate block" title={log.clickId || ''}>{log.clickId || '—'}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-semibold text-gray-700">
                          {log.payout > 0 ? `₹${Number(log.payout).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap"><StatusBadge status={log.status} /></td>
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <button onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition">
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100 bg-white">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">#{log.id}</span>
                      <span className="text-xs text-gray-500 font-semibold">{formattedDate(log.receivedAt)}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{log.offerName || '—'}</h3>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{log.eventName || '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{log.publisherName || '—'}</p>
                      </div>
                      <button onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex-shrink-0">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Inspect
                      </button>
                    </div>
                    <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                      <StatusBadge status={log.status} />
                      {log.payout > 0 && <span className="text-xs font-semibold text-gray-700">₹{Number(log.payout).toFixed(2)}</span>}
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Click ID</p>
                      <p className="font-mono text-xs text-gray-600 break-all">{log.clickId || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">
              <p className="text-xs font-semibold text-gray-500">
                Page <span className="font-bold text-gray-800">{page}</span> of{' '}
                <span className="font-bold text-gray-800">{totalPages}</span> ({total.toLocaleString()} records)
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
              </div>
            </div>
          )}
      </div>

      {/* Detail drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedLog(null)} />
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-800">Postback Details</h2>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Record #{selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Core info grid */}
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Received At</span>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{formattedDate(selectedLog.receivedAt)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Status</span>
                  <div className="mt-1"><StatusBadge status={selectedLog.status} /></div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Offer</span>
                  <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedLog.offerName || '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Event</span>
                  <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedLog.eventName || '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Publisher</span>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{selectedLog.publisherName || '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Payout</span>
                  <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedLog.payout > 0 ? `₹${Number(selectedLog.payout).toFixed(2)}` : '—'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">IP Address</span>
                  <p className="text-xs font-mono text-gray-600 mt-0.5">{selectedLog.ipAddress || '—'}</p>
                </div>
                {selectedLog.campLeadEventId && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Conversion ID</span>
                    <p className="text-xs font-mono text-gray-600 mt-0.5">#{selectedLog.campLeadEventId}</p>
                  </div>
                )}
              </div>

              {/* Click ID */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Click ID</h3>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 break-all">
                  {selectedLog.clickId || '—'}
                </div>
              </div>

              {/* Raw URL */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Raw URL Received</h3>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 break-all whitespace-pre-wrap leading-relaxed">
                  {selectedLog.rawUrl || '—'}
                </div>
              </div>

              {/* All params */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">All Parameters</h3>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedLog.rawParams || '{}')
                      const entries = Object.entries(parsed)
                      if (entries.length === 0) return <p className="text-xs text-gray-400">No parameters</p>
                      return entries.map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-gray-500 min-w-[80px] shrink-0">{k}</span>
                          <span className="font-mono text-gray-700 break-all">{String(v)}</span>
                        </div>
                      ))
                    } catch {
                      return <p className="text-xs text-gray-400 font-mono">{selectedLog.rawParams}</p>
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4">
              <button onClick={() => setSelectedLog(null)} className="w-full rounded-xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
