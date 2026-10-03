'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Offer = {
  id: string | number
  name: string
  slug: string
  imageUrl?: string | null
  userCashback?: number | string | null
  referralCommission?: number | string | null
  status?: string | null
}

function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 z-[90] rounded-xl border border-brand-border bg-brand-card px-4 py-3 text-sm text-brand-textPrimary shadow-lg">
      {message}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-4">
      <div className="h-40 animate-pulse rounded-xl bg-brand-card" />
      <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-brand-card" />
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-brand-card" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-brand-card" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-brand-card" />
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-brand-card" />
      </div>
    </div>
  )
}

function toAmount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem('nccamp_channels_dismissed')
    if (!dismissed) setShowJoinModal(true)
  }, [])

  useEffect(() => {
    let alive = true

    const loadOffers = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/offers', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch offers')
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.offers) ? data.offers : []

        const normalized: Offer[] = list
          .filter((item: Offer) => (item.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE')
          .map((item: Offer) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            imageUrl: item.imageUrl ?? '/next.svg',
            userCashback: item.userCashback ?? 0,
            referralCommission: item.referralCommission ?? 0,
            status: item.status ?? 'ACTIVE',
          }))

        if (alive) setOffers(normalized)
      } catch {
        if (alive) setToast('Something went wrong. Please try again.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void loadOffers()
    return () => {
      alive = false
    }
  }, [])

  const subtitleWords = useMemo(() => ['LIVE', 'HOT', 'TRENDING', 'VERIFIED'], [])
  const [subtitleIndex, setSubtitleIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % subtitleWords.length)
    }, 1100)
    return () => clearInterval(timer)
  }, [subtitleWords.length])

  const closeModal = () => {
    sessionStorage.setItem('nccamp_channels_dismissed', '1')
    setShowJoinModal(false)
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary">
      {showJoinModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-card p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold">Join Our Channels!</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-brand-border px-2 py-1 text-sm"
                aria-label="Close"
              >
                X
              </button>
            </div>
            <p className="mt-2 text-sm text-brand-textMuted">
              Join our official channels to get instant updates on new campaigns and payouts.
            </p>
            <div className="mt-5 grid gap-3">
              <a
                href="https://t.me/nccamps"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-brand-card px-4 py-3 text-center text-sm font-semibold"
              >
                Join Telegram Channel
              </a>
              <a
                href="https://whatsapp.com/channel/0029VaSampleLink"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-brand-border px-4 py-3 text-center text-sm font-semibold"
              >
                Join WhatsApp Channel
              </a>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-brand-border bg-brand-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 md:px-6">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-card px-2 py-1 text-xs font-bold">NC</span>
            <span className="font-semibold">NCCamp</span>
          </div>
          <h1 className="text-2xl font-extrabold md:text-3xl">NCCamp LIVE OFFER LIST</h1>
          <motion.p
            key={subtitleWords[subtitleIndex]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-brand-textMuted md:text-base"
          >
            Fresh campaigns, high payouts, and {subtitleWords[subtitleIndex]} opportunities.
          </motion.p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-brand-border bg-brand-card p-8 text-center text-brand-textMuted">
            No active offers available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <article
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-4"
              >
                <img
                  src={offer.imageUrl || '/next.svg'}
                  alt={offer.name}
                  className="h-40 w-full rounded-xl object-cover"
                />
                <h2 className="mt-4 text-lg font-bold text-brand-textPrimary">{offer.name}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                    Cashback Rs {toAmount(offer.userCashback)}
                  </span>
                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300">
                    Referral Rs {toAmount(offer.referralCommission)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/c/o?camp=${encodeURIComponent(offer.slug)}`}
                    className="rounded-lg bg-brand-card px-3 py-2 text-center text-sm font-semibold"
                  >
                    Claim
                  </Link>
                  <Link
                    href={`/c/Reffer?offer=${encodeURIComponent(offer.slug)}`}
                    className="rounded-lg border border-brand-border px-3 py-2 text-center text-sm font-semibold"
                  >
                    Refer
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-brand-border bg-brand-bg px-4 py-6 text-center text-xs text-[#A9A9BE] md:px-6">
        (c) 2025 NCCamp. All rights reserved.
      </footer>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
