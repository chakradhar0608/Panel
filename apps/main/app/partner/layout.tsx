'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type NavItem = {
  href?: string
  label: string
  match: (pathname: string) => boolean
  subItems?: { href: string; label: string; match: (pathname: string) => boolean }[]
}

type PartnerSessionResponse = {
  authenticated?: boolean
  user?: {
    status?: string
  }
}

const navItems: NavItem[] = [
  {
    href: '/partner/dashboard',
    label: 'Dashboard',
    match: (pathname) => pathname === '/partner/dashboard',
  },
  {
    href: '/partner/offers',
    label: 'Offers',
    match: (pathname) => pathname === '/partner/offers' || pathname.startsWith('/partner/offer/'),
  },
  {
    label: 'Performance',
    match: (pathname) => pathname.startsWith('/partner/clicks') || pathname.startsWith('/partner/conversions'),
    subItems: [
      {
        href: '/partner/clicks',
        label: 'Clicks',
        match: (pathname) => pathname.startsWith('/partner/clicks'),
      },
      {
        href: '/partner/conversions',
        label: 'Conversions',
        match: (pathname) => pathname.startsWith('/partner/conversions'),
      },
    ],
  },
  {
    href: '/partner/wallet',
    label: 'My Wallet',
    match: (pathname) => pathname.startsWith('/partner/wallet') || pathname.startsWith('/partner/earnings'),
  },
  {
    href: '/partner/postback',
    label: 'Global Postback',
    match: (pathname) => pathname === '/partner/postback',
  },
  {
    href: '/partner/postback/logs',
    label: 'Postback Logs',
    match: (pathname) => pathname === '/partner/postback/logs',
  },
  {
    href: '/partner/profile',
    label: 'Profile',
    match: (pathname) => pathname.startsWith('/partner/profile'),
  },
]

const publicRoutes = new Set([
  '/partner',
  '/partner/login',
  '/partner/register',
  '/partner/forgot-password',
])

const pendingApprovalRoute = '/partner/pending-approval'

