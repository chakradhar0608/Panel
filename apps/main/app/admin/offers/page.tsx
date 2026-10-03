'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { defaultOfferEventConfig, parseOfferEvents, serializeOfferEvents, type OfferEventConfig } from '@/lib/offer-events'

type Offer = {
  id: number
  imageUrl?: string | null
  name: string
  slug: string
  publisherPayout?: number
  payoutType?: string | null
  category?: string | null
  status?: string | null
  badge?: string | null
  affiliateUrl?: string | null
  telegramLink?: string | null
  description?: string | null
  steps?: string[]
  events?: string
  sortOrder?: number
  isLimited?: boolean
}

// Each event now has an identifiers array — multiple aliases the affiliate network
// might send for the same event (mirrors postback.js identifiers logic)
type EventInput = {
  name: string          // internal key e.g. "install"
  identifiers: string   // comma-separated aliases e.g. "install, Install, app_install, INSTALL"
  displayName: string   // shown in UI e.g. "App Install"
  payout: number
  dailyCap: number | null
  leadCutPercentage: number
}

type OfferConfigState = OfferEventConfig

const emptyForm: Partial<Offer> = {
  name: '',
  slug: '',
  imageUrl: '',
  description: '',
  steps: [''],
  publisherPayout: 0,
  payoutType: 'CPA',
  category: '',
  affiliateUrl: '',
  telegramLink: '',
  status: 'ACTIVE',
  badge: 'none',
  sortOrder: 0,
  isLimited: false,
}

const emptyEvent = (): EventInput => ({
  name: '',
  identifiers: '',
  displayName: '',
  payout: 0,
  dailyCap: null,
  leadCutPercentage: 0,
})

