'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type OfferOption = { id: number; name: string; events?: string }

type Lead = {
  id: number
  publisher: { id: number; name: string; email: string }
  camp: { id: number; campName: string; campSlug: string } | null
  offer: { id: number; name: string }
  eventName: string | null
  clickId: string
  mobileNumber: string | null
  payout: number
  status: string
  clickedAt: string | null
  convertedAt: string | null
  approvedAt: string | null
  userUpi: string | null
  ipAddress: string | null
  device: string | null
  sub1: string | null
  p2: string | null
  p3: string | null
  p4: string | null
  sub2: string | null
  sub3: string | null
  postbackSent: boolean
  postbackSentAt: string | null
  postbackResponse: string | null
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  CLICKED: { bg: '#F3F4F6', text: '#6B7280' },
  CONVERTED: { bg: '#DBEAFE', text: '#1E40AF' },
  APPROVED: { bg: '#D1FAE5', text: '#065F46' },
  PAID: { bg: '#EDE9FE', text: '#6D28D9' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  CUT: { bg: '#FEF3C7', text: '#92400E' },
}

function fmt(n: number) { return `₹${n.toFixed(2)}` }

function formatIstDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value || '0000'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  return `${year}-${month}-${day}`
}

function getTodayISO() { return formatIstDateInput(new Date()) }
function getYesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatIstDateInput(d)
}

function encodeEventOptionValue(offerId: number, eventName: string) {
  return `${offerId}::${eventName}`
}

function decodeEventOptionValue(value: string) {
  const separatorIndex = value.indexOf('::')
  return separatorIndex >= 0 ? value.slice(separatorIndex + 2) : value
}

