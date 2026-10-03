'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type PublisherProfile = {
  id: number
  name: string
  email: string
  mobile: string
  websiteOrTelegram: string
  trafficSource: string
  paymentMethod: string
  upiId: string | null
  accountNumber: string | null
  ifsc: string | null
  accountHolderName: string | null
  status: string
  totalEarned: string | number
  walletBalance: string | number
  totalWithdrawn: string | number
  pendingWithdrawal: string | number
  telegramChatId: string | null
  createdAt: string
  updatedAt: string
}

type ProfileResponse = {
  publisher?: PublisherProfile
  error?: string
}

export default function PublisherProfilePage() {
  const [profile, setProfile] = useState<PublisherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/partner/profile', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to load profile details')
      }
      const data = (await res.json()) as ProfileResponse
      if (data.publisher) {
        setProfile(data.publisher)
      } else {
        throw new Error(data.error || 'Failed to load profile')
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchProfile()
  }, [])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 rounded-2xl bg-gray-200 animate-pulse lg:col-span-1" />
          <div className="space-y-6 lg:col-span-2">
            <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
            <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-lg font-bold">Failed to load profile</h2>
        <p className="text-sm mt-1">{error || 'Unable to retrieve your profile information.'}</p>
        <button
          onClick={fetchProfile}
          className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  const isApproved = profile.status === 'APPROVED'

  return (
    <div className="space-y-6">
      {/* 1. Profile Header Banner */}
      <div
        className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
        style={{ background: 'linear-gradient(to right, #4F46E5, #6366F1, #8B5CF6)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-4 h-36 w-36 rounded-full bg-white/15 blur-xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">PARTNER ACCOUNT</p>
            <h1 className="text-3xl font-extrabold text-white mt-0.5 tracking-tight">{profile.name}</h1>
            <p className="text-xs text-white/90 mt-1 font-medium">Publisher ID: #{profile.id}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Status Badge */}
            <span
              className={`rounded-xl px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border text-xs font-bold shadow-xs ${
                isApproved
                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {profile.status}
            </span>

            {/* Member Since Badge */}
            <span className="rounded-xl bg-white/10 px-3.5 py-1.5 backdrop-blur-md flex items-center gap-2 border border-white/10 text-xs font-medium text-white/90 shadow-xs">
              Joined {new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Profile Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Summary & Financials Card */}
        <div className="space-y-6 lg:col-span-1">
          {/* Avatar and Balance Overview */}
          <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600 shadow-inner">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-3.5 font-extrabold text-gray-800 text-base">{profile.name}</h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">{profile.email}</p>

            <div className="mt-6 w-full border-t border-gray-100 pt-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Lifetime Earnings</p>
                <p className="text-3xl font-black text-gray-900 mt-1">₹{Number(profile.totalEarned || 0).toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left pt-2">
                <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Wallet</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">₹{Number(profile.walletBalance || 0).toFixed(0)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Paid Out</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">₹{Number(profile.totalWithdrawn || 0).toFixed(0)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5 border border-gray-100/50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Pending</p>
                  <p className="text-xs font-black text-gray-800 mt-0.5">₹{Number(profile.pendingWithdrawal || 0).toFixed(0)}</p>
                </div>
              </div>

              <Link
                href="/partner/wallet"
                className="mt-2 block w-full rounded-xl bg-indigo-50 hover:bg-indigo-100 text-center py-2.5 text-xs font-bold text-indigo-700 transition"
              >
                Go to Wallet
              </Link>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5 mb-4">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Quick Actions</span>
            </h3>
            <div className="space-y-2">
              <Link
                href="/partner/forgot-password"
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
              >
                <span>Reset Password</span>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/partner/postback"
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
              >
                <span>Setup Postbacks</span>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Account and Details Cards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Personal Details */}
          <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5 mb-5">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Name</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile.name}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{profile.email}</p>
                  <button
                    onClick={() => copyToClipboard(profile.email, 'email')}
                    className="p-1 text-gray-400 hover:text-gray-600 transition flex items-center justify-center"
                    title="Copy Email"
                  >
                    {copiedField === 'email' ? (
                      <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-1 py-0.5 rounded font-bold">Copied!</span>
                    ) : (
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mobile Number</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile.mobile || '-'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Status</p>
                <p className="text-sm mt-1">
                  <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg text-xs px-2.5 py-1 uppercase ${
                    isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {profile.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Traffic & Channels */}
          <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5 mb-5">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Traffic & Contact Channels</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Website or Telegram Link</p>
                <p className="text-sm font-semibold text-gray-800 mt-1 truncate">
                  {profile.websiteOrTelegram ? (
                    <a
                      href={profile.websiteOrTelegram.startsWith('http') ? profile.websiteOrTelegram : `https://${profile.websiteOrTelegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {profile.websiteOrTelegram}
                      <svg className="h-3 w-3 inline flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Telegram Chat ID</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile.telegramChatId || 'Not Linked'}</p>
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Traffic Source Info</p>
                <p className="text-sm text-gray-600 font-semibold mt-1 leading-relaxed">{profile.trafficSource || '-'}</p>
              </div>
            </div>
          </div>

          {/* Card 3: Payout & Bank Account Details */}
          <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5 mb-5">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Payout & Bank Account Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Method</p>
                <p className="text-sm mt-1">
                  <span className="inline-flex items-center font-bold rounded-lg text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                    {profile.paymentMethod || 'BANK'}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">UPI ID</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{profile.upiId || '-'}</p>
              </div>

              <div className="border-t border-gray-100 pt-4 md:col-span-2">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Bank Transfer Info</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Holder Name</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{profile.accountHolderName || '-'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Number</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{profile.accountNumber || '-'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">IFSC Code</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{profile.ifsc || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
