'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

// ── Types ────────────────────────────────────────────────────
type Publisher = {
  id: number
  name: string
  email: string
  walletBalance: number
  totalEarned: number
}

type OfferOption = { id: number; name: string; events?: string }

type Stats = {
  totalConversions: number
  totalPayout: number
  todayConversions: number
  todayPayout: number
  yesterdayConversions: number
  yesterdayPayout: number
  byDate: { date: string; conversions: number; payout: number; events: Record<string, number> }[]
  eventCounts?: Record<string, number>
}

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
  isAutoApproved: boolean
  clickedAt: string
  convertedAt: string | null
  approvedAt: string | null
  userUpi: string | null
  ipAddress: string | null
  device: string | null
  sub1: string | null
  p2: string | null
  p3: string | null
  p4?: string | null
  p5?: string | null
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

// ── Main component ───────────────────────────────────────────
export default function AdminCampLeadsPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [publisherSearch, setPublisherSearch] = useState('')
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null)
  // Mobile: show publisher list as a drawer/sheet
  const [showPublisherSheet, setShowPublisherSheet] = useState(false)

  const [offers, setOffers] = useState<OfferOption[]>([])
  // Multi-select offer + event filter (cascading)
  const [draftOfferIds, setDraftOfferIds] = useState<number[]>([])
  const [draftEventNames, setDraftEventNames] = useState<string[]>([])
  const [selectedOfferIds, setSelectedOfferIds] = useState<number[]>([])
  const [selectedEventNames, setSelectedEventNames] = useState<string[]>([])
  const [filtersApplied, setFiltersApplied] = useState(false)

  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsTotal, setLeadsTotal] = useState(0)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [drawer, setDrawer] = useState<Lead | null>(null)
  const [showAddConversion, setShowAddConversion] = useState(false)

  // View mode: conversions only, lead cuts only, or combined
  const [viewMode, setViewMode] = useState<'conversions' | 'leadcuts' | 'combined'>('conversions')
  const [leadCuts, setLeadCuts] = useState<any[]>([])
  const [leadCutsTotal, setLeadCutsTotal] = useState(0)
  const [leadCutsLoading, setLeadCutsLoading] = useState(false)
  const [openFilters, setOpenFilters] = useState(true)
  const [manualOffers, setManualOffers] = useState<OfferOption[]>([])
  const [manualOfferId, setManualOfferId] = useState('')
  const [manualCounts, setManualCounts] = useState<Record<string, string>>({})
  const [manualSaving, setManualSaving] = useState(false)

  const currentDateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }, [])

  const offerOptions = useMemo(() => {
    return offers.map((o) => ({ value: String(o.id), label: `${o.name} (#${o.id})` }))
  }, [offers])

  // Load publishers
  useEffect(() => {
    fetch('/api/admin/camp-leads?publisherList=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPublishers(d.publishers || []))
  }, [])

  // Events grouped by currently selected draft offers
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

  const eventOptions = useMemo(() => {
    return eventsByOffer.flatMap((group) =>
      group.events.map((eventName) => ({
        value: encodeEventOptionValue(group.offerId, eventName),
        label: `${eventName} (${group.offerName})`,
      }))
    )
  }, [eventsByOffer])

  // When draft offer selection changes, prune any events that are no longer available
  useEffect(() => {
    setDraftEventNames((current) => current.filter((value) => availableEventValues.includes(value)))
  }, [availableEventValues])

  // Load offers when publisher changes
  useEffect(() => {
    if (!selectedPublisher) {
      setOffers([])
      setDraftOfferIds([])
      setDraftEventNames([])
      setSelectedOfferIds([])
      setSelectedEventNames([])
      setFiltersApplied(false)
      return
    }
    fetch(`/api/admin/camp-leads?offerList=true&publisherId=${selectedPublisher.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setOffers(d.offers || []))
    setDraftOfferIds([])
    setDraftEventNames([])
    setSelectedOfferIds([])
    setSelectedEventNames([])
    setFiltersApplied(false)
    setPage(1)
  }, [selectedPublisher])

  useEffect(() => {
    if (!showAddConversion || !selectedPublisher) return
    fetch(`/api/admin/camp-leads?manualOfferList=true&publisherId=${selectedPublisher.id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setManualOffers(d.offers || []))
  }, [showAddConversion, selectedPublisher])

  const { dateFrom, dateTo } = useMemo(() => {
    if (dateMode === 'today') return { dateFrom: getTodayISO(), dateTo: getTodayISO() }
    if (dateMode === 'yesterday') return { dateFrom: getYesterdayISO(), dateTo: getYesterdayISO() }
    return { dateFrom: customFrom, dateTo: customTo }
  }, [dateMode, customFrom, customTo])

  const baseParams = useMemo(() => {
    const p = new URLSearchParams()
    if (selectedPublisher) p.set('publisherId', String(selectedPublisher.id))
    if (selectedOfferIds.length > 0) p.set('offerIds', selectedOfferIds.join(','))
    const decodedEventNames = Array.from(new Set(selectedEventNames.map(decodeEventOptionValue)))
    if (decodedEventNames.length > 0) p.set('eventNames', decodedEventNames.join(','))
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    return p
  }, [selectedPublisher, selectedOfferIds, selectedEventNames, dateFrom, dateTo])

  // Load stats
  useEffect(() => {
    if (!selectedPublisher || !filtersApplied) { setStats(null); return }
    setStatsLoading(true)
    const p = new URLSearchParams(baseParams)
    p.delete('dateFrom')
    p.delete('dateTo')
    fetch(`/api/admin/camp-leads?stats=true&${p.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setStatsLoading(false))
  }, [selectedPublisher, selectedOfferIds, selectedEventNames, filtersApplied])

  // Load leads
  useEffect(() => {
    if (!selectedPublisher || !filtersApplied) { setLeads([]); setLeadsTotal(0); return }
    setLeadsLoading(true)
    const p = new URLSearchParams(baseParams)
    p.set('page', String(page))
    p.set('limit', '50')
    fetch(`/api/admin/camp-leads?${p.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads || []); setLeadsTotal(d.total || 0) })
      .finally(() => setLeadsLoading(false))
  }, [baseParams, page, filtersApplied])

  // Load lead cuts (when viewMode includes them)
  useEffect(() => {
    if (!selectedPublisher || !filtersApplied || viewMode === 'conversions') { setLeadCuts([]); setLeadCutsTotal(0); return }
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
        const filtered = (d.records || []).filter((c: any) => c.publisherId === selectedPublisher.id)
        setLeadCuts(filtered)
        setLeadCutsTotal(filtered.length)
      })
      .finally(() => setLeadCutsLoading(false))
  }, [baseParams, page, filtersApplied, viewMode, selectedPublisher])

  // Reset page when viewMode changes
  useEffect(() => { setPage(1) }, [viewMode])

  const rejectLead = async (lead: Lead) => {
    const reason = prompt('Reason for rejection (fraud override):') || ''
    if (!reason.trim() && !confirm('Reject without a reason?')) return
    const res = await fetch(`/api/admin/camp-leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED', adminNote: reason }),
    })
    const json = await res.json()
    if (json.reversed) alert(`Reversed ₹${lead.payout.toFixed(2)} from publisher wallet`)
    setPage(1)
  }

  const exportCsv = async () => {
    const recordsToExport: any[] = []

    // Fetch conversions (if needed)
    if (viewMode !== 'leadcuts') {
      const p = new URLSearchParams(baseParams)
      p.set('page', '1')
      p.set('limit', '10000')
      const res = await fetch(`/api/admin/camp-leads?${p.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      const rows = (json.leads || []) as Lead[]
      for (const r of rows) {
        recordsToExport.push({
          rawApprovedAt: r.approvedAt,
          rowArray: [
            r.id,
            'Conversion',
            `${r.publisher.name} <${r.publisher.email}>`,
            r.offer.name,
            r.camp?.campName || 'direct',
            r.camp ? 'camp' : 'direct',
            r.eventName || '',
            r.clickId || '',
            r.p1 || '',
            r.p2 || '',
            r.p3 || '',
            r.p4 || '',
            r.p5 || '',
            r.sub1 || '',
            r.sub2 || '',
            r.sub3 || '',
            r.mobileNumber || '',
            r.userUpi || '',
            r.ipAddress || '',
            r.device || '',
            r.payout.toFixed(2),
            r.status,
            r.approvedAt ? new Date(r.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
          ]
        })
      }
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
      // Filter by selected publisher
      const filtered = (json.records || []).filter((c: any) => c.publisherId === selectedPublisher?.id)
      for (const r of filtered) {
        recordsToExport.push({
          rawApprovedAt: r.cutAt,
          rowArray: [
            r.id,
            'CUT',
            r.publisherName || `Publisher #${r.publisherId}`,
            r.offerName || `Offer #${r.offerId}`,
            'direct',
            'direct',
            r.eventName || '',
            r.clickId || '',
            '', '', '', '', '', '', '', '', // P1-P5, Sub1-Sub3
            '', '', '', '', // Mobile, UPI, IP, Device
            Number(r.payout || 0).toFixed(2),
            'CUT',
            r.cutAt ? new Date(r.cutAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
          ]
        })
      }
    }

    // Sort by date descending
    recordsToExport.sort((a, b) => {
      const da = a.rawApprovedAt ? new Date(a.rawApprovedAt).getTime() : 0
      const db = b.rawApprovedAt ? new Date(b.rawApprovedAt).getTime() : 0
      return db - da
    })

    const headers = [
      'ID',
      'Type',
      'Publisher',
      'Offer',
      'Camp',
      'Camp Type',
      'Event',
      'Click ID',
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'Sub1',
      'Sub2',
      'Sub3',
      'Mobile',
      'UPI',
      'IP',
      'Device',
      'Payout',
      'Status',
      'Approved At',
    ]

    const lines = [
      headers.join(','),
      ...recordsToExport.map((r) => r.rowArray.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversions_${selectedPublisher?.name || 'all'}_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredPublishers = useMemo(() => {
    if (!publisherSearch.trim()) return publishers
    const q = publisherSearch.toLowerCase()
    return publishers.filter((p) =>
      p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }, [publishers, publisherSearch])

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
      isAutoApproved: false,
      clickedAt: null,
      convertedAt: null,
      approvedAt: c.cutAt,
      userUpi: null,
      ipAddress: null,
      device: null,
      sub1: null, p2: null, p3: null, p4: null, p5: null, sub2: null, sub3: null,
      postbackSent: false,
      postbackSentAt: null,
      postbackResponse: null,
      _type: 'leadcut' as const,
    }))
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
  const manualSelectedOffer = manualOffers.find((offer) => String(offer.id) === manualOfferId) || null
  const manualEvents = useMemo(
    () => (manualSelectedOffer ? parseOfferEvents(manualSelectedOffer.events || '[]').events : []),
    [manualSelectedOffer]
  )

  const openManualModal = () => {
    setManualOffers([])
    setManualOfferId('')
    setManualCounts({})
    setShowAddConversion(true)
  }

  const submitManualConversions = async () => {
    if (!selectedPublisher || !manualOfferId) return
    const counts = Object.fromEntries(
      Object.entries(manualCounts)
        .map(([eventName, value]) => [eventName, Number(value || 0)] as [string, number])
        .filter(([, value]) => Number.isFinite(value) && value > 0)
    )

    if (Object.keys(counts).length === 0) {
      alert('Enter at least one event count')
      return
    }

    setManualSaving(true)
    const res = await fetch('/api/admin/camp-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publisherId: Number(selectedPublisher.id),
        offerId: Number(manualOfferId),
        counts,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setManualSaving(false)

    if (!res.ok) {
      alert(`Error: ${json.error || 'Failed to add conversions'}`)
      return
    }

    setShowAddConversion(false)
    setManualOfferId('')
    setManualCounts({})
    await Promise.all([
      fetch('/api/admin/camp-leads?publisherList=true', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          const nextPublishers = d.publishers || []
          setPublishers(nextPublishers)
          const nextSelected = nextPublishers.find((item: Publisher) => String(item.id) === String(selectedPublisher.id)) || null
          setSelectedPublisher(nextSelected)
        }),
      (async () => {
        if (!selectedPublisher) return
        setStatsLoading(true)
        const p = new URLSearchParams(baseParams)
        p.delete('dateFrom')
        p.delete('dateTo')
        const [statsRes, leadsRes] = await Promise.all([
          fetch(`/api/admin/camp-leads?stats=true&${p.toString()}`, { cache: 'no-store' }),
          fetch(`/api/admin/camp-leads?${new URLSearchParams({ ...Object.fromEntries(baseParams.entries()), page: '1', limit: '50' }).toString()}`, { cache: 'no-store' }),
        ])
        const statsJson = await statsRes.json()
        const leadsJson = await leadsRes.json()
        setStats(statsJson)
        setLeads(leadsJson.leads || [])
        setLeadsTotal(leadsJson.total || 0)
        setPage(1)
        setStatsLoading(false)
      })(),
    ])
    alert(`Added ${json.createdEvents || 0} conversion events`)
  }

  // ── Publisher list (shared between sidebar and mobile sheet) ──
  const PublisherList = () => (
    <div className="space-y-2">
      <input
        value={publisherSearch}
        onChange={(e) => setPublisherSearch(e.target.value)}
        placeholder="Search publishers..."
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-purple-400 focus:outline-none"
      />
      <div className="max-h-[60vh] overflow-y-auto space-y-1 lg:max-h-[calc(100vh-260px)]">
        {filteredPublishers.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-gray-400">No publishers found</p>
        )}
        {filteredPublishers.map((pub) => (
          <button
            key={pub.id}
            onClick={() => {
              setSelectedPublisher(pub)
              setPage(1)
              setShowPublisherSheet(false)
            }}
            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${selectedPublisher?.id === pub.id
                ? 'bg-purple-600 text-white'
                : 'text-black hover:bg-gray-50'
              }`}
          >
            <p className="text-sm font-semibold truncate">{pub.name}</p>
            <p className={`text-xs truncate ${selectedPublisher?.id === pub.id ? 'text-purple-200' : 'text-gray-500'}`}>
              {pub.email}
            </p>
            <p className={`text-xs mt-0.5 ${selectedPublisher?.id === pub.id ? 'text-purple-200' : 'text-gray-400'}`}>
              Balance: {fmt(pub.walletBalance)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex h-full gap-4">

      {/* ── DESKTOP: Left sidebar publisher list ─────────── */}
      <div className="hidden lg:block w-64 shrink-0 space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Publishers</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-2">
          <PublisherList />
        </div>
      </div>

      {/* ── MOBILE: Publisher bottom sheet ───────────────── */}
      {showPublisherSheet && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowPublisherSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Select Publisher</h2>
              <button
                onClick={() => setShowPublisherSheet(false)}
                className="text-2xl text-gray-400 leading-none"
              >
                ×
              </button>
            </div>
            <PublisherList />
          </div>
        </div>
      )}

      {/* ── RIGHT: Reports area ──────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Mobile: publisher selector button (shown instead of sidebar) */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setShowPublisherSheet(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50"
          >
            <span>👤</span>
            <span className="truncate max-w-[180px]">
              {selectedPublisher ? selectedPublisher.name : 'Select Publisher'}
            </span>
            <span className="text-gray-400">▾</span>
          </button>
          {selectedPublisher && (
            <button
              onClick={() => setSelectedPublisher(null)}
              className="text-xs text-gray-400 underline"
            >
              Clear
            </button>
          )}
        </div>

        {!selectedPublisher ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-center text-gray-400">
            <div>
              <p className="text-4xl mb-2 lg:hidden">👆</p>
              <p className="text-4xl mb-2 hidden lg:block">👈</p>
              <p className="font-medium">Select a publisher</p>
              <p className="text-sm">to view their conversion reports</p>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Publisher Header Gradient Banner Card */}
            <div
              className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
              style={{ background: 'linear-gradient(to right, #4F46E5, #6366F1, #8B5CF6)' }}
            >
              <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-lg pointer-events-none" />

              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">PUBLISHER REPORT</p>
                <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">{selectedPublisher.name}</h1>
                <p className="text-xs text-white/85 mt-1 font-medium">{selectedPublisher.email} · Earned: {fmt(selectedPublisher.totalEarned)}</p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    onClick={openManualModal}
                    className="rounded-xl bg-white/20 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/25 text-xs font-bold shadow-sm text-white hover:bg-white/30 transition cursor-pointer"
                  >
                    <span>➕ Add Conversion</span>
                  </button>
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
                  <span className="font-extrabold text-gray-800 text-sm">Filter Reports</span>
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
                        onClick={() => {
                          setSelectedOfferIds(draftOfferIds)
                          setSelectedEventNames(draftEventNames)
                          setFiltersApplied(true)
                          setPage(1)
                        }}
                        disabled={draftOfferIds.length === 0}
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

            {/* Stats cards — 2 cols */}
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : stats && (
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
            )}

            {/* Events Breakdown — computed from displayLeads to respect viewMode */}
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

            {/* Conversions — card layout on mobile, table on desktop */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm">
                    Conversion List
                    <span className="ml-1 text-gray-400 font-normal">
                      ({dateMode === 'today' ? 'Today' : dateMode === 'yesterday' ? 'Yesterday' : `${customFrom} – ${customTo}`})
                    </span>
                  </p>
                  <span className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white">{leadsTotal} total</span>
                </div>
                {/* View mode toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                  {(['conversions', 'leadcuts', 'combined'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                        viewMode === mode
                          ? mode === 'leadcuts' ? 'bg-amber-500 text-white' : mode === 'combined' ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {mode === 'conversions' ? '✅ Conversions' : mode === 'leadcuts' ? '✂️ Lead Cuts' : '📊 Combined'}
                    </button>
                  ))}
                </div>
              </div>

              {(leadsLoading || leadCutsLoading) ? (
                <div className="p-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                </div>
              ) : displayLeads.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="font-medium">No conversions found</p>
                  <p className="text-sm">Try changing the date filter or offer</p>
                </div>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="divide-y divide-gray-100 lg:hidden">
                    {displayLeads.map((lead) => (
                      <div key={lead.id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{lead.offer.name}</p>
                            <p className="text-xs text-gray-500">
                              {lead.camp ? lead.camp.campName : 'direct link'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`text-sm font-bold ${(lead as any)._type === 'leadcut' ? 'text-amber-700 line-through' : 'text-green-700'}`}>{fmt(lead.payout)}</p>
                            <span
                              className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: (STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED).bg,
                                color: (STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED).text,
                              }}
                            >
                              {lead.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                            {lead.eventName || '—'}
                          </span>
                          {lead.p2 && (
                            <span className="text-xs text-gray-500 font-mono truncate max-w-[120px]">
                              user: {lead.p2}
                            </span>
                          )}
                          {lead.isAutoApproved && (
                            <span className="text-xs text-green-600">✓ auto</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {lead.approvedAt
                              ? new Date(lead.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })
                              : '—'}
                          </p>
                          <div className="flex gap-1">
                            <button
                              className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                              onClick={() => setDrawer(lead)}
                            >
                              👁
                            </button>
                            {['APPROVED', 'PAID'].includes(lead.status) && (
                              <button
                                className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600"
                                onClick={() => { if (!confirm('Reject and reverse wallet credit?')) return; void rejectLead(lead) }}
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left">ID</th>
                          <th className="px-3 py-2 text-left">Offer</th>
                          <th className="px-3 py-2 text-left">Camp</th>
                          <th className="px-3 py-2 text-left">Event</th>
                          <th className="px-3 py-2 text-left">Tracking Params</th>
                          <th className="px-3 py-2 text-left">Payout</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Approved At</th>
                          <th className="px-3 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayLeads.map((lead, idx) => (
                          <tr
                            key={lead.id}
                            className={`border-t border-gray-100 hover:bg-purple-50 transition-colors ${(lead as any)._type === 'leadcut' ? 'bg-amber-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-3 py-2 text-gray-500 text-xs">#{lead.id}</td>
                            <td className="px-3 py-2 font-medium text-gray-800 text-xs">{lead.offer.name}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">
                              {lead.camp ? (
                                <span>{lead.camp.campName}<br /><span className="text-gray-400">/{lead.camp.campSlug}</span></span>
                              ) : (
                                <span className="text-gray-400">direct</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                                {lead.eventName || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                              <div>P1: {lead.p1 || '—'}</div>
                              <div>P2: {lead.p2 || '—'}</div>
                              <div>P3: {lead.p3 || '—'}</div>
                              <div>P4: {lead.p4 || '—'}</div>
                            </td>
                            <td className={`px-3 py-2 font-semibold ${(lead as any)._type === 'leadcut' ? 'text-amber-700 line-through' : 'text-green-700'}`}>{fmt(lead.payout)}</td>
                            <td className="px-3 py-2">
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: (STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED).bg,
                                  color: (STATUS_BADGE[lead.status] || STATUS_BADGE.CLICKED).text,
                                }}
                              >
                                {lead.status}
                              </span>
                              {lead.isAutoApproved && (
                                <span className="ml-1 text-xs text-green-600">✓ auto</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {lead.approvedAt
                                ? new Date(lead.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })
                                : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button
                                  className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                                  onClick={() => setDrawer(lead)}
                                >
                                  👁
                                </button>
                                {['APPROVED', 'PAID'].includes(lead.status) && (
                                  <button
                                    className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                                    onClick={() => { if (!confirm('Reject and reverse wallet credit?')) return; void rejectLead(lead) }}
                                  >
                                    ❌
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 text-sm">
                <button
                  className="rounded border px-3 py-1.5 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span className="px-3 py-1.5 text-gray-500 text-xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="rounded border px-3 py-1.5 disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail drawer ─────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDrawer(null)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white p-4 shadow-xl sm:max-w-md sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="float-right text-2xl text-gray-400 leading-none hover:text-gray-700"
              onClick={() => setDrawer(null)}
            >
              ×
            </button>
            <h2 className="text-lg font-bold sm:text-xl">Conversion Event #{drawer.id}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: STATUS_BADGE[drawer.status]?.bg, color: STATUS_BADGE[drawer.status]?.text }}
              >
                {drawer.status}
              </span>
              {drawer.isAutoApproved && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">✓ Auto</span>
              )}
            </div>
            <div className="mt-4 space-y-4 text-sm divide-y">
              <section className="pt-3">
                <p className="mb-2 font-semibold text-gray-700">Offer &amp; Event</p>
                <div className="space-y-1 text-gray-600">
                  <p>Offer: <span className="font-medium text-gray-900">{drawer.offer.name}</span></p>
                  <p>Event: <span className="font-medium text-gray-900">{drawer.eventName || '—'}</span></p>
                  <p>Payout: <span className="font-semibold text-green-700">{fmt(drawer.payout)}</span></p>
                </div>
              </section>
              <section className="pt-3">
                <p className="mb-2 font-semibold text-gray-700">Click Info</p>
                <p className="break-all font-mono text-xs text-gray-600">{drawer.clickId}</p>
                <div className="mt-1 space-y-1 text-gray-600">
                  <p>Clicked: {drawer.clickedAt ? new Date(drawer.clickedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'No timestamp'}</p>
                  {drawer.approvedAt && (
                    <p>Approved: {new Date(drawer.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                  )}
                </div>
              </section>
              <section className="pt-3">
                <p className="mb-2 font-semibold text-gray-700">User Info</p>
                <div className="space-y-1 text-gray-600">
                  <p>P1: <span className="font-mono">{drawer.p1 || '—'}</span></p>
                  <p>P2: <span className="font-mono">{drawer.p2 || '—'}</span></p>
                  <p>P3: <span className="font-mono">{drawer.p3 || '—'}</span></p>
                  <p>P4: <span className="font-mono">{drawer.p4 || '—'}</span></p>
                  <p>Mobile: {drawer.mobileNumber || '—'}</p>
                  <p>UPI: {drawer.userUpi || '—'}</p>
                  <p>IP: {drawer.ipAddress || '—'}</p>
                  <p>Device: {drawer.device || '—'}</p>
                </div>
              </section>
              <section className="pt-3">
                <p className="mb-2 font-semibold text-gray-700">Sub Params</p>
                <p className="text-gray-600">
                  {[['sub1', drawer.sub1], ['sub2', drawer.sub2], ['sub3', drawer.sub3], ['p3', drawer.p3]]
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ') || 'None'}
                </p>
              </section>
              <section className="pt-3">
                <p className="mb-2 font-semibold text-gray-700">Publisher Postback</p>
                <div className="space-y-1 text-gray-600">
                  <p>Status: {drawer.postbackSent
                    ? <span className="text-green-600">✓ Sent</span>
                    : <span className="text-gray-400">Not sent</span>}
                  </p>
                  {drawer.postbackSentAt && (
                    <p>Sent: {new Date(drawer.postbackSentAt).toLocaleString()}</p>
                  )}
                  {drawer.postbackResponse && (
                    <pre className="mt-1 overflow-auto rounded bg-gray-100 p-2 text-xs">{drawer.postbackResponse}</pre>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {showAddConversion && selectedPublisher ? (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowAddConversion(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="float-right text-2xl text-gray-400 leading-none hover:text-gray-700" onClick={() => setShowAddConversion(false)}>
              ×
            </button>
            <h2 className="text-xl font-bold text-gray-900">Add Manual Conversions</h2>
            <p className="mt-1 text-sm text-gray-500">{selectedPublisher.name}</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Offer</label>
                <select
                  value={manualOfferId}
                  onChange={(e) => {
                    setManualOfferId(e.target.value)
                    setManualCounts({})
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black"
                >
                  <option value="">Select approved offer</option>
                  {manualOffers.map((offer) => (
                    <option key={offer.id} value={String(offer.id)}>{offer.name}</option>
                  ))}
                </select>
              </div>

              {manualEvents.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Event Counts</p>
                  {manualEvents.map((event) => (
                    <div key={event.displayName} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{event.displayName}</p>
                          <p className="text-xs text-gray-500">Payout: {fmt(Number(event.payout || 0))}</p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={manualCounts[event.displayName] || ''}
                          onChange={(e) => setManualCounts((current) => ({ ...current, [event.displayName]: e.target.value }))}
                          className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : manualOfferId ? (
                <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500">
                  This offer has no configured events.
                </p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={submitManualConversions}
                  disabled={manualSaving}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {manualSaving ? 'Saving...' : 'Add Conversions'}
                </button>
                <button
                  onClick={() => setShowAddConversion(false)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