function parseNumericInput(value: string): number {
  if (!value.trim()) return 0
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [payoutTypeFilter, setPayoutTypeFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Offer>>(emptyForm)
  const [events, setEvents] = useState<EventInput[]>([emptyEvent()])
  const [config, setConfig] = useState<OfferConfigState>(defaultOfferEventConfig)
  const [error, setError] = useState('')
  const [postbackCopied, setPostbackCopied] = useState(false)
  const [tableCopiedId, setTableCopiedId] = useState<number | null>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testClickId, setTestClickId] = useState('')
  const [testEvent, setTestEvent] = useState('')
  const [testPayout, setTestPayout] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [openFilters, setOpenFilters] = useState(true)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      const data = await res.json()
      if (data.url) {
        setForm((prev) => ({ ...prev, imageUrl: data.url }))
      } else {
        throw new Error('Invalid upload response')
      }
    } catch (err: any) {
      console.error(err)
      setError('Image upload failed. Please try again.')
    } finally {
      setImageUploading(false)
    }
  }

  const loadOffers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/offers', { cache: 'no-store' })
      const data = await res.json()
      const list = Array.isArray(data) ? data : Array.isArray(data?.offers) ? data.offers : []
      setOffers(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadOffers() }, [])

  const categories = useMemo(
    () => Array.from(new Set(offers.map((o) => (o.category || '').trim()).filter(Boolean))).sort(),
    [offers],
  )
  const payoutTypes = useMemo(
    () => Array.from(new Set(offers.map((o) => (o.payoutType || '').trim()).filter(Boolean))).sort(),
    [offers],
  )

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return offers.filter((o) => {
      if (statusFilter !== 'ALL' && (o.status || '').toUpperCase() !== statusFilter) return false
      if (categoryFilter !== 'ALL' && (o.category || '') !== categoryFilter) return false
      if (payoutTypeFilter !== 'ALL' && (o.payoutType || '') !== payoutTypeFilter) return false
      if (!q) return true
      return [o.id, o.name, o.slug, o.category, o.status, o.payoutType, o.badge]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(q))
    })
  }, [offers, search, statusFilter, categoryFilter, payoutTypeFilter])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setEvents([emptyEvent()])
    setConfig(defaultOfferEventConfig)
    setError('')
    setShowForm(true)
  }

  const openEdit = (offer: Offer) => {
    setEditingId(offer.id)
    setForm({ ...offer, steps: offer.steps && offer.steps.length > 0 ? offer.steps : [''] })
    const parsed = parseOfferEvents(offer.events)
    setConfig(parsed.config)
    setEvents(
      parsed.events.length > 0
        ? parsed.events.map((item) => ({
          name: item.name,
          identifiers: Array.isArray(item.identifiers) ? item.identifiers.join(', ') : item.name,
          displayName: item.displayName || item.name,
          payout: item.payout,
          dailyCap: item.dailyCap ?? null,
          leadCutPercentage: item.leadCutPercentage ?? 0,
        }))
        : [emptyEvent()],
    )
    setError('')
    setShowForm(true)
  }

  const validateEvents = (): string => {
    const names = new Set<string>()
    for (const ev of events) {
      if (!ev.name.trim()) return 'Each event must have a Key (internal name)'
      if (!ev.displayName.trim()) return 'Each event must have a Display Name'
      if (ev.payout < 0) return 'Event payout must be >= 0'
      if (ev.leadCutPercentage < 0 || ev.leadCutPercentage > 100) return 'Lead cut percentage must be between 0 and 100'
      if (names.has(ev.name.trim().toLowerCase())) return 'Event keys must be unique'
      names.add(ev.name.trim().toLowerCase())
    }
    if (events.length < 1) return 'At least 1 event required'

    return ''
  }

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const evErr = validateEvents()
    if (evErr) { setError(evErr); return }

    const payload = {
      ...form,
      slug: form.slug || String(form.name || '').toLowerCase().replace(/\s+/g, '-'),
      steps: (form.steps || []).filter((s) => s && s.trim()),
      events: serializeOfferEvents({
        config,
        events: events.map((ev) => ({
          name: ev.name.trim(),
          identifiers: ev.identifiers
            ? ev.identifiers.split(',').map((id) => id.trim()).filter(Boolean)
            : [ev.name.trim()],
          displayName: ev.displayName.trim() || ev.name.trim(),
          payout: Number(ev.payout),
          dailyCap: ev.dailyCap || null,
          leadCutPercentage: Number(ev.leadCutPercentage ?? 0),
        })),
      }),
    }

    let savedOfferId = editingId
    if (editingId) {
      const res = await fetch(`/api/admin/offers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      savedOfferId = json.offer?.id || editingId
    } else {
      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      savedOfferId = json.offer?.id || null
    }

    const postbackUrl = savedOfferId ? buildPostbackUrl(savedOfferId, config) : ''
    if (postbackUrl) {
      try { await navigator.clipboard.writeText(postbackUrl) } catch { }
    }

    setShowForm(false)
    await loadOffers()
    alert(postbackUrl
      ? `✅ Offer saved!\n\n📋 Postback URL (auto-copied):\n${postbackUrl}\n\nPaste this into the affiliate network's S2S/postback settings.`
      : `✅ Offer saved with ${events.length} events`)
  }

  const onDelete = async (id: number) => {
    if (!confirm('Delete this offer?')) return
    await fetch(`/api/admin/offers/${id}`, { method: 'DELETE' })
    await loadOffers()
  }

  const onToggleStatus = async (offer: Offer) => {
    await fetch(`/api/admin/offers/${offer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: (offer.status || '').toUpperCase() === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
    })
    await loadOffers()
  }

  const copyTablePostback = async (offer: Offer) => {
    const parsed = parseOfferEvents(offer.events)
    const url = buildPostbackUrl(offer.id, parsed.config)
    try {
      await navigator.clipboard.writeText(url)
      setTableCopiedId(offer.id)
      setTimeout(() => setTableCopiedId(null), 2000)
    } catch { }
  }

  const runTestPostback = async () => {
    if (!editingId || !testClickId) return
    setTestLoading(true)
    setTestResult(null)
    try {
      const params = new URLSearchParams({
        [config.postbackUserIdParam || 'clickId']: testClickId,
        [config.postbackEventParam || 'event']: testEvent,
        [config.postbackPayoutParam || 'payout']: testPayout,
      })
      const res = await fetch(`/api/postback?${params.toString()}`)
      const json = await res.json()
      setTestResult(`Status: ${res.status}\n${JSON.stringify(json, null, 2)}`)
    } catch (err) {
      setTestResult(`Error: ${String(err)}`)
    } finally {
      setTestLoading(false)
    }
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

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">ADMIN CAMPAIGNS</p>
            <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">Offers</h1>
            <p className="text-xs text-white/85 mt-1 font-medium">Create, edit, and configure campaign offers and payouts</p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-white text-indigo-600 px-5 py-2.5 text-xs font-black shadow-md hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
          >
            ➕ Add New Offer
          </button>
        </div>
      </div>

      {/* 2. Collapsible Filters Form Card */}
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
            <span className="font-extrabold text-gray-800 text-sm">Filter Offers</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter inputs container */}
        {openFilters && (
          <div className="border-t border-brand-border p-5 bg-gray-50/30">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {/* SEARCH */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SEARCH</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search offers..."
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                />
              </div>

              {/* STATUS */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">STATUS</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>

              {/* CATEGORY */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CATEGORY</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* PAYOUT TYPE */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PAYOUT TYPE</label>
                <select
                  value={payoutTypeFilter}
                  onChange={(e) => setPayoutTypeFilter(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition font-medium text-gray-800 shadow-xs"
                >
                  <option value="ALL">All Payout Types</option>
                  {payoutTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-5 hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white border border-brand-border shadow-sm text-[#1F2937]">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Image</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Slug</th>
              <th className="px-2 py-2">Payout</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Events</th>
              <th className="px-2 py-2">Postback URL</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="px-2 py-4">Loading...</td></tr>
            ) : filteredOffers.map((offer, idx) => {
              const eventCount = parseOfferEvents(offer.events).events.length
              const postbackUrl = buildPostbackUrl(offer.id, parseOfferEvents(offer.events).config)
              return (
                <tr key={offer.id} className={idx % 2 === 0 ? 'bg-white border border-brand-border shadow-sm' : 'bg-brand-bg'}>
                  <td className="px-2 py-2">{offer.id}</td>
                  <td className="px-2 py-2">
                    <img src={offer.imageUrl || '/next.svg'} alt={offer.name} className="h-8 w-8 rounded object-cover" />
                  </td>
                  <td className="px-2 py-2 font-medium">{offer.name}</td>
                  <td className="px-2 py-2 text-brand-textMuted">{offer.slug}</td>
                  <td className="px-2 py-2">₹{offer.publisherPayout ?? 0}</td>
                  <td className="px-2 py-2">{offer.payoutType}</td>
                  <td className="px-2 py-2">{offer.category}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${(offer.status || '').toUpperCase() === 'ACTIVE' ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-brand-textMuted'}`}>
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-2 py-2">{eventCount} event{eventCount !== 1 ? 's' : ''}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => copyTablePostback(offer)}
                      title={postbackUrl}
                      className="rounded border border-brand-border px-2 py-1 text-xs hover:border-purple-500"
                    >
                      {tableCopiedId === offer.id ? '✅ Copied!' : '📋 Copy URL'}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(offer)} className="rounded border border-brand-border px-2 py-1">Edit</button>
                      <button onClick={() => onToggleStatus(offer)} className="rounded border border-brand-border px-2 py-1">
                        {(offer.status || '').toUpperCase() === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </button>
                      <button onClick={() => onDelete(offer.id)} className="rounded border border-red-500/50 px-2 py-1 text-red-300">Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && filteredOffers.length === 0 && (
              <tr><td colSpan={11} className="px-2 py-4 text-center text-brand-textSecondary">No offers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mt-5 space-y-4 md:hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border animate-pulse">Loading...</div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border">No offers found.</div>
        ) : (
          filteredOffers.map((offer) => {
            const eventCount = parseOfferEvents(offer.events).events.length
            return (
              <div
                key={offer.id}
                className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">ID: {offer.id}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      (offer.status || '').toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-650 border border-gray-250'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                  {offer.isLimited && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">PRIVATE</span>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <img src={offer.imageUrl || '/next.svg'} alt={offer.name} className="h-12 w-12 rounded-lg object-cover border border-gray-150 p-0.5 bg-gray-50" />
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{offer.name}</h3>
                    <p className="text-xs text-brand-textMuted font-medium">{offer.slug}</p>
                    <div className="flex gap-2 text-[10px] text-gray-400 font-semibold pt-1">
                      <span className="bg-purple-50 text-purple-700 px-1.5 rounded">{offer.category || 'General'}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-1.5 rounded">{offer.payoutType}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-gray-100 py-3 text-gray-650">
                  <div>
                    <p className="text-gray-405 font-medium">Payout</p>
                    <p className="font-bold text-green-600 text-sm">₹{offer.publisherPayout ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-405 font-medium">Events</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{eventCount} event{eventCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 justify-end">
                  <button
                    onClick={() => copyTablePostback(offer)}
                    className="rounded-lg border border-indigo-500/30 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-705 hover:bg-indigo-100/50 transition-colors"
                  >
                    {tableCopiedId === offer.id ? '✅ Copied!' : '📋 Copy Postback'}
                  </button>
                  <button
                    onClick={() => openEdit(offer)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleStatus(offer)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {(offer.status || '').toUpperCase() === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => onDelete(offer.id)}
                    className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100/50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto max-w-5xl rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Offer' : 'Add Offer'}</h2>
              <button onClick={() => setShowForm(false)} className="text-brand-textMuted hover:text-brand-textPrimary">✖</button>
            </div>

            <form onSubmit={onSave} className="mt-4 space-y-6">

              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[['Name *', 'name'], ['Slug', 'slug'], ['Category', 'category']].map(([label, key]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-brand-textMuted">{label}</label>
                    <input
                      value={String((form as Record<string, unknown>)[key] ?? '')}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted font-bold text-gray-700">Offer Logo/Image</label>
                  <div className="flex items-center gap-3">
                    {form.imageUrl && (
                      <div className="relative h-12 w-12 rounded border border-gray-250 overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                        <img src={form.imageUrl} alt="Offer preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                        className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
                      />
                      {imageUploading && <p className="text-[10px] text-blue-600 font-bold mt-1 animate-pulse">Uploading logo...</p>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Publisher Payout ₹</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    value={String(form.publisherPayout ?? 0)}
                    onChange={(e) => setForm((p) => ({ ...p, publisherPayout: parseNumericInput(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Payout Type</label>
                  <select value={form.payoutType || 'CPA'} onChange={(e) => setForm((p) => ({ ...p, payoutType: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                    <option>CPI</option><option>CPA</option><option>CPS</option><option>CPL</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Status</label>
                  <select value={form.status || 'ACTIVE'} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                    <option>ACTIVE</option><option>PAUSED</option><option>EXPIRED</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Badge</label>
                  <select value={form.badge || 'none'} onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                    <option value="none">None</option>
                    <option>HOT</option><option>NEW</option><option>TREND</option><option>TOP</option><option>BEST</option><option>LIVE</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Access Type</label>
                  <select value={form.isLimited ? 'true' : 'false'} onChange={(e) => setForm((p) => ({ ...p, isLimited: e.target.value === 'true' }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                    <option value="false">All Access (Public)</option>
                    <option value="true">Limited Access (Private)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Sort Order</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(form.sortOrder ?? 0)}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseNumericInput(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-brand-textMuted">Description</label>
                <textarea value={String(form.description ?? '')} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-brand-textMuted">Steps for User</label>
                {(form.steps || ['']).map((step, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-brand-border shadow-sm text-xs">{idx + 1}</span>
                    <input value={step} onChange={(e) => setForm((p) => { const next = [...(p.steps || [''])]; next[idx] = e.target.value; return { ...p, steps: next } })} className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-sm" />
                    {(form.steps || []).length > 1 && (
                      <button type="button" onClick={() => setForm((p) => ({ ...p, steps: (p.steps || []).filter((_, i) => i !== idx) }))} className="text-red-400 hover:text-red-300">✖</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setForm((p) => ({ ...p, steps: [...(p.steps || ['']), ''] }))} className="rounded border border-dashed border-brand-border px-3 py-1 text-xs text-brand-textMuted">+ Add Step</button>
              </div>

              {/* Affiliate Config */}
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
                <p className="text-sm font-semibold text-orange-300">🔗 Affiliate Config</p>
                <p className="mt-1 text-xs text-brand-textMuted">The affiliate URL users will be redirected to. The click ID will be appended automatically.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-brand-textMuted">Affiliate URL *</label>
                    <input value={String(form.affiliateUrl ?? '')} onChange={(e) => setForm((p) => ({ ...p, affiliateUrl: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm font-mono" placeholder="https://source-network.com/click?pid=xxx" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-brand-textMuted">Click ID Param Name</label>
                    <input value={config.affiliateUserIdParam} onChange={(e) => setConfig((p) => ({ ...p, affiliateUserIdParam: e.target.value || 'p1' }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" placeholder="p1" />
                    <p className="mt-1 text-xs text-brand-textSecondary">Appended to affiliate URL: ?{config.affiliateUserIdParam || 'p1'}=CLICK_ID</p>
                  </div>
                </div>
              </div>

              {/* Postback Mapping */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <p className="text-sm font-semibold text-blue-300">📥 Postback Parameter Mapping</p>
                <p className="mt-1 text-xs text-brand-textMuted">Match the exact parameter names the affiliate network sends in their postback. Check their documentation.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['Click ID Param *', 'postbackUserIdParam', 'The param that carries our click ID back, e.g. "aff_sub", "clickId", "s1"'],
                    ['Payout Param', 'postbackPayoutParam', 'The param carrying the payout amount, e.g. "payout", "revenue", "price"'],
                    ['Event Name Param', 'postbackEventParam', 'The param carrying event name, e.g. "event", "goal", "status"'],
                    ['Offer ID Param', 'postbackOfferIdParam', 'The param carrying their offer ID, e.g. "offer_id", "oid"'],
                    ['IP Address Param', 'postbackIpParam', 'The param carrying user IP, e.g. "ip", "user_ip"'],
                    ['Timestamp Param', 'postbackTimestampParam', 'Unix timestamp param, e.g. "tdate", "ts", "time"'],
                    ['Google Ad ID (GAID) Param', 'postbackGaidParam', 'The param carrying Google Advertising ID, e.g. "gaid", "google_aid"'],
                  ].map(([label, key, hint]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-brand-textMuted">{label}</label>
                      <input
                        value={String(config[key as keyof OfferConfigState] ?? '')}
                        onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                      />
                      <p className="mt-0.5 text-xs text-gray-600">{hint}</p>
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs text-brand-textMuted">Secret Key (optional)</label>
                    <input value={config.postbackSecret || ''} onChange={(e) => setConfig((p) => ({ ...p, postbackSecret: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" placeholder="leave empty to skip validation" />
                    <p className="mt-0.5 text-xs text-gray-600">If set, incoming postbacks must include ?secret=this_value</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-brand-textMuted">Verbose Logging</label>
                    <select value={config.verboseLogging ? 'true' : 'false'} onChange={(e) => setConfig((p) => ({ ...p, verboseLogging: e.target.value === 'true' }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                      <option value="false">Off</option>
                      <option value="true">On (logs all postback params to console)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Events */}
              <div className="rounded-xl border border-brand-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">🎪 Events & Payouts</p>
                    <p className="text-xs text-brand-textMuted">Define which events the affiliate network sends and their payouts. Add all possible event name aliases in Identifiers.</p>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {events.map((ev, idx) => (
                    <div key={idx} className="rounded-lg border border-brand-border bg-brand-bg/40 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#1F2937]">Event #{idx + 1}</p>
                        {events.length > 1 && (
                          <button type="button" className="rounded border border-red-500/40 px-2 py-0.5 text-xs text-red-300" onClick={() => setEvents((p) => p.filter((_, i) => i !== idx))}>Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-brand-textMuted">Key (internal) *</label>
                          <input value={ev.name} onChange={(e) => setEvents((p) => p.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" placeholder="e.g. install" />
                          <p className="mt-0.5 text-xs text-gray-600">Internal identifier used in code</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-brand-textMuted">Display Name *</label>
                          <input value={ev.displayName} onChange={(e) => setEvents((p) => p.map((r, i) => i === idx ? { ...r, displayName: e.target.value } : r))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" placeholder="e.g. App Install" />
                          <p className="mt-0.5 text-xs text-gray-600">Shown to publishers in the UI</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs text-brand-textMuted">Identifiers (aliases) *</label>
                          <input value={ev.identifiers} onChange={(e) => setEvents((p) => p.map((r, i) => i === idx ? { ...r, identifiers: e.target.value } : r))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm font-mono" placeholder="install, Install, app_install, INSTALL, 1" />
                          <p className="mt-0.5 text-xs text-brand-textSecondary">
                            ⚠️ Comma-separated list of ALL possible values the affiliate network might send for this event.
                            The postback matches if the incoming event name equals any of these (case-insensitive).
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-brand-textMuted">Payout ₹</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.]?[0-9]*"
                            value={String(ev.payout)}
                            onChange={(e) => setEvents((p) => p.map((r, i) => i === idx ? { ...r, payout: parseNumericInput(e.target.value) } : r))}
                            className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-brand-textMuted">Daily Cap</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={ev.dailyCap ?? ''}
                            onChange={(e) => setEvents((p) => p.map((r, i) => i === idx ? { ...r, dailyCap: e.target.value ? parseNumericInput(e.target.value) : null } : r))}
                            className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                            placeholder="Unlimited"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-brand-textMuted">Lead Cut % (0 = disabled)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={String(ev.leadCutPercentage ?? 0)}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, parseNumericInput(e.target.value)))
                              setEvents((p) => p.map((r, i) => i === idx ? { ...r, leadCutPercentage: v } : r))
                            }}
                            className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setEvents((p) => [...p, emptyEvent()])} className="mt-3 w-full rounded border border-dashed border-brand-border px-3 py-2 text-sm text-brand-textMuted hover:border-purple-500">+ Add Event</button>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              </div>

              {/* Generated Postback URL */}
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <p className="text-sm font-semibold text-green-300">✅ Generated Postback URL</p>
                <p className="mt-1 text-xs text-brand-textMuted">
                  After saving, copy this URL and paste it into the affiliate network's S2S postback / pixel settings.
                  They will call this URL when a conversion happens.
                </p>
                <div className="mt-3 relative">
                  <textarea
                    readOnly
                    rows={3}
                    value={editingId ? buildPostbackUrl(editingId, config) : 'Save the offer first to generate the postback URL.'}
                    className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-xs font-mono"
                  />
                  {editingId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(buildPostbackUrl(editingId, config))
                          setPostbackCopied(true)
                          setTimeout(() => setPostbackCopied(false), 2000)
                        } catch { }
                      }}
                      className="absolute right-2 top-2 rounded bg-green-700 px-2 py-1 text-xs text-brand-textPrimary"
                    >
                      {postbackCopied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  )}
                </div>
                {editingId && (
                  <div className="mt-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-300">
                    <p className="font-semibold">📌 How to use:</p>
                    <p className="mt-1">1. Copy the URL above</p>
                    <p>2. Paste it into the affiliate network's postback/S2S URL field</p>
                    <p>3. The network will call this URL when a user converts</p>
                    <p>4. Your NCCamp server auto-matches the click, credits the publisher, and fires their postback</p>
                  </div>
                )}
              </div>

              {/* Test Postback */}
              {editingId && (
                <div className="rounded-xl border border-brand-border p-4">
                  <p className="text-sm font-semibold">🧪 Test Postback</p>
                  <p className="text-xs text-brand-textMuted mt-1">Simulate an incoming postback to verify your configuration.</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-brand-textMuted">Click ID (must exist in DB)</label>
                      <input value={testClickId} onChange={(e) => setTestClickId(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm font-mono" placeholder="paste a real clickId from camp leads" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-brand-textMuted">Event Name</label>
                      <select value={testEvent} onChange={(e) => setTestEvent(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm">
                        <option value="">Select event...</option>
                        {events.map((ev) => (
                          <option key={ev.name} value={ev.identifiers ? ev.identifiers.split(',')[0].trim() : ev.name}>
                            {ev.displayName || ev.name} ({ev.identifiers ? ev.identifiers.split(',')[0].trim() : ev.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-brand-textMuted">Payout ₹ (optional)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.]?[0-9]*"
                        value={testPayout}
                        onChange={(e) => setTestPayout(e.target.value)}
                        className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm"
                        placeholder="leave empty to use event payout"
                      />
                    </div>
                  </div>
                  <button type="button" onClick={runTestPostback} disabled={!testClickId || testLoading} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {testLoading ? 'Testing...' : '🚀 Fire Test Postback'}
                  </button>
                  {testResult && (
                    <pre className="mt-3 overflow-auto rounded-lg bg-brand-bg p-3 text-xs text-green-300">{testResult}</pre>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-white border border-brand-border shadow-sm px-5 py-2 text-sm font-semibold text-black">
                  {editingId ? 'Save Changes' : 'Create Offer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-brand-border px-4 py-2 text-sm">Cancel</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function buildPostbackUrl(offerId: number | null, config: OfferEventConfig): string {
  if (!offerId) return 'Save the offer first to generate its global postback URL.'
  const origin = typeof window === 'undefined' ? process.env.NEXT_PUBLIC_BASE_URL || '' : window.location.origin
  const pairs: string[] = [
    `${config.postbackUserIdParam || 'clickId'}={${config.postbackUserIdParam || 'clickId'}}`,
    `${config.postbackEventParam || 'event'}={${config.postbackEventParam || 'event'}}`,
    `${config.postbackPayoutParam || 'payout'}={${config.postbackPayoutParam || 'payout'}}`,
    `${config.postbackOfferIdParam || 'offer_id'}={${config.postbackOfferIdParam || 'offer_id'}}`,
    `${config.postbackIpParam || 'ip'}={${config.postbackIpParam || 'ip'}}`,
    `${config.postbackTimestampParam || 'tdate'}={${config.postbackTimestampParam || 'tdate'}}`,
    `${config.postbackGaidParam || 'gaid'}={${config.postbackGaidParam || 'gaid'}}`,
  ]
  if (config.postbackSecret) {
    pairs.push(`secret=${config.postbackSecret}`)
  }
  return `${origin}/api/postback?${pairs.join('&')}`
}
