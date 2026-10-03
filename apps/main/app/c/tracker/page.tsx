'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

type EventSummaryRow = {
  eventKey: string
  displayName: string
  payout: number          // payout per conversion (admin set)
  count: number           // how many times this user hit this event
  totalEarned: number     // count × payout
  lastConvertedAt: string | null
}

type LeadRow = {
  id: number
  eventDisplayName: string
  eventKey: string
  payout: number
  status: string
  approvedAt: string | null
  clickedAt: string
}

type TrackerResponse = {
  success: boolean
  campId: number
  campName: string
  campSlug: string
  offerName: string
  offerImage: string
  eventSummary: EventSummaryRow[]
  leads: LeadRow[]
  totalEarned: number
  totalConversions: number
  error?: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    APPROVED: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Approved' },
    PAID: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Paid' },
    REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rejected' },
  }
  const s = map[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status }
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function TrackerPageContent() {
  const searchParams = useSearchParams()
  const campId = searchParams.get('campId') || ''
  const campSlug = searchParams.get('camp') || ''
  const initialQuery = searchParams.get('q') || searchParams.get('upi') || ''

  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackerResponse | null>(null)
  const [error, setError] = useState('')
  // Toggle between event summary view and detailed history
  const [view, setView] = useState<'summary' | 'history'>('summary')

  const fetchTracker = async (value: string) => {
    if (!value.trim()) { setError('Please enter your UPI ID, mobile number, or click ID'); return }
    if (!campId && !campSlug) { setError('Invalid tracker link'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(
        `/api/tracker?query=${encodeURIComponent(value.trim())}${campId ? `&campId=${encodeURIComponent(campId)}` : ''}${campSlug ? `&camp=${encodeURIComponent(campSlug)}` : ''}`
      )
      const json = await res.json() as TrackerResponse

      if (!res.ok) {
        setError(json.error || 'Failed to load tracking data')
      } else {
        setResult(json)
        const u = new URL(window.location.href)
        u.searchParams.set('q', value.trim())
        window.history.replaceState({}, '', u.toString())
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (initialQuery && (campId || campSlug)) fetchTracker(initialQuery)
  }, [initialQuery, campId, campSlug])

  return (
    <div className="mx-auto max-w-md">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-card shadow-lg">
          <span className="text-2xl">📊</span>
        </div>
        <h1 className="text-2xl font-bold">Track Your Earnings</h1>
        {result?.campName ? (
          <p className="mt-1 text-sm text-brand-textMuted">
            Campaign: <span className="text-brand-textPrimary font-medium">{result.campName}</span>
          </p>
        ) : campSlug ? (
          <p className="mt-1 text-sm text-brand-textMuted">{campSlug}</p>
        ) : null}
      </div>

      {/* UPI input */}
      <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-xl">
        <form
          onSubmit={(e) => { e.preventDefault(); fetchTracker(query) }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="UPI ID, mobile number, or click ID"
            className="w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-brand-textPrimary outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
          >
            {loading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" />
              : 'Track'}
          </button>
        </form>
        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">

          {/* Offer + totals banner */}
          <div className="rounded-2xl border border-brand-border bg-brand-card overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
                <img src={result.offerImage} alt={result.offerName} className="h-full w-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-textPrimary truncate">{result.offerName}</p>
                <p className="text-xs text-brand-textMuted">{result.campName}</p>
              </div>
            </div>
            {result.totalConversions > 0 && (
              <div className="grid grid-cols-2 divide-x divide-brand-border border-t border-brand-border bg-gray-50">
                <div className="p-3 text-center">
                  <p className="text-xl font-bold text-brand-textPrimary">{result.totalConversions}</p>
                  <p className="text-xs text-brand-textMuted mt-0.5">Conversions</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-xl font-bold text-green-600">₹{result.totalEarned.toFixed(2)}</p>
                  <p className="text-xs text-brand-textMuted mt-0.5">Total Earned</p>
                </div>
              </div>
            )}
          </div>

          {/* View toggle — only show if there are conversions */}
          {result.totalConversions > 0 && (
            <div className="flex rounded-xl border border-brand-border bg-brand-card p-1">
              <button
                onClick={() => setView('summary')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'text-brand-textMuted hover:text-white'
                  }`}
              >
                By Event
              </button>
              <button
                onClick={() => setView('history')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-brand-textMuted hover:text-white'
                  }`}
              >
                History
              </button>
            </div>
          )}

          {/* ── EVENT SUMMARY VIEW ─────────────────────────────────── */}
          {view === 'summary' && (
            <div className="space-y-3">
              {result.eventSummary.length === 0 ? (
                <div className="rounded-2xl border border-brand-border bg-brand-card py-12 text-center text-brand-textMuted">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="font-medium text-brand-textPrimary">No conversions yet</p>
                  <p className="text-xs mt-2 px-4 text-brand-textMuted">
                    Complete the offer to earn. Only approved conversions appear here.
                  </p>
                </div>
              ) : (
                result.eventSummary.map((ev) => (
                  <div
                    key={ev.eventKey}
                    className="rounded-2xl border border-brand-border bg-brand-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Event info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {/* Coloured dot — green if at least one conversion, grey if none */}
                          <span className={`h-2 w-2 shrink-0 rounded-full ${ev.count > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <p className="font-semibold text-brand-textPrimary text-sm">{ev.displayName}</p>
                        </div>
                        <p className="mt-1 text-xs text-brand-textMuted">
                          ₹{ev.payout} per conversion
                        </p>
                        {ev.lastConvertedAt && (
                          <p className="mt-0.5 text-xs text-brand-textMuted">
                            Last: {fmt(ev.lastConvertedAt)}
                          </p>
                        )}
                      </div>

                      {/* Count + earned */}
                      <div className="text-right shrink-0">
                        {ev.count > 0 ? (
                          <>
                            <p className="text-lg font-bold text-green-600">
                              ₹{ev.totalEarned.toFixed(2)}
                            </p>
                            <p className="text-xs text-brand-textMuted mt-0.5">
                              {ev.count} × ₹{ev.payout}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-400">0</p>
                            <p className="text-xs text-gray-400">conversions</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── HISTORY VIEW ───────────────────────────────────────── */}
          {view === 'history' && (
            <div className="space-y-3">
              {result.leads.length === 0 ? (
                <div className="rounded-2xl border border-brand-border bg-brand-card py-12 text-center text-brand-textMuted">
                  <p className="text-3xl mb-3">📭</p>
                  <p className="font-medium text-brand-textPrimary">No conversions yet</p>
                </div>
              ) : (
                result.leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-2xl border border-brand-border bg-brand-card p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        {/* Event name as defined by admin */}
                        <span className="inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400 font-medium">
                          {lead.eventDisplayName}
                        </span>
                        <p className="mt-1 text-xs text-brand-textMuted">
                          {fmt(lead.approvedAt || lead.clickedAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="font-bold text-green-600">
                          {lead.payout > 0 ? `₹${lead.payout}` : '—'}
                        </p>
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <p className="text-center text-xs text-brand-textMuted pb-4">
            Showing approved conversions for this campaign only
          </p>
        </div>
      )}

    </div>
  )
}

export default function TrackerPage() {
  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 text-brand-textPrimary font-sans">
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      }>
        <TrackerPageContent />
      </Suspense>
    </div>
  )
}
