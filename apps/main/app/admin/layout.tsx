'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/admin/login'
  const [checking, setChecking] = useState(!isLoginPage)
  const [adminEmail, setAdminEmail] = useState('admin@nccamp.in')
  const [campLeadPending, setCampLeadPending] = useState(0)
  const [withdrawalPending, setWithdrawalPending] = useState(0)
  const [offerRequestPending, setOfferRequestPending] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])
  useEffect(() => {
    if (isLoginPage) {
      setChecking(false)
      return
    }

    const tokenExists = document.cookie.split('; ').some((item) => item.startsWith('admin_token='))
    if (!tokenExists) {
      router.replace('/admin/login')
      return
    }

    fetch('/api/admin/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('unauthorized')
        const data = await res.json()
        if (data?.email) setAdminEmail(data.email)
      })
      .catch(() => {
        router.replace('/admin/login')
      })
      .finally(() => setChecking(false))
  }, [isLoginPage, router])

  useEffect(() => {
    if (isLoginPage) return

    let alive = true
    const loadBadges = async () => {
      try {
        const [campRes, withdrawalRes, offerRequestRes] = await Promise.all([
          fetch('/api/admin/camp-leads?summary=true', { cache: 'no-store' }),
          fetch('/api/admin/withdrawal-requests?summary=true', { cache: 'no-store' }),
          fetch('/api/admin/offer-requests?summary=true', { cache: 'no-store' }),
        ])

        const campJson = await campRes.json()
        const withdrawalJson = await withdrawalRes.json()
        const offerRequestJson = await offerRequestRes.json()

        if (!alive) return
        setCampLeadPending(Number(campJson?.pendingApproval || 0))
        setWithdrawalPending(Number(withdrawalJson?.totalPendingCount || 0))
        setOfferRequestPending(Number(offerRequestJson?.totalPendingCount || 0))
      } catch {
        if (!alive) return
        setCampLeadPending(0)
        setWithdrawalPending(0)
        setOfferRequestPending(0)
      }
    }

    void loadBadges()
    const interval = setInterval(loadBadges, 60_000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [isLoginPage])

  const onLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => null)
    } finally {
      document.cookie = 'admin_token=; Max-Age=0; path=/'
      router.push('/admin/login')
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-brand-textPrimary">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-brand-purple" />
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  const itemClass = 'block rounded-xl px-3 py-2 text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
  const activeItemClass = 'block rounded-lg px-3 py-2 bg-gradient-to-r from-[#4F46E5] to-[#2563EB] font-semibold text-white'

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="hidden min-h-screen w-72 flex-col border-r border-brand-border bg-brand-card p-4 lg:flex">
          <div className="mb-6 flex items-center gap-2">
            <img src="/logo.jpeg" alt="NCCamp Admin" className="h-10 w-auto object-contain drop-shadow-sm" />
          </div>
          <nav className="space-y-2 text-sm">
            <Link href="/admin" className={pathname === '/admin' ? activeItemClass : itemClass}>Dashboard</Link>
            <Link href="/admin/offers" className={pathname === '/admin/offers' ? activeItemClass : itemClass}>Offers</Link>
            <Link href="/admin/offer-access" className={pathname === '/admin/offer-access' ? activeItemClass : itemClass}>Offer Access</Link>

            <Link href="/admin/camp-leads" className={`${pathname === '/admin/camp-leads' ? activeItemClass : itemClass} flex items-center justify-between`}>
              <span>Camp Leads</span>
              {campLeadPending > 0 ? <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{campLeadPending}</span> : null}
            </Link>
            <Link href="/admin/conversions" className={pathname === '/admin/conversions' ? activeItemClass : itemClass}>Conversions</Link>
            <Link href="/admin/client-reports" className={pathname === '/admin/client-reports' ? activeItemClass : itemClass}>Client Reports</Link>
            <Link href="/admin/lead-cuts" className={pathname === '/admin/lead-cuts' ? activeItemClass : itemClass}>Lead Cut Stats</Link>
            <Link href="/admin/postbacks-received" className={pathname === '/admin/postbacks-received' ? activeItemClass : itemClass}>Postbacks Received</Link>
            <Link href="/admin/publishers" className={pathname === '/admin/publishers' ? activeItemClass : itemClass}>Publishers</Link>
            <Link href="/admin/offer-requests" className={`${pathname === '/admin/offer-requests' ? activeItemClass : itemClass} flex items-center justify-between`}>
              <span>Offer Requests</span>
              {offerRequestPending > 0 ? <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{offerRequestPending}</span> : null}
            </Link>
            <Link href="/admin/withdrawals" className={`${pathname === '/admin/withdrawals' ? activeItemClass : itemClass} flex items-center justify-between`}>
              <span>Withdrawals</span>
              {withdrawalPending > 0 ? <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{withdrawalPending}</span> : null}
            </Link>
            <Link href="/admin/tickets" className={pathname === '/admin/tickets' ? activeItemClass : itemClass}>Tickets</Link>

            <Link href="/admin/settings" className={pathname === '/admin/settings' ? activeItemClass : itemClass}>Settings</Link>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 w-full rounded-xl border border-brand-border px-3 py-2 text-left text-sm text-brand-textSecondary hover:bg-gray-50"
            >
              Logout
            </button>
          </nav>
          <div className="mt-auto rounded-xl border border-brand-border bg-brand-card p-3 text-xs text-brand-textMuted">
            <p className="font-semibold text-brand-textPrimary">{adminEmail}</p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-card/95 p-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.jpeg" alt="NCCamp Admin" className="h-8 w-auto object-contain drop-shadow-sm" />
              </div>
              <button
                onClick={() => setMobileNavOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-gray-50 text-lg text-brand-textSecondary"
              >
                ☰
              </button>
            </div>
          </header>

          {/* Mobile Nav Overlay */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setMobileNavOpen(false)}
              />

              {/* Drawer */}
              <div className="relative flex h-full w-full max-w-xs flex-col bg-white shadow-2xl transition duration-300 ease-in-out">
                <div className="flex items-center justify-between border-b border-brand-border px-4 py-6">
                  <div className="flex items-center gap-2">
                    <img src="/logo.jpeg" alt="NCCamp Admin" className="h-8 w-auto object-contain drop-shadow-sm" />
                  </div>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center text-xl text-brand-textSecondary"
                  >
                    &times;
                  </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5 text-sm">
                  <Link href="/admin" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin' ? activeItemClass : itemClass}>Dashboard</Link>
                  <Link href="/admin/offers" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/offers' ? activeItemClass : itemClass}>Offers</Link>
                  <Link href="/admin/offer-access" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/offer-access' ? activeItemClass : itemClass}>Offer Access</Link>

                  <Link href="/admin/camp-leads" onClick={() => setMobileNavOpen(false)} className={`${pathname === '/admin/camp-leads' ? activeItemClass : itemClass} flex items-center justify-between`}>
                    <span>Camp Leads</span>
                    {campLeadPending > 0 && <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{campLeadPending}</span>}
                  </Link>
                  <Link href="/admin/conversions" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/conversions' ? activeItemClass : itemClass}>Conversions</Link>
                  <Link href="/admin/lead-cuts" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/lead-cuts' ? activeItemClass : itemClass}>Lead Cut Stats</Link>
                  <Link href="/admin/postbacks-received" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/postbacks-received' ? activeItemClass : itemClass}>Postbacks Received</Link>
                  <Link href="/admin/publishers" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/publishers' ? activeItemClass : itemClass}>Publishers</Link>
                  <Link href="/admin/offer-requests" onClick={() => setMobileNavOpen(false)} className={`${pathname === '/admin/offer-requests' ? activeItemClass : itemClass} flex items-center justify-between`}>
                    <span>Offer Requests</span>
                    {offerRequestPending > 0 && <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{offerRequestPending}</span>}
                  </Link>
                  <Link href="/admin/withdrawals" onClick={() => setMobileNavOpen(false)} className={`${pathname === '/admin/withdrawals' ? activeItemClass : itemClass} flex items-center justify-between`}>
                    <span>Withdrawals</span>
                    {withdrawalPending > 0 && <span className="rounded-full bg-brand-amber/20 px-2 py-0.5 text-[10px] text-brand-amber">{withdrawalPending}</span>}
                  </Link>
                  <Link href="/admin/tickets" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/tickets' ? activeItemClass : itemClass}>Tickets</Link>

                  <Link href="/admin/settings" onClick={() => setMobileNavOpen(false)} className={pathname === '/admin/settings' ? activeItemClass : itemClass}>Settings</Link>
                </nav>
                <div className="border-t border-brand-border p-4">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-left text-sm text-brand-textSecondary transition hover:bg-gray-50 hover:text-brand-textPrimary"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

