'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type CapInfo = { used: number; cap: number }

type Offer = {
  id: number
  name: string
  imageUrl: string | null
  category: string | null
  payoutType: string | null
  publisherPayout: number
  events: string
  approvalStatus?: string
  capReached?: boolean
  capUsage?: Record<string, CapInfo>
}

export default function PartnerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openFilters, setOpenFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [activeSearch, setActiveSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [approvalPending, setApprovalPending] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/partner/offers', { cache: 'no-store' })
      if (!res.ok) {
        if (res.status === 403) {
          setApprovalPending(true)
          setOffers([])
          return
        }
        throw new Error('Failed')
      }
      const json = await res.json()
      setApprovalPending(false)
      setOffers(json.offers || [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    setCurrentTime(new Date().toLocaleString())
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Derive categories dynamically from loaded offers (no hardcoding)
  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const o of offers) {
      if (o.category) cats.add(o.category)
    }
    return ['All', ...Array.from(cats).sort()]
  }, [offers])

  const filtered = useMemo(() => {
    return offers.filter((offer) => {
      const byCategory = activeCategory === 'All' || (offer.category || '').toLowerCase() === activeCategory.toLowerCase()
      const bySearch = !activeSearch || offer.name.toLowerCase().includes(activeSearch.toLowerCase())
      return byCategory && bySearch
    })
  }, [offers, activeCategory, activeSearch])

  return (
    <div className="space-y-4">
      {approvalPending ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Your account is pending admin approval. Offers will unlock after approval.</div> : null}

      {/* Premium Centered Header Card */}
      <div className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative flex flex-col items-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-brand-textPrimary tracking-tight">Active Offers</h1>
          <p className="text-sm text-brand-textMuted mt-1">Browse and promote available offers</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs font-bold">
            <span className="rounded-full bg-blue-100/70 text-blue-700 px-3 py-1 flex items-center gap-1 shadow-sm">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              TOTAL {filtered.length} OFFERS
            </span>
            <span className="text-brand-textMuted flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 shadow-sm">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {currentTime}
            </span>
          </div>
        </div>
      </div>

      {/* Styled Collapsible Filter Offers Card */}
      <div className="rounded-2xl border border-brand-border bg-white shadow-sm overflow-hidden">
        <button className="flex w-full items-center justify-between px-5 py-4 text-brand-textPrimary hover:bg-gray-50/50 transition" onClick={() => setOpenFilters((v) => !v)}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-sm">Filter Offers</span>
          </div>
          <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${openFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openFilters ? (
          <div className="grid grid-cols-1 gap-3 border-t border-brand-border p-5 md:grid-cols-4 bg-gray-50/30">
            {/* Dynamic categories from DB */}
            <select
              className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offers..."
              className="rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
              onClick={() => { setActiveSearch(search); setActiveCategory(category) }}
            >
              Apply
            </button>
            <button
              className="rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              onClick={() => { setSearch(''); setCategory('All'); setActiveSearch(''); setActiveCategory('All') }}
            >
              Reset
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}

      {/* Offers Card List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white border border-brand-border rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 w-2/3">
                <div className="h-14 w-14 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="space-y-2 w-full">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 w-20 flex flex-col items-end">
                <div className="h-5 bg-gray-200 rounded w-full" />
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-brand-textMuted shadow-sm flex flex-col items-center">
            <svg className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="font-semibold text-gray-700">No offers available</p>
            <p className="text-sm text-gray-400 mt-0.5">Try adjusting your filter options</p>
          </div>
        ) : (
          filtered.map((offer) => {
            return (
              <div
                key={offer.id}
                className={`flex items-start justify-between bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition ${
                  'border-brand-border hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-14 w-14 flex-shrink-0 rounded-2xl border border-gray-100 bg-white p-1 flex items-center justify-center shadow-sm mt-0.5">
                    <img src={offer.imageUrl || '/next.svg'} className="h-full w-full rounded-xl object-contain" alt={offer.name} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-gray-900 text-base truncate">{offer.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className="rounded bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-100/50">#{offer.id}</span>
                      <span className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 uppercase border border-blue-100/50">{offer.payoutType || 'CPA'}</span>
                      {offer.category && (
                        <span className="rounded bg-purple-100/50 text-purple-700 px-2 py-0.5 uppercase border border-purple-200/30">{offer.category}</span>
                      )}
                    </div>


                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0 ml-4">
                  <p className="text-lg font-extrabold text-emerald-600">₹{Number(offer.publisherPayout).toFixed(2)}</p>
                  <Link
                    className="rounded-xl border border-blue-200 bg-white px-3.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition flex items-center gap-1 shadow-sm"
                    href={`/partner/offer/${offer.id}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}