'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type Offer = {
  id: string | number
  name: string
  description?: string | null
  imageUrl?: string | null
  badge?: string | null
  payoutType?: string | null
  category?: string | null
  status?: string | null
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 z-[90] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-xl">
      {message}
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
  }),
}

function OfferSkeleton() {
  return <div className="h-72 animate-pulse rounded-[1.7rem] border border-slate-200 bg-white shadow-sm" />
}

export default function PartnerLandingPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loadingOffers, setLoadingOffers] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    const loadOffers = async () => {
      try {
        const res = await fetch('/api/offers', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch offers')
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.offers) ? data.offers : []
        const top = list
          .filter((item: Offer) => (item.status ?? 'ACTIVE').toUpperCase() === 'ACTIVE')
          .slice(0, 6)
        if (alive) setOffers(top)
      } catch {
        if (alive) setToast('Using fallback partner page data.')
      } finally {
        if (alive) setLoadingOffers(false)
      }
    }

    void loadOffers()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f8fc] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_15%_10%,_rgba(56,189,248,0.14),_transparent_24%),radial-gradient(circle_at_85%_12%,_rgba(16,185,129,0.14),_transparent_22%),linear-gradient(180deg,_#ffffff,_#f6f8fc_60%)]" />

      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
              NC
            </span>
            <div>
              <p className="font-bold text-slate-950">PartnerNCCamp</p>
              <p className="text-xs text-slate-500">Performance panel for publishers</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/partner/login"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Log In
            </Link>
            <Link
              href="/partner/register"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:pb-14 md:pt-20">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Publisher-first workflow
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.04em] text-slate-950 md:text-7xl">
              Your Indian affiliate network, with cleaner tracking.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Promote approved offers, generate your tracking links, review every conversion event,
              and keep withdrawals visible from request to payout.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/partner/register"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Sign Up
              </Link>
              <Link
                href="/partner/login"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5"
              >
                Log In
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                ['100+', 'Active Partners'],
                ['Rs 2L+', 'Paid Out'],
                ['250+', 'Offers Served'],
                ['Flexible', 'Payment Cycle'],
              ].map(([title, subtitle]) => (
                <div key={subtitle} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-3xl font-black tracking-[-0.04em] text-slate-950">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.12}
            variants={fadeUp}
            className="relative"
          >
            <div className="absolute -right-5 top-6 h-28 w-28 rounded-full bg-cyan-300/25 blur-3xl" />
            <div className="absolute left-0 top-16 h-32 w-32 rounded-full bg-emerald-300/25 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,_rgba(2,6,23,0.98),_rgba(30,41,59,0.96)_38%,_rgba(5,150,105,0.85)_100%)] p-6 text-white shadow-[0_30px_70px_rgba(15,23,42,0.22)] md:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Partner panel snapshot</p>
                  <p className="mt-2 text-2xl font-black md:text-3xl">Offers, events, wallet, postback.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs text-white/60">Live status</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-300">Conversions credited</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    ['Clicks', '2,481'],
                    ['Conversions', '324'],
                    ['Balance', 'Rs 18,420'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">{label}</p>
                      <p className="mt-2 text-xl font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">Built for clarity</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      'Approved offers only',
                      'Event-based conversion history',
                      'Ledger-backed wallet totals',
                      'Publisher postback macros',
                    ].map((item) => (
                      <div key={item} className="rounded-xl bg-slate-950/25 px-4 py-3 text-sm font-medium text-white/85">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">How It Works</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
                Simple enough to use daily.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              The partner panel is built around approved offers, clean event tracking, and predictable payout movement.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['01', 'Register and get approved', 'Create your account, complete onboarding, and wait for admin approval.'],
              ['02', 'Promote with tracking links', 'Use your offer links, add optional parameters, and monitor conversions per event.'],
              ['03', 'Withdraw with visibility', 'As balance grows, submit withdrawal requests and track each request through admin action.'],
            ].map(([num, title, desc], index) => (
              <motion.div
                key={num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                custom={index * 0.08}
                variants={fadeUp}
                className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-[0.24em] text-slate-400">{num}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Step
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Featured Offers</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
                Promote offers that are already moving.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              A preview of active campaigns available inside the partner ecosystem.
            </p>
          </div>

          {loadingOffers ? (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <OfferSkeleton key={idx} />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="mt-8 rounded-[1.7rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              No active offers available right now.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offers.map((offer, index) => (
                <motion.article
                  key={offer.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.25 }}
                  custom={index * 0.06}
                  variants={fadeUp}
                  className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      {(offer.badge || 'LIVE').toString()}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {(offer.payoutType || 'CPA').toString()}
                    </span>
                  </div>
                  <img
                    src={offer.imageUrl || '/logo.jpeg'}
                    alt={offer.name}
                    className="mt-4 h-40 w-full rounded-2xl object-cover"
                  />
                  <h3 className="mt-4 text-xl font-bold text-slate-950">{offer.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {(offer.description || '').slice(0, 110)}
                    {(offer.description || '').length > 110 ? '...' : ''}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-600">
                      {(offer.category || 'General').toString()}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                      Active
                    </span>
                  </div>
                  <Link
                    href="/partner/login"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Promote This Offer
                  </Link>
                </motion.article>
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(120deg,_#082f49,_#0f172a_45%,_#164e63)] p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Start now</p>
                <h3 className="mt-3 text-3xl font-black tracking-[-0.03em] md:text-5xl">
                  Join the partner side of NCCamp.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                  Build your traffic with approved offers, event-based conversions, and a cleaner payment workflow.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/partner/register"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Create Account
                </Link>
                <Link
                  href="/partner/login"
                  className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur"
                >
                  Open Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl text-sm text-slate-500">
          <p className="font-semibold text-slate-950">PartnerNCCamp</p>
          <p className="mt-1">Affiliate growth platform for Indian publishers, marketers, and creators.</p>
        </div>
      </footer>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