// Beautiful Premium Custom Multi-Select Dropdown
function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  allLabel = 'All',
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selectedValues: string[]
  onChange: (values: string[]) => void
  allLabel?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAllSelected = selectedValues.length === 0

  const toggleOption = (val: string) => {
    if (val === 'All') {
      onChange([])
      return
    }
    let newValues = [...selectedValues]
    if (newValues.includes(val)) {
      newValues = newValues.filter((v) => v !== val)
    } else {
      newValues.push(val)
    }
    onChange(newValues)
  }

  const displayText = useMemo(() => {
    if (isAllSelected) return allLabel
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0])
      return found ? found.label : selectedValues[0]
    }
    return `${selectedValues.length} Selected`
  }, [selectedValues, options, isAllSelected, allLabel])

  return (
    <div className={`relative flex flex-col gap-1 ${isOpen ? 'z-30' : 'z-20'}`} ref={dropdownRef}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-left text-gray-800 shadow-xs"
      >
        <span className="truncate pr-2">{displayText}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+0.25rem)] left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-150 bg-white shadow-xl p-2 space-y-0.5 animate-in fade-in duration-100">
          <button
            type="button"
            onClick={() => toggleOption('All')}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition text-sm text-left font-bold text-blue-600 focus:outline-none"
          >
            <input
              type="checkbox"
              readOnly
              checked={isAllSelected}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
            />
            <span>{allLabel}</span>
          </button>
          <div className="h-px bg-gray-100 my-1 mx-2" />
          {options.length === 0 ? (
            <p className="p-2.5 text-xs text-gray-400 text-center">No options available</p>
          ) : (
            options.map((opt) => {
              const checked = selectedValues.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition text-sm text-left focus:outline-none"
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                  />
                  <span className="text-gray-700 font-medium truncate pointer-events-none">{opt.label}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminConversionsPage() {
  const [offers, setOffers] = useState<OfferOption[]>([])
  const [offersLoading, setOffersLoading] = useState(true)

  // Multi-select offer + event filter (cascading)
  const [draftOfferIds, setDraftOfferIds] = useState<number[]>([])
  const [draftEventNames, setDraftEventNames] = useState<string[]>([])
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([])
  const [selectedEventNames, setSelectedEventNames] = useState<string[]>([])
  const [filtersApplied, setFiltersApplied] = useState(false)

  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [totalPayout, setTotalPayout] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [drawer, setDrawer] = useState<Lead | null>(null)

  // View mode: conversions only, lead cuts only, or combined
  const [viewMode, setViewMode] = useState<'conversions' | 'leadcuts' | 'combined'>('conversions')
  const [leadCuts, setLeadCuts] = useState<any[]>([])
  const [leadCutsTotal, setLeadCutsTotal] = useState(0)
  const [leadCutsLoading, setLeadCutsLoading] = useState(false)

  // Stats
  type Stats = {
    totalConversions: number
    totalPayout: number
    todayConversions: number
    todayPayout: number
    yesterdayConversions: number
    yesterdayPayout: number
    eventCounts: Record<string, number>
  }
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Load all offers with conversions
  useEffect(() => {
    setOffersLoading(true)
    fetch('/api/admin/conversions?offerList=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setOffers(d.offers || []))
      .finally(() => setOffersLoading(false))
  }, [])

  // Events grouped by selected draft offers
  const eventsByOffer = useMemo(() => {
    if (draftOfferIds.length === 0) return []
    return offers
      .filter((o) => draftOfferIds.includes(o.id))
      .map((offer) => ({
        offerId: offer.id,
        offerName: offer.name,
        events: parseOfferEvents(offer.events).events.map((e) => e.displayName || e.name || '').filter(Boolean),
      }))
      .filter((g) => g.events.length > 0)
  }, [offers, draftOfferIds])

  const availableEventValues = useMemo(
    () => Array.from(new Set(eventsByOffer.flatMap((group) => group.events.map((eventName) => encodeEventOptionValue(group.offerId, eventName))))),
    [eventsByOffer]
  )

  // Prune events that are no longer available when offer selection changes
  useEffect(() => {
    setDraftEventNames((current) => current.filter((value) => availableEventValues.includes(value)))
  }, [availableEventValues])

  const { dateFrom, dateTo } = useMemo(() => {
    if (dateMode === 'today') return { dateFrom: getTodayISO(), dateTo: getTodayISO() }
    if (dateMode === 'yesterday') return { dateFrom: getYesterdayISO(), dateTo: getYesterdayISO() }
    return { dateFrom: customFrom, dateTo: customTo }
  }, [dateMode, customFrom, customTo])

  const baseParams = useMemo(() => {
    const p = new URLSearchParams()
    if (selectedOfferIds.length > 0) p.set('offerIds', selectedOfferIds.join(','))
    const decodedEventNames = Array.from(new Set(selectedEventNames.map(decodeEventOptionValue)))
    if (decodedEventNames.length > 0) p.set('eventNames', decodedEventNames.join(','))
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    return p
  }, [selectedOfferIds, selectedEventNames, dateFrom, dateTo])

  // Load leads
  useEffect(() => {
    if (!filtersApplied) { setLeads([]); setLeadsTotal(0); setTotalPayout(0); return }
    setLeadsLoading(true)
    const p = new URLSearchParams(baseParams)
    p.set('page', String(page))
    p.set('limit', '50')
    fetch(`/api/admin/conversions?${p.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads || [])
        setLeadsTotal(d.total || 0)
        setTotalPayout(d.totalPayout || 0)
      })
      .finally(() => setLeadsLoading(false))
  }, [baseParams, page, filtersApplied])

  // Load stats
  useEffect(() => {
    if (!filtersApplied) { setStats(null); return }
    setStatsLoading(true)
    const p = new URLSearchParams(baseParams)
    p.set('stats', 'true')
    fetch(`/api/admin/conversions?${p.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setStatsLoading(false))
  }, [baseParams, filtersApplied])

  // Load lead cuts (when viewMode includes them)
  useEffect(() => {
    if (!filtersApplied || viewMode === 'conversions') { setLeadCuts([]); setLeadCutsTotal(0); return }
    setLeadCutsLoading(true)
    const p = new URLSearchParams()
    if (selectedOfferIds.length > 0) p.set('offerIds', selectedOfferIds.join(','))
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('page', String(page))
    p.set('limit', '50')
    fetch(`/api/admin/lead-cuts?${p.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setLeadCuts(d.records || [])
        setLeadCutsTotal(d.total || 0)
      })
      .finally(() => setLeadCutsLoading(false))
  }, [baseParams, page, filtersApplied, viewMode])

  // Reset page when viewMode changes
  useEffect(() => { setPage(1) }, [viewMode])

  const exportCsv = async () => {
    const recordsToExport: any[] = []

    const addRowObj = (r: any, type: string) => {
      const rawApprovedAt = type === 'CUT' ? r.cutAt : r.approvedAt
      recordsToExport.push({
        rawApprovedAt,
        rowArray: [
          r.id,
          type,
          r.publisher ? `${r.publisher.name} <${r.publisher.email || ''}>` : (r.publisherName || ''),
          r.offer ? r.offer.name : (r.offerName || ''),
          r.camp?.campName || 'direct',
          r.eventName || '',
          r.clickId || '',
          r.mobileNumber || '',
          r.userUpi || '',
          r.ipAddress || '',
          r.device || '',
          Number(r.payout || 0).toFixed(2),
          type === 'CUT' ? 'CUT' : (r.status || ''),
          r.convertedAt ? new Date(r.convertedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
          rawApprovedAt ? new Date(rawApprovedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        ]
      })
    }

    // Fetch conversions (if needed)
    if (viewMode !== 'leadcuts') {
      const p = new URLSearchParams(baseParams)
      p.set('limit', 'all')
      const res = await fetch(`/api/admin/conversions?${p.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      for (const r of (json.leads || [])) addRowObj(r, 'Conversion')
    }

    // Fetch lead cuts (if needed)
    if (viewMode !== 'conversions') {
      const p = new URLSearchParams()
      if (selectedOfferIds.length > 0) p.set('offerIds', selectedOfferIds.join(','))
      if (dateFrom) p.set('dateFrom', dateFrom)
      if (dateTo) p.set('dateTo', dateTo)
      p.set('page', '1')
      p.set('limit', '10000')
      const res = await fetch(`/api/admin/lead-cuts?${p.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      for (const r of (json.records || [])) addRowObj(r, 'CUT')
    }

    // Sort by date descending
    recordsToExport.sort((a, b) => {
      const da = a.rawApprovedAt ? new Date(a.rawApprovedAt).getTime() : 0
      const db = b.rawApprovedAt ? new Date(b.rawApprovedAt).getTime() : 0
      return db - da
    })

    const headers = [
      'ID', 'Type', 'Publisher', 'Offer', 'Camp', 'Event', 'Click ID',
      'Mobile', 'UPI', 'IP', 'Device', 'Payout', 'Status', 'Converted At', 'Approved At',
    ]

    const lines = [
      headers.join(','),
      ...recordsToExport.map((r) => r.rowArray.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversions_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Build display list based on viewMode
  const displayLeads = useMemo(() => {
    const normalRows = (viewMode === 'leadcuts' ? [] : leads).map((l) => ({ ...l, _type: 'conversion' as const }))
    const cutRows = (viewMode === 'conversions' ? [] : leadCuts).map((c: any) => ({
      id: c.id,
      publisher: { id: c.publisherId, name: c.publisherName, email: '' },
      camp: null,
      offer: { id: c.offerId, name: c.offerName },
      eventName: c.eventName,
      clickId: c.clickId,
      mobileNumber: null,
      payout: c.payout,
      status: 'CUT',
      clickedAt: null,
      convertedAt: null,
      approvedAt: c.cutAt,
      userUpi: null,
      ipAddress: null,
      device: null,
      sub1: null, p2: null, p3: null, p4: null, sub2: null, sub3: null,
      postbackSent: false,
      postbackSentAt: null,
      postbackResponse: null,
      _type: 'leadcut' as const,
    }))
    // In combined mode, interleave by date
    if (viewMode === 'combined') {
      return [...normalRows, ...cutRows].sort((a, b) => {
        const da = a.approvedAt ? new Date(a.approvedAt).getTime() : 0
        const db_ = b.approvedAt ? new Date(b.approvedAt).getTime() : 0
        return db_ - da
      })
    }
    return viewMode === 'leadcuts' ? cutRows : normalRows
  }, [leads, leadCuts, viewMode])

  const totalPages = Math.max(1, Math.ceil((viewMode === 'leadcuts' ? leadCutsTotal : leadsTotal) / 50))

  const [openFilters, setOpenFilters] = useState(true)

  const offerOptions = useMemo(() => {
    return offers.map((o) => ({ value: String(o.id), label: `${o.name} (#${o.id})` }))
  }, [offers])

  const eventOptions = useMemo(() => {
    return eventsByOffer.flatMap((group) =>
      group.events.map((eventName) => ({
        value: encodeEventOptionValue(group.offerId, eventName),
        label: `${eventName} (${group.offerName})`,
      }))
    )
  }, [eventsByOffer])

  const currentDateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }, [])

  const applyFilters = () => {
    const nextOfferIds = draftOfferIds.length > 0 ? draftOfferIds : offers.map((offer) => offer.id)

    const nextEventValues = draftEventNames.length > 0
      ? draftEventNames
      : offers
          .filter((offer) => nextOfferIds.includes(offer.id))
          .flatMap((offer) =>
            parseOfferEvents(offer.events)
              .events
              .map((event) => event.displayName || event.name || '')
              .filter(Boolean)
              .map((eventName) => encodeEventOptionValue(offer.id, eventName))
          )

    setDraftOfferIds(nextOfferIds)
    setDraftEventNames(nextEventValues)
    setSelectedOfferIds(nextOfferIds)
    setSelectedEventNames(nextEventValues)
    setFiltersApplied(true)
    setPage(1)
  }

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
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">ADMIN TRACKING</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">Conversions</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">View all conversions across publishers, filtered by offer, event, and date</p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {/* Total Conversions Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{leadsTotal} Total Conversions</span>
            </div>
            {/* Payout Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{fmt(totalPayout)} Platform Payout</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Filters Form Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-visible">
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
            <span className="font-extrabold text-gray-800 text-sm">Filter Conversions</span>
            <span className="rounded-full bg-gray-100/80 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{currentDateLabel}</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter inputs container */}
        {openFilters && (
          <div className="border-t border-brand-border p-5 space-y-5 bg-gray-50/30">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* MULTI SELECT OFFER */}
              <MultiSelectDropdown
                label="OFFER"
                options={offerOptions}
                selectedValues={draftOfferIds.map(String)}
                onChange={(vals) => {
                  setDraftOfferIds(vals.map(Number))
                  // Reset draft event names if they belong to deselected offers
                  const activeOfferIds = vals.map(Number)
                    const validEvents = offers
                      .filter((o) => activeOfferIds.includes(o.id))
                      .flatMap((offer) => parseOfferEvents(offer.events).events.map((e) => e.displayName || e.name || '').filter(Boolean).map((eventName) => encodeEventOptionValue(offer.id, eventName)))
                    setDraftEventNames((curr) => curr.filter((value) => validEvents.includes(value)))
                  }}
                  allLabel="All Offers"
                />

              {/* MULTI SELECT EVENT */}
              <MultiSelectDropdown
                label="EVENT"
                options={eventOptions}
                selectedValues={draftEventNames}
                onChange={setDraftEventNames}
                allLabel="All Events"
              />

              {/* DATE RANGE MODE */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date Range Mode</span>
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-0.5 bg-white">
                  {(['today', 'yesterday', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setDateMode(mode); setPage(1) }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-all ${
                        dateMode === mode
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOM DATES */}
              {dateMode === 'custom' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">FROM</span>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => { setCustomFrom(e.target.value); setPage(1) }}
                      className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TO</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => { setCustomTo(e.target.value); setPage(1) }}
                      className="w-full rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-150">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={applyFilters}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Apply Filters
                </button>

                <button
                  onClick={exportCsv}
                  disabled={!filtersApplied}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDraftOfferIds([])
                  setDraftEventNames([])
                  setSelectedOfferIds([])
                  setSelectedEventNames([])
                  setFiltersApplied(false)
                  setPage(1)
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition cursor-pointer"
              >
                Reset All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View mode toggle */}
      {filtersApplied && (
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {(['conversions', 'leadcuts', 'combined'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                viewMode === mode
                  ? mode === 'leadcuts' ? 'bg-amber-500 text-white' : mode === 'combined' ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'conversions' ? '✅ Conversions' : mode === 'leadcuts' ? '✂️ Lead Cuts' : '📊 Combined'}
            </button>
          ))}
        </div>
      )}

      {/* Stats cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-gray-150 border-t-4 border-t-blue-500 p-5 shadow-sm transition hover:shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Conversions</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stats.totalConversions}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">all time</p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-150 border-t-4 border-t-emerald-500 p-5 shadow-sm transition hover:shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Payout</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5 truncate">{fmt(stats.totalPayout)}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">all time</p>
            </div>
          </div>

          {/* Per-event counts — computed from current displayLeads to respect viewMode */}
          {(() => {
            const counts: Record<string, number> = {}
            displayLeads.forEach((lead) => {
              const ev = lead.eventName || 'unknown'
              counts[ev] = (counts[ev] || 0) + 1
            })
            return Object.keys(counts).length > 0 ? (
              <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Events Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([eventName, count]) => (
                      <span key={eventName} className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-700">
                        {eventName}
                        <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
                      </span>
                    ))}
                </div>
              </div>
            ) : null
          })()}
        </>
      )}

      {/* Loading skeleton */}
      {(leadsLoading || leadCutsLoading) && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* No results */}
      {filtersApplied && !leadsLoading && !leadCutsLoading && displayLeads.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center text-gray-400">
          <div>
            <p className="text-2xl mb-1">📭</p>
            <p className="font-medium">No conversions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </div>
      )}

      {/* Desktop table */}
      {filtersApplied && !leadsLoading && !leadCutsLoading && displayLeads.length > 0 && (
        <>
          <div className="hidden lg:block rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">ID</th>
                    <th className="px-3 py-2 text-left">Publisher</th>
                    <th className="px-3 py-2 text-left">Offer</th>
                    <th className="px-3 py-2 text-left">Event</th>
                    <th className="px-3 py-2 text-left">Click ID</th>
                    <th className="px-3 py-2 text-left">Payout</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Approved At</th>
                    <th className="px-3 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayLeads.map((lead, idx) => {
                    const badge = STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED
                    return (
                      <tr
                        key={`${lead._type}-${lead.id}`}
                        className={`${(lead as any)._type === 'leadcut' ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50/40 transition-colors cursor-pointer`}
                        onClick={() => setDrawer(lead)}
                      >
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">{lead.id}</td>
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">{lead.publisher.name}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{lead.publisher.email}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-800 truncate max-w-[120px]">{lead.offer.name}</td>
                        <td className="px-3 py-2">
                          {lead.eventName ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{lead.eventName}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500 truncate max-w-[100px]">{lead.clickId}</td>
                        <td className={`px-3 py-2 text-xs font-semibold ${(lead as any)._type === 'leadcut' ? 'text-amber-700 line-through' : 'text-green-700'}`}>{fmt(lead.payout)}</td>
                        <td className="px-3 py-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {lead.approvedAt ? new Date(lead.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-purple-500">▸</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="space-y-2 lg:hidden">
            {displayLeads.map((lead) => {
              const badge = STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED
              return (
                <div
                  key={lead.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 active:bg-gray-50"
                  onClick={() => setDrawer(lead)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.publisher.name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.offer.name}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    {lead.eventName && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">{lead.eventName}</span>
                    )}
                    <span className="font-semibold text-green-700">{fmt(lead.payout)}</span>
                    <span className="ml-auto whitespace-nowrap">
                      {lead.approvedAt ? new Date(lead.approvedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawer(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Conversion #{drawer.id}</h2>
              <button onClick={() => setDrawer(null)} className="text-2xl text-gray-400 leading-none">×</button>
            </div>

            <dl className="space-y-3 text-sm">
              {([
                ['Publisher', `${drawer.publisher.name} (${drawer.publisher.email})`],
                ['Offer', drawer.offer.name],
                ['Camp', drawer.camp?.campName || 'direct'],
                ['Event', drawer.eventName || '—'],
                ['Click ID', drawer.clickId],
                ['Mobile', drawer.mobileNumber || '—'],
                ['UPI', drawer.userUpi || '—'],
                ['IP', drawer.ipAddress || '—'],
                ['Device', drawer.device || '—'],
                ['Payout', fmt(drawer.payout)],
                ['Status', drawer.status],
                ['P1', drawer.p1 || '—'],
                ['P2', drawer.p2 || '—'],
                ['P3', drawer.p3 || '—'],
                ['P4', drawer.p4 || '—'],
                ['Sub1', drawer.sub1 || '—'],
                ['Sub2', drawer.sub2 || '—'],
                ['Sub3', drawer.sub3 || '—'],
                ['Clicked At', drawer.clickedAt ? new Date(drawer.clickedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                ['Converted At', drawer.convertedAt ? new Date(drawer.convertedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                ['Approved At', drawer.approvedAt ? new Date(drawer.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                ['Postback Sent', drawer.postbackSent ? '✅ Yes' : '❌ No'],
                ['Postback At', drawer.postbackSentAt ? new Date(drawer.postbackSentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
                ['Postback Response', drawer.postbackResponse || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-start gap-2 border-b border-gray-100 pb-2">
                  <dt className="w-32 shrink-0 text-xs text-gray-500">{label}</dt>
                  <dd className="break-all text-xs font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Initial state — no filters applied yet */}
      {!filtersApplied && !leadsLoading && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center text-gray-400">
          <div>
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-medium">Select offers and apply filters</p>
            <p className="text-sm">to view conversions</p>
          </div>
        </div>
      )}
    </div>
  )
}
