'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

type CampResponse = {
  camp?: {
    id: number
    campSlug: string
    campName: string
    showMobileField: boolean
    showReferField: boolean
    userGets: number
    offer: { name: string; imageUrl: string | null; category: string | null }
  }
  error?: string
  message?: string
}

export default function OfferCampPage() {
  const params = useParams<{ slug?: string[] }>()
  const searchParams = useSearchParams()
  const rawSegment = params.slug?.[0] || ''
  const campSlug = rawSegment.startsWith('-') ? rawSegment.slice(1) : rawSegment

  const [data, setData] = useState<CampResponse['camp'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [quotaCompleted, setQuotaCompleted] = useState(false)
  const [upiId, setUpiId] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [referrerUpi, setReferrerUpi] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!campSlug) return
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/camp/${campSlug}`, { cache: 'no-store' })
      const json = (await res.json()) as CampResponse
      if (!res.ok) {
        if (json.error === 'CAMP_NOT_FOUND') setPageError('Camp not found')
        else if (json.error === 'CAMP_PAUSED') setPageError('This offer is currently unavailable')
        else if (json.error === 'QUOTA_COMPLETED') setQuotaCompleted(true)
        else setPageError('Unable to load camp')
      } else {
        setData(json.camp || null)
      }
      setLoading(false)
    }
    void load()
  }, [campSlug])

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      try { setReferrerUpi(decodeURIComponent(ref)) } catch {}
    }
  }, [searchParams])

  const submit = async () => {
    setFieldError('')
    if (!upiId.trim()) return setFieldError('UPI ID is required')
    if (!/^[\w.\-]+@[\w]+$/.test(upiId.trim())) return setFieldError('Invalid UPI ID format')
    if (data?.showMobileField && !/^[6-9]\d{9}$/.test(mobileNumber)) return setFieldError('Enter a valid mobile number')

    setSubmitting(true)
    const res = await fetch(`/api/camp/${campSlug}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upiId, mobileNumber, referrerUpi }),
    })
    const json = await res.json()

    if (!res.ok) {
      if (json.error === 'QUOTA_COMPLETED') {
        setQuotaCompleted(true)
      } else {
        setFieldError(json.message || json.error || 'Validation failed')
      }
    } else {
      window.open(`/api/camp/redirect?token=${json.redirectToken}`, '_blank')
      return
    }

    setSubmitting(false)
  }

  const trackerUrl = data
    ? `/c/tracker?campId=${encodeURIComponent(String(data.id))}&camp=${encodeURIComponent(data.campSlug)}`
    : '/c/tracker'

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    )
  }

  if (quotaCompleted) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-bg px-4 py-12 text-brand-textPrimary font-sans">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.12),transparent_70%)]" />
        <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08),transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-brand-border bg-brand-card p-8 shadow-card text-center"
        >
          {/* Logo / Header */}
          <div className="mb-6 flex flex-col items-center gap-1.5">
            <span className="text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              ncparnters
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest">
              Campaign Network
            </span>
          </div>

          {/* Premium Illustration / Icon container */}
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50 text-amber-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] border border-amber-100">
            <motion.span 
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="absolute -top-1.5 -right-1.5 flex h-7 w-12 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white uppercase tracking-wider shadow"
            >
              LIMIT
            </motion.span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-11 w-11">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          </div>

          {/* Title & User Message */}
          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
            Offer Limit Reached
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed px-2">
            Offer limit reached. Explore our platform for more earning opportunities.
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Explore Opportunities
            </Link>
            <a
              href="https://t.me/NcCampaignsofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-brand-border bg-slate-50 hover:bg-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="h-5 w-5 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.66-2.88 8-3.43 3.81-1.56 4.6-1.83 5.12-1.84.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.03.17z"/>
              </svg>
              Join Telegram Support
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-brand-textPrimary">
        <p>{pageError}</p>
        <button className="rounded border px-3 py-1" onClick={() => history.back()}>Back</button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg px-4 py-12 text-brand-textPrimary">
      <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.3),transparent_70%)]" />
      <div className="relative z-10 mx-auto max-w-md">
        <img src={data.offer.imageUrl || '/next.svg'} alt={data.offer.name} className="mx-auto h-20 w-20 object-contain drop-shadow" />
        <h1 className="mt-3 text-center text-2xl font-bold">{data.offer.name}</h1>
        <p className="mx-auto mt-2 inline-block rounded-full bg-green-500 px-4 py-1 text-sm">Complete &amp; Earn Rs.{data.userGets} Cashback</p>

        <div className="relative mt-6 rounded-2xl bg-brand-card p-6">
          <input
            className="w-full border-b border-brand-border bg-transparent py-2 text-brand-textPrimary outline-none"
            placeholder="Your UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
          {data.showMobileField && (
            <input
              className="mt-2 w-full border-b border-brand-border bg-transparent py-2 text-brand-textPrimary outline-none"
              placeholder="Mobile Number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
            />
          )}
          {data.showReferField && (
            <input
              className="mt-2 w-full border-b border-brand-border bg-transparent py-2 text-brand-textPrimary outline-none"
              placeholder="Referral UPI (Optional)"
              value={referrerUpi}
              onChange={(e) => setReferrerUpi(e.target.value)}
            />
          )}
          {fieldError && <p className="mt-2 text-xs text-red-400">{fieldError}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-5 w-full rounded-full bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            {submitting ? 'Please wait...' : 'Claim Reward ->'}
          </button>
          <p className="mt-3 text-center text-[11px] text-[#71717A]">SECURE &amp; VERIFIED BY NCCAMP</p>
        </div>
      </div>

      <button
        onClick={() => window.open(trackerUrl, '_blank')}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-brand-border bg-brand-card px-4 py-2 text-left shadow"
      >
        <p className="text-sm font-semibold">Track Earnings</p>
        <p className="text-xs text-gray-400">Check your status</p>
      </button>
    </div>
  )
}
