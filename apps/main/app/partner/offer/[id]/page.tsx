'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type CapInfo = { used: number; cap: number }

type Offer = {
  id: number
  publisherId: number
  name: string
  imageUrl: string | null
  payoutType: string | null
  category: string | null
  badge: string | null
  description: string | null
  events: string
  steps: string
  approvalStatus?: string
  capUsage?: Record<string, CapInfo>
}

type EventRow = {
  name: string
  identifiers?: string[]
  displayName?: string
  payout: number
  dailyCap?: number | null
}

// ─── Clipboard helper ───────────────────────────────────────────────────────
function useCopyToast() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch { /* ignore */ }
  }
  return { copiedKey, copy }
}

// ─── Daily cap text ─────────────────────────────────────────────────────────
function CapText({ cap, used }: { cap: number | null | undefined; used: number }) {
  if (!cap || cap <= 0) return <span className="text-sm font-semibold text-gray-400">∞</span>
  const remaining = Math.max(0, cap - used)
  const pct = Math.min(100, (used / cap) * 100)
  const color = remaining === 0 ? 'text-red-600' : pct >= 80 ? 'text-red-500' : 'text-gray-800'
  return <span className={`text-sm font-semibold ${color}`}>{remaining}</span>
}

export default function PartnerOfferDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [customParams, setCustomParams] = useState<Record<string, string>>({})
  const [requesting, setRequesting] = useState(false)
  const { copiedKey, copy } = useCopyToast()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/partner/offers/${params.id}`, { cache: 'no-store' })
      const json = await res.json()
      setOffer(json.offer || null)
      setLoading(false)
    }
    void load()
  }, [params.id])

  const events = useMemo(() => parseOfferEvents(offer?.events).events as EventRow[], [offer?.events])

  const steps = useMemo(() => {
    try {
      const parsed = JSON.parse(offer?.steps || '[]')
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch { return [] }
  }, [offer?.steps])

  const baseTrackingLink = useMemo(() => {
    if (!offer || offer.approvalStatus !== 'APPROVED') return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/go?o=${offer.id}&a=${offer.publisherId}`
  }, [offer])

  const trackingLink = useMemo(() => {
    if (!baseTrackingLink) return ''
    const url = new URL(baseTrackingLink)
    for (const [key, value] of Object.entries(customParams)) {
      if (value.trim()) url.searchParams.set(key.toLowerCase(), value.trim())
    }
    return url.toString()
  }, [baseTrackingLink, customParams])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const tags = useMemo(() => {
    const t: string[] = []
    if (offer?.payoutType) t.push(offer.payoutType)
    if (offer?.category)   t.push(offer.category)
    return t
  }, [offer])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-36 animate-pulse rounded-2xl bg-gray-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
      </div>
    )
  }

  if (!offer) return <p className="text-gray-400 p-4">Offer not found</p>

  return (
    <div className="space-y-4 pb-8">

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Offers
      </button>

      {/* ── Hero / Header card ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #0F0C29 0%, #1a1650 40%, #302b63 70%, #24243e 100%)' }}
      >
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-purple-500/20 blur-xl" />

        <div className="relative flex items-start gap-4">
          <div className="shrink-0">
            <img
              src={offer.imageUrl || '/next.svg'}
              alt={offer.name}
              className="h-16 w-16 rounded-xl object-cover shadow-lg ring-2 ring-white/20"
              onError={(e) => { (e.target as HTMLImageElement).src = '/next.svg' }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
              <span className="text-xs font-medium text-white/50">ID #{offer.id}</span>
            </div>
            <h1 className="text-xl font-extrabold leading-tight text-white tracking-tight">
              {offer.name}
            </h1>
            {tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tracking Link card ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        {offer.approvalStatus === 'APPROVED' ? (
          <>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="font-bold text-gray-900">Your Tracking Link</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="break-all font-mono text-xs text-indigo-700 select-all leading-relaxed">
                {trackingLink}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition"
              >
                {linkCopied ? (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
              <a
                href={trackingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 active:bg-emerald-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open
              </a>
            </div>

            <button
              onClick={() => setShowParams((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {showParams ? 'Hide Parameters' : 'Add Custom Parameters'}
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${showParams ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showParams && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {['p1', 'p2', 'p3', 'p4', 'p5'].map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {key}
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
                      placeholder={key}
                      value={customParams[key] || ''}
                      onChange={(e) => setCustomParams((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900">Offer Access</p>
            </div>
            <div className={`rounded-xl p-4 text-sm font-medium ${
              offer.approvalStatus === 'PENDING'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : offer.approvalStatus === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
            }`}>
              {offer.approvalStatus === 'PENDING'
                ? '⏳ Request pending. Your tracking link will unlock after admin approval.'
                : offer.approvalStatus === 'REJECTED'
                  ? '❌ Your previous request was rejected. You can send a new request below.'
                  : '🔒 Request access to this offer. Admin approval is required before tracking links are enabled.'}
            </div>
            {offer.approvalStatus !== 'PENDING' && offer.approvalStatus !== 'APPROVED' && (
              <button
                onClick={async () => {
                  setRequesting(true)
                  await fetch(`/api/partner/offers/${offer.id}/request`, { method: 'POST' })
                  const res = await fetch(`/api/partner/offers/${offer.id}`, { cache: 'no-store' })
                  const json = await res.json()
                  setOffer(json.offer || null)
                  setRequesting(false)
                }}
                disabled={requesting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {requesting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Requesting...
                  </>
                ) : 'Request Offer Access'}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Events & Payouts card ── */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="font-bold text-gray-900">Events &amp; Payouts</p>
          </div>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-500">
            {events.length} Event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table header */}
        <div
          className="grid grid-cols-[1fr_90px_90px] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
          style={{ background: 'linear-gradient(90deg, #4F46E5 0%, #6366F1 60%, #8B5CF6 100%)' }}
        >
          <span>Event</span>
          <span className="text-right">Payout</span>
          <span className="text-right">Daily Caps</span>
        </div>

        {/* Event rows */}
        <div className="divide-y divide-gray-100">
          {events.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">No events configured</p>
          ) : events.map((event, idx) => {
            const key = event.displayName || event.name
            const capInfo = offer.capUsage?.[key]
            const cap = event.dailyCap ?? null
            const used = capInfo?.used ?? 0

            return (
              <div
                key={idx}
                className="grid grid-cols-[1fr_90px_90px] items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
              >
                {/* Event name + tap to copy */}
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{key}</p>
                  <button
                    onClick={() => copy(key, key)}
                    className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-500 active:text-indigo-700 transition-colors"
                  >
                    {copiedKey === key ? (
                      <>
                        <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Tap to copy
                      </>
                    )}
                  </button>
                </div>

                {/* Payout */}
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600">
                    ₹{Number(event.payout).toFixed(2)}
                  </span>
                </div>

                {/* Cap */}
                <div className="text-right">
                  <CapText cap={cap} used={used} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Offer Description card ── */}
      {steps.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-lg">
              📋
            </div>
            <p className="font-bold text-gray-900">Offer Description</p>
          </div>
          <ol className="space-y-3">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span className="text-sm leading-relaxed text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
          {offer.description && (
            <p className="mt-4 border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-500">
              {offer.description}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="pb-2 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} NC Partners | Affiliate Network
        <br />
        <span className="text-gray-300">Crafted with ❤️ for Partners</span>
      </p>
    </div>
  )
}