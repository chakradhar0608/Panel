'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type PlatformStats = {
  campsCompleted: number
  activeUsers: number
  totalPaidLakh: number
  successRate: number
}

const DEFAULT_STATS: PlatformStats = {
  campsCompleted: 100,
  activeUsers: 2000,
  totalPaidLakh: 2.3,
  successRate: 96,
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-4 right-4 z-[70] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-xl">
      {message}
    </div>
  )
}

function StatNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const duration = 1200

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(value * progress)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
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

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLoader, setShowLoader] = useState(true)
  const [progress, setProgress] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const start = performance.now()
    let frame = 0

    const animate = (now: number) => {
      const next = Math.min(((now - start) / 1500) * 100, 100)
      setProgress(next)
      if (next < 100) {
        frame = requestAnimationFrame(animate)
      } else {
        setTimeout(() => setShowLoader(false), 250)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    let alive = true

    const loadStats = async () => {
      try {
        const res = await fetch('/api/platform-stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed')
        const data = (await res.json()) as PlatformStats
        if (alive) setStats(data)
      } catch {
        if (alive) {
          setStats(DEFAULT_STATS)
          setToast('Using fallback platform stats.')
        }
      } finally {
        if (alive) setStatsLoading(false)
      }
    }

    void loadStats()
    return () => {
      alive = false
    }
  }, [])

  const activeUsersText = useMemo(() => {
    if (stats.activeUsers >= 1000) {
      const value = stats.activeUsers / 1000
      return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}k+`
    }
    return `${stats.activeUsers}+`
  }, [stats.activeUsers])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-900">
      <AnimatePresence>
        {showLoader ? (
          <motion.div
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#f4f7fb]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <img src="/logo.jpeg" alt="NCCamp" className="h-16 w-auto rounded-2xl shadow-lg" />
            <p className="mt-5 text-xs uppercase tracking-[0.35em] text-slate-500">Loading NCCamp</p>
            <div className="mt-5 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.18),_transparent_28%),linear-gradient(180deg,_#ffffff,_#f4f7fb_55%)]" />

      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="NCCamp" className="h-10 w-10 rounded-xl shadow-sm" />
            <div>
              <p className="text-sm font-bold tracking-wide text-slate-900">NCCamp</p>
              <p className="text-xs text-slate-500">Affiliate network for India</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              How It Works
            </a>
            <a href="#contact" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
              Contact
            </a>
            <Link
              href="/partner"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Become Our Partner
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? 'Close' : 'Menu'}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <a href="#how-it-works" onClick={() => setMobileOpen(false)}>
                How It Works
              </a>
              <a href="#contact" onClick={() => setMobileOpen(false)}>
                Contact
              </a>
              <Link
                href="/partner"
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-center font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Become Our Partner
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 md:grid-cols-[0.98fr_1.02fr] md:px-6 md:pb-16 md:pt-20">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
              Real offers. Real payouts.
            </div>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[0.95] tracking-[-0.04em] text-slate-950 md:text-7xl">
              Earn from affiliate campaigns without the guesswork.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              NCCamp gives you live offers, fixed cashback flows, clean tracking, and fast support.
              Complete campaigns, grow referrals, and track every result in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/partner"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Open Partner Panel
              </Link>
              <a
                href="https://t.me/NcCampaignsofficial"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-400"
              >
                Join Telegram
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-slate-600 md:text-sm">
              {['Trusted campaigns', 'Instant UPI support', 'Transparent tracking', 'Responsive team'].map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  {item}
                </span>
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
            <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-cyan-300/30 blur-3xl" />
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-400/25 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(37,99,235,0.92)_46%,_rgba(34,197,94,0.72)_100%)] p-6 text-white shadow-[0_32px_80px_rgba(15,23,42,0.24)] md:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Affiliate Control Room</p>
                  <p className="mt-2 text-2xl font-bold md:text-3xl">Track clicks, events, and payouts with clarity.</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <p className="text-xs text-white/60">Live payout</p>
                  <p className="mt-1 text-2xl font-black">Rs 25</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">Inside NCCamp</p>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Campaign Flow', 'Live campaigns go through a clean tracking path'],
                      ['Tracking Ready', 'Internal click IDs keep every result mapped'],
                      ['Payout Routing', 'Wallet credits and partner postbacks stay aligned'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-950/25 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">Why people stay</p>
                    <div className="mt-4 space-y-4">
                      {[
                        ['Offer access', 'Live campaigns with fixed payout mapping'],
                        ['Tracking', 'Every click stored with internal IDs'],
                        ['Support', 'Fast Telegram and panel-based communication'],
                      ].map(([title, desc]) => (
                        <div key={title}>
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-white/70">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-white px-5 py-4 text-slate-900">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Publisher note</p>
                    <p className="mt-2 text-sm font-medium leading-6">
                      "The panel feels simple, the postback model is predictable, and tracking data is usable."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-6 md:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-[1.7rem] border border-slate-200 bg-white shadow-sm" />
                ))
              : [
                  {
                    label: 'Camps completed',
                    value: <StatNumber value={stats.campsCompleted} suffix="+" />,
                  },
                  {
                    label: 'Active users',
                    value: <span>{activeUsersText}</span>,
                  },
                  {
                    label: 'Paid to users',
                    value: <StatNumber value={stats.totalPaidLakh} prefix="Rs " suffix=" Lakh+" decimals={1} />,
                  },
                  {
                    label: 'Success rate',
                    value: <StatNumber value={stats.successRate} suffix="%" />,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                  >
                    <div className="text-4xl font-black tracking-[-0.04em] text-slate-950">{item.value}</div>
                    <p className="mt-2 text-sm text-slate-500">{item.label}</p>
                  </div>
                ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">How It Works</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
                Built for clean execution, not chaos.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">
              From campaign discovery to payout confirmation, the flow stays simple. Users act, NCCamp tracks, and results stay visible.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {[
              ['01', 'Join the community', 'Open offers, updates, and campaign alerts from the NCCamp ecosystem.'],
              ['02', 'Start a task', 'Pick live campaigns with clear steps and fixed event mappings.'],
              ['03', 'Track the result', 'Internal click IDs keep the tracking and payout logic reliable.'],
              ['04', 'Get credited', 'Approved results reflect in wallet and withdrawal workflows cleanly.'],
            ].map(([num, title, desc], index) => (
              <motion.div
                key={num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.35 }}
                custom={index * 0.08}
                variants={fadeUp}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
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
      </main>

      <footer id="contact" className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3 md:px-6">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="NCCamp" className="h-10 w-10 rounded-xl shadow-sm" />
              <div>
                <p className="font-bold text-slate-950">NCCamp</p>
                <p className="text-sm text-slate-500">Affiliate platform for real campaigns</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              India-focused affiliate platform with campaign tracking, partner workflows, and payout visibility.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Quick Links</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700">
              <Link href="/">Home</Link>
              <Link href="/partner">Partner Panel</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Contact</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>Telegram:- @NcCampaignsofficial</p>
              <p>Email:- ncpatnersads@gmail.com</p>
              <p>Contact number:- 9398226539</p>
            </div>
          </div>
        </div>
      </footer>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
