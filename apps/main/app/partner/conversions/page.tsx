'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type Lead = {
  id: number
  offerName: string
  offerId: number
  offerImageUrl: string | null
  campName: string
  campId: number | null
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
  googleAid: string | null
  idfa: string | null
  p1: string | null
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
  events: string
}

type ResponseShape = {
  leads: Lead[]
  total: number
  page: number
  limit: number
  stats: {
    totalConversions: number
    totalPayout: number
    eventCounts: Array<{ offerId: number; offerName: string; eventName: string; count: number }>
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

export default function PartnerConversionsPage() {
  const [data, setData] = useState<ResponseShape | null>(null)
  const [offers, setOffers] = useState<OfferOption[]>([])
  const [loading, setLoading] = useState(false)
  const [drawer, setDrawer] = useState<Lead | null>(null)
  const [openFilters, setOpenFilters] = useState(true)

  // Filters State (Offer & Event are arrays for multi-select)
  const [status, setStatus] = useState('All')
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([])
  const [selectedEventNames, setSelectedEventNames] = useState<string[]>([])
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)

  // Applied Query States (committed on Apply)
  const [appliedStatus, setAppliedStatus] = useState('All')
  const [appliedOfferIds, setAppliedOfferIds] = useState<string[]>([])
  const [appliedEventNames, setAppliedEventNames] = useState<string[]>([])
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

  // List of events dynamically filtered by chosen Offer dropdown selections
  const eventsByOffer = useMemo(() => {
    const targetOffers = selectedOfferIds.length === 0
      ? offers
      : offers.filter((o) => selectedOfferIds.includes(String(o.id)))
    return targetOffers
      .map((offer) => ({
        offerId: offer.id,
        offerName: offer.name,
        events: parseOfferEvents(offer.events).events.map((e) => e.displayName || e.name || '').filter(Boolean),
      }))
      .filter((group) => group.events.length > 0)
  }, [offers, selectedOfferIds])

  const availableEventValues = useMemo(
    () => Array.from(new Set(eventsByOffer.flatMap((group) => group.events.map((eventName) => encodeEventOptionValue(group.offerId, eventName))))),
    [eventsByOffer]
  )

  // Reset event selections if they are no longer in available list
  useEffect(() => {
    setSelectedEventNames((current) => current.filter((value) => availableEventValues.includes(value)))
  }, [availableEventValues])

  // Resolve dates for search queries
  const { dateFrom, dateTo } = useMemo(() => {
    if (appliedDatePreset === 'custom') return { dateFrom: appliedCustomFrom, dateTo: appliedCustomTo }
    return getPresetRange(appliedDatePreset)
  }, [appliedDatePreset, appliedCustomFrom, appliedCustomTo])

  // Query String resolution
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (appliedOfferIds.length > 0) params.set('offerIds', appliedOfferIds.join(','))
    const decodedEventNames = Array.from(new Set(appliedEventNames.map(decodeEventOptionValue)))
    if (decodedEventNames.length > 0) params.set('eventNames', decodedEventNames.join(','))
    if (appliedStatus !== 'All') params.set('status', appliedStatus)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    return params.toString()
  }, [appliedOfferIds, appliedEventNames, appliedStatus, dateFrom, dateTo, page])

  const loadOffers = async () => {
    try {
      const res = await fetch('/api/partner/offers?approvedOnly=true', { cache: 'no-store' })
      const json = (await res.json()) as { offers?: OfferOption[] }
      setOffers((json.offers || []).filter((o) => o.approvalStatus === 'APPROVED'))
    } catch (e) {
      console.error('Failed to load offers filter options', e)
    }
  }

  const loadConversions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/partner/conversions?${query}`, { cache: 'no-store' })
      const json = (await res.json()) as ResponseShape
      setData(json)
    } catch (e) {
      console.error('Failed to fetch leads list data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOffers() }, [])
  useEffect(() => { void loadConversions() }, [query])

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 20)))

  const applyFilters = () => {
    setAppliedStatus(status)
    setAppliedOfferIds(selectedOfferIds)
    setAppliedEventNames(selectedEventNames)
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
    setSelectedOfferIds([])
    setSelectedEventNames([])
    setDatePreset('thisMonth')
    const range = getPresetRange('thisMonth')
    setCustomFrom(range.dateFrom)
    setCustomTo(range.dateTo)

    setAppliedStatus('All')
    setAppliedOfferIds([])
    setAppliedEventNames([])
    setAppliedDatePreset('thisMonth')
    setAppliedCustomFrom(range.dateFrom)
    setAppliedCustomTo(range.dateTo)
    setPage(1)
  }

  const exportCsv = async () => {
    const params = new URLSearchParams(query)
    params.set('page', '1')
    params.set('limit', '10000')
    try {
      const res = await fetch(`/api/partner/conversions?${params.toString()}`, { cache: 'no-store' })
      const json = (await res.json()) as ResponseShape
      const rows = json.leads || []
      const headers = [
        'ID', 'Offer', 'Offer ID', 'Camp', 'Camp Type', 'Event',
        'Click ID', 'P1', 'P2', 'P3', 'P4', 'P5', 'Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5',
        'Mobile', 'UPI', 'IP', 'Device', 'Browser', 'Payout', 'Status', 'Clicked At', 'Converted At'
      ]
      const lines = [headers.join(',')]
      for (const row of rows) {
        lines.push([
          row.id, row.offerName, row.offerId,
          row.campName === '-' ? 'direct' : row.campName,
          row.campId ? 'camp' : 'direct',
          row.eventName || '',
          row.clickId, row.p1 || '', row.p2 || '', row.p3 || '', row.p4 || '', row.p5 || '',
          row.sub1 || '', row.sub2 || '', row.sub3 || '', row.sub4 || '', row.sub5 || '',
          row.mobileNumber || '', row.userUpi || '', row.ipAddress || '', row.device || '', row.browser || '',
          row.payout.toFixed(2), row.status,
          row.clickedAt ? new Date(row.clickedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
          row.convertedAt ? new Date(row.convertedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `partner_conversions_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to export conversions', e)
    }
  }

  // Get current date representation for the filter badge
  const currentDateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }, [])

  // Map offers list for MultiSelectDropdown
  const offerOptions = useMemo(() => {
    return offers.map((o) => ({
      value: String(o.id),
      label: `${o.name} (#${o.id})`,
    }))
  }, [offers])

  // Map events list for MultiSelectDropdown
  const eventOptions = useMemo(() => {
    return eventsByOffer.flatMap((group) =>
      group.events.map((eventName) => ({
        value: encodeEventOptionValue(group.offerId, eventName),
        label: `${eventName} (${group.offerName})`,
      }))
    )
  }, [eventsByOffer])

  return (
    <div className="space-y-4">
      {/* 1. Header Gradient Banner Card */}
      <div className="rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#8B5CF6] to-[#EC4899] p-6 text-white shadow-md relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-lg pointer-events-none" />

        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80">CONVERSIONS ANALYTICS</p>
          <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">My Conversions</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">Track and manage your performance</p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {/* Total Conversions Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>{data?.stats.totalConversions || 0} Total</span>
            </div>

            {/* Time Stamp Glassmorphic badge */}
            <div className="rounded-xl bg-white/15 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-bold shadow-sm">
              <svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} IST</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metrics Status Cards (Total and Payout only) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* TOTAL card */}
        <div className="rounded-2xl bg-white border border-gray-150 border-t-4 border-t-blue-500 p-5 shadow-sm flex items-center gap-4 transition hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner flex-shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">TOTAL</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{data?.stats.totalConversions || 0}</p>
          </div>
        </div>

        {/* PAYOUT card */}
        <div className="rounded-2xl bg-white border border-gray-150 border-t-4 border-t-pink-500 p-5 shadow-sm flex items-center gap-4 transition hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shadow-inner flex-shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PAYOUT</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">₹{Number(data?.stats.totalPayout || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Filters Form Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-visible">
        {/* Toggle Bar */}
        <button
          className="flex w-full items-center justify-between px-5 py-4 text-brand-textPrimary hover:bg-gray-50/50 transition cursor-pointer"
          onClick={() => setOpenFilters((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-extrabold text-gray-800 text-sm">Filters</span>
            <span className="rounded-full bg-gray-100/80 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">{currentDateLabel}</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter inputs container */}
        {openFilters && (
          <div className="border-t border-brand-border p-5 space-y-4 bg-gray-50/30">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
              {/* STATUS */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">STATUS</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="All">All</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>

              {/* MULTI SELECT OFFER */}
              <MultiSelectDropdown
                label="OFFER"
                options={offerOptions}
                selectedValues={selectedOfferIds}
                onChange={setSelectedOfferIds}
                allLabel="All Offers"
              />

              {/* MULTI SELECT EVENT */}
              <MultiSelectDropdown
                label="EVENT"
                options={eventOptions}
                selectedValues={selectedEventNames}
                onChange={setSelectedEventNames}
                allLabel="All Events"
              />

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
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Apply
                </button>

                <button
                  onClick={exportCsv}
                  disabled={!data?.leads.length}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
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

      {/* 4. Per-event count group breakdown by Offer */}
      {data?.stats.eventCounts && data.stats.eventCounts.length > 0 && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-textMuted mb-3">Conversion Event Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {data.stats.eventCounts.map((ec) => (
              <div
                key={`${ec.offerId}-${ec.eventName}`}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 flex items-center gap-3 transition hover:border-gray-200"
              >
                <div className="text-left">
                  <p className="text-[9px] font-bold text-brand-textMuted uppercase tracking-wider leading-none mb-0.5">{ec.offerName}</p>
                  <p className="text-xs font-black text-brand-textPrimary leading-none">{ec.eventName}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-700 shadow-sm">{ec.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Results Listing Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="h-4.5 w-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="font-extrabold text-brand-textPrimary text-sm">Results</span>
          </div>
          <span className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-[10px] font-bold text-gray-500 shadow-inner">{data?.total || 0} records</span>
        </div>

        {/* Conversions Table */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-150">
              <tr>
                <th className="px-5 py-3.5 text-left w-16">ID</th>
                <th className="px-5 py-3.5 text-left">Offer & Event</th>
                <th className="px-5 py-3.5 text-left">Click Info</th>
                <th className="px-5 py-3.5 text-left w-28">Payout</th>
                <th className="px-5 py-3.5 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-5" colSpan={5}>
                      <div className="h-4.5 bg-gray-150 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : !data || data.leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-brand-textMuted">
                    {/* Empty State Folder Icon Illustration */}
                    <div className="flex flex-col items-center">
                      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <p className="font-extrabold text-gray-800 text-sm">No conversions found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition">
                    {/* ID */}
                    <td className="px-5 py-3 text-xs font-bold text-gray-400">#{lead.id}</td>

                    {/* Offer & Event */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded-xl border border-gray-100 bg-white p-1 flex items-center justify-center shadow-xs">
                          <img src={lead.offerImageUrl || '/next.svg'} className="h-full w-full rounded-lg object-contain" alt={lead.offerName} />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-800 leading-tight">{lead.offerName}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-100/50 uppercase">Id-{lead.offerId}</span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100/30">
                              {lead.eventName || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Click Info */}
                    <td className="px-5 py-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400">CLICK ID:</span>
                          <span className="font-mono text-gray-700 truncate max-w-[120px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 leading-none">{lead.clickId}</span>
                        </div>
                        <p className="text-gray-400 text-[10px] leading-none">
                          IP: <span className="font-semibold text-gray-600">{lead.ipAddress || '—'}</span> | Device: <span className="font-semibold text-gray-600 truncate max-w-[80px] inline-block align-bottom">{lead.device || '—'}</span>
                        </p>
                      </div>
                    </td>

                    {/* Payout */}
                    <td className="px-5 py-3 font-extrabold text-gray-900 text-sm">
                      ₹{lead.payout.toFixed(2)}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => setDrawer(lead)}
                        className="rounded-xl border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition shadow-xs flex items-center gap-1 mx-auto"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-brand-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-150 rounded w-1/4" />
                <div className="h-6 bg-gray-150 rounded w-3/4" />
                <div className="h-4 bg-gray-150 rounded w-1/2" />
              </div>
            ))
          ) : !data || data.leads.length === 0 ? (
            <div className="p-12 text-center text-brand-textMuted bg-white">
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="font-extrabold text-gray-800 text-sm">No conversions found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            data.leads.map((lead) => (
              <div key={lead.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">#{lead.id}</span>
                  <span className="font-bold text-gray-900 text-sm font-mono">₹{lead.payout.toFixed(2)}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl border border-gray-100 bg-white p-1 flex items-center justify-center shadow-xs">
                      <img src={lead.offerImageUrl || '/next.svg'} className="h-full w-full rounded-lg object-contain" alt={lead.offerName} />
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-800 leading-tight text-sm">{lead.offerName}</p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-100/50 uppercase">Id-{lead.offerId}</span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100/30">
                          {lead.eventName || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawer(lead)}
                    className="rounded-xl border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition shadow-xs flex items-center gap-1 flex-shrink-0"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-xs text-gray-650">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-bold">CLICK ID:</span>
                    <span className="font-mono text-gray-700 truncate max-w-[150px] bg-white px-1.5 py-0.5 rounded border border-gray-150 leading-none">{lead.clickId}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 border-t border-gray-200/50 pt-1.5">
                    <span>IP: <span className="font-semibold text-gray-600">{lead.ipAddress || '—'}</span></span>
                    <span>Device: <span className="font-semibold text-gray-600 truncate max-w-[100px] inline-block align-bottom">{lead.device || '—'}</span></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination bar */}
        {data && data.leads.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-brand-border bg-gray-50/50 px-5 py-4 text-xs font-semibold text-gray-500">
            <p>
              Showing {((data.page - 1) * data.limit) + 1}–
              {Math.min(data.page * data.limit, data.total)} of {data.total} records
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50 transition hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setPage((v) => v - 1)}
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
                <button
                  key={idx}
                  className={`rounded-xl px-3 py-1.5 transition ${
                    page === idx + 1
                      ? 'bg-indigo-600 text-white border border-indigo-600'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setPage(idx + 1)}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50 transition hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Enhanced Details Drawer Modal */}
      {drawer ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-end" onClick={() => setDrawer(null)}>
          <aside
            className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl relative flex flex-col gap-5 border-l animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>Conversion Detail</span>
                <span className="text-xs text-gray-400 font-mono font-normal">#{drawer.id}</span>
              </h2>
              <button className="text-2xl text-gray-400 hover:text-gray-600 transition focus:outline-none" onClick={() => setDrawer(null)}>
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Status Section */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold shadow-sm ${
                  drawer.status === 'APPROVED' || drawer.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : drawer.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {drawer.status}
                </span>
              </div>

              {/* Offer & Event Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Offer & Event</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-xl border border-gray-100 bg-white p-1 flex items-center justify-center shadow-xs">
                    <img src={drawer.offerImageUrl || '/next.svg'} className="h-full w-full rounded-lg object-contain" alt={drawer.offerName} />
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-800">{drawer.offerName}</p>
                    <p className="text-xs text-gray-500 font-medium">Offer ID: {drawer.offerId} | Event: <span className="font-bold text-emerald-600">{drawer.eventName || '—'}</span></p>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-bold">Payout</span>
                  <span className="font-extrabold text-gray-900 text-base">₹{drawer.payout.toFixed(2)}</span>
                </div>
              </div>

              {/* Click & Device Info Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Click & Device Information</p>
                <div className="space-y-1.5 text-xs text-gray-650">
                  <div className="flex justify-between items-start"><span className="text-gray-400">Click ID</span><span className="font-mono font-bold text-gray-800 break-all ml-4 text-right">{drawer.clickId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">IP Address</span><span className="font-semibold text-gray-800">{drawer.ipAddress || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Device</span><span className="font-semibold text-gray-800">{drawer.device || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Browser</span><span className="font-semibold text-gray-800">{drawer.browser || '—'}</span></div>
                  <div className="flex justify-between items-start"><span className="text-gray-400">Google AID (GAID)</span><span className="font-semibold text-gray-800 break-all ml-4 text-right">{drawer.googleAid || '—'}</span></div>
                  <div className="flex justify-between items-start"><span className="text-gray-400">IDFA</span><span className="font-semibold text-gray-800 break-all ml-4 text-right">{drawer.idfa || '—'}</span></div>
                </div>
              </div>

              {/* Tracking Parameters (p1-p5) Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Tracking Parameters (p1-p5)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">P1</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.p1 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">P2</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.p2 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">P3</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.p3 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">P4</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.p4 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl col-span-2"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">P5</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.p5 || '—'}</span></div>
                </div>
              </div>

              {/* Publisher Sub Parameters (sub1-sub5) Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Publisher Sub Parameters (sub1-sub5)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">Sub1</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.sub1 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">Sub2</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.sub2 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">Sub3</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.sub3 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">Sub4</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.sub4 || '—'}</span></div>
                  <div className="bg-gray-50 border border-gray-100 p-2 rounded-xl col-span-2"><span className="text-[10px] font-bold text-gray-400 block mb-0.5">Sub5</span><span className="font-mono font-semibold text-gray-800 break-all">{drawer.sub5 || '—'}</span></div>
                </div>
              </div>

              {/* User details */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">User Information</p>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between"><span className="text-gray-400 font-medium">UPI ID</span><span className="font-semibold text-gray-855">{drawer.userUpi || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 font-medium">Mobile Number</span><span className="font-semibold text-gray-855">{drawer.mobileNumber || '—'}</span></div>
                </div>
              </div>

              {/* Timestamps Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Timeline</p>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between"><span className="text-gray-400">Clicked At</span><span className="font-semibold text-gray-800">{drawer.clickedAt ? new Date(drawer.clickedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Converted At</span><span className="font-semibold text-gray-800">{drawer.convertedAt ? new Date(drawer.convertedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Approved At</span><span className="font-semibold text-gray-800">{drawer.approvedAt ? new Date(drawer.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span></div>
                </div>
              </div>

              {/* Postbacks Log Section */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Global Postback Response</p>
                <div className="space-y-2 text-xs text-gray-650">
                  <div className="flex justify-between"><span className="text-gray-400 font-medium">Fired Status</span><span className={`font-extrabold ${drawer.postbackSent ? 'text-green-600' : 'text-gray-400'}`}>{drawer.postbackSent ? 'Fired (200 OK)' : 'Not Fired'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 font-medium">Sent At</span><span className="font-semibold text-gray-800">{drawer.postbackSentAt ? new Date(drawer.postbackSentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</span></div>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-gray-400 font-medium">Postback Response</span>
                    <pre className="p-3 border border-gray-100 bg-gray-50 rounded-xl overflow-auto font-mono text-[10px] max-h-24 whitespace-pre-wrap">{drawer.postbackResponse || '—'}</pre>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