function isPublicPartnerRoute(pathname: string) {
  return publicRoutes.has(pathname)
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [performanceOpen, setPerformanceOpen] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [canAccessPartnerApp, setCanAccessPartnerApp] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    let active = true

    const syncPartnerAccess = async () => {
      if (isPublicPartnerRoute(pathname)) {
        if (!active) return
        setCanAccessPartnerApp(true)
        setSessionChecked(true)
        return
      }

      try {
        const res = await fetch('/api/partner/auth/session', { cache: 'no-store' })
        const json = (await res.json().catch(() => ({}))) as PartnerSessionResponse

        if (!active) return

        const authenticated = Boolean(res.ok && json.authenticated)
        const isApproved = json.user?.status === 'APPROVED'

        if (pathname === pendingApprovalRoute) {
          setCanAccessPartnerApp(true)
          setSessionChecked(true)
          if (authenticated && isApproved) {
            router.replace('/partner/dashboard')
          }
          return
        }

        if (!authenticated) {
          setCanAccessPartnerApp(false)
          setSessionChecked(true)
          router.replace('/partner/login')
          return
        }

        if (!isApproved) {
          setCanAccessPartnerApp(false)
          setSessionChecked(true)
          router.replace(pendingApprovalRoute)
          return
        }

        setCanAccessPartnerApp(true)
        setSessionChecked(true)
      } catch {
        if (!active) return
        setCanAccessPartnerApp(false)
        setSessionChecked(true)
        router.replace('/partner/login')
      }
    }

    void syncPartnerAccess()

    return () => {
      active = false
    }
  }, [pathname, router])

  const pageTitle = useMemo(() => {
    const activeItem = navItems.find((item) => item.match(pathname))
    return activeItem?.label || 'Partner Panel'
  }, [pathname])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await fetch('/api/partner/auth/logout', { method: 'POST' })
    } finally {
      setLoggingOut(false)
      router.push('/partner/login')
      router.refresh()
    }
  }

  if (isPublicPartnerRoute(pathname)) {
    return <>{children}</>
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 text-brand-textSecondary">
        <div className="rounded-2xl border border-brand-border bg-white px-6 py-5 text-sm shadow-sm">
          Checking account access...
        </div>
      </div>
    )
  }

  if (pathname === pendingApprovalRoute) {
    return <>{children}</>
  }

  if (!canAccessPartnerApp) {
    return null
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-brand-border bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-brand-border px-6 py-6">
              <Link href="/partner/dashboard" className="inline-flex items-center gap-3">
                <img src="/logo.jpeg" alt="NCCamp" className="h-10 w-auto object-contain drop-shadow-sm" />
                <div>
                  <p className="text-sm font-semibold text-brand-textPrimary">NCCamp</p>
                  <p className="text-xs text-brand-textMuted">Affiliate Network</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
              {navItems.map((item) => {
                const active = item.match(pathname)

                if (item.subItems) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        onClick={() => setPerformanceOpen((v) => !v)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
                          active
                            ? 'bg-blue-50 font-semibold text-blue-700'
                            : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                        }`}
                      >
                        {item.label}
                        <span className="text-xs">{performanceOpen ? '▲' : '▼'}</span>
                      </button>
                      {performanceOpen && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                          {item.subItems.map((subItem) => {
                            const subActive = subItem.match(pathname)
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`flex items-center rounded-xl px-4 py-2 text-sm transition ${
                                  subActive
                                    ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] font-semibold text-white shadow-md shadow-[#4F46E5]/20'
                                    : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href || item.label}
                    href={item.href!}
                    className={`flex items-center rounded-xl px-4 py-3 text-sm transition ${active
                      ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] font-semibold text-white shadow-md shadow-[#4F46E5]/20'
                      : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-brand-border p-4">
              <div className="mb-3 rounded-xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium text-blue-700">Need Help?</p>
                <p className="text-xs text-blue-600">Facing any issue or query?</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-left text-sm text-brand-textSecondary transition hover:bg-gray-50 hover:text-brand-textPrimary disabled:opacity-60"
              >
                {loggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-brand-border bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen((value) => !value)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border bg-gray-50 text-lg lg:hidden"
                  aria-label="Toggle navigation"
                >
                  ☰
                </button>
                <div>
                  <p className="text-lg font-semibold text-brand-textPrimary">{pageTitle}</p>
                  <p className="text-xs text-brand-textMuted">Partner portal navigation is available here.</p>
                </div>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
              </div>
            </div>

          </header>

          {/* Mobile Nav Overlay */}
          {mobileNavOpen ? (
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
                    <img src="/logo.jpeg" alt="NCCamp" className="h-8 w-auto object-contain drop-shadow-sm" />
                  </div>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center text-xl text-brand-textSecondary"
                  >
                    &times;
                  </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
                  {navItems.map((item) => {
                    const active = item.match(pathname)

                    if (item.subItems) {
                      return (
                        <div key={item.label} className="space-y-1">
                          <button
                            onClick={() => setPerformanceOpen((v) => !v)}
                            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
                              active
                                ? 'bg-blue-50 font-semibold text-blue-700'
                                : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                            }`}
                          >
                            {item.label}
                            <span className="text-xs">{performanceOpen ? '▲' : '▼'}</span>
                          </button>
                          {performanceOpen && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                              {item.subItems.map((subItem) => {
                                const subActive = subItem.match(pathname)
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={() => setMobileNavOpen(false)}
                                    className={`block rounded-xl px-4 py-3 text-sm transition ${
                                      subActive
                                        ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] font-semibold text-white shadow-sm'
                                        : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                                    }`}
                                  >
                                    {subItem.label}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={item.href || item.label}
                        href={item.href!}
                        onClick={() => setMobileNavOpen(false)}
                        className={`block rounded-xl px-4 py-3 text-sm transition ${active ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] font-semibold text-white shadow-sm' : 'text-brand-textSecondary hover:bg-gray-50 hover:text-brand-textPrimary'
                          }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>

                <div className="border-t border-brand-border p-4">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full rounded-xl border border-brand-border px-4 py-3 text-left text-sm text-brand-textSecondary hover:bg-gray-50 disabled:opacity-60"
                  >
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1120px] xl:mx-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
