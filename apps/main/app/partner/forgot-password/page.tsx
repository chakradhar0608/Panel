'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

type ForgotPasswordResponse = {
  success?: boolean
  message?: string
  error?: string
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
    <div className="fixed bottom-4 right-4 z-[90] rounded-xl border border-brand-border bg-white shadow-lg px-4 py-3 text-sm text-brand-textPrimary">
      {message}
    </div>
  )
}

export default function PartnerForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!newPassword) {
      setError('New password is required.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/partner/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      })
      const data = (await res.json()) as ForgotPasswordResponse
      if (!res.ok) {
        setError(data.error || data.message || 'Something went wrong. Please try again.')
        return
      }

      setSuccess('Password reset successfully! Redirecting to login page...')
      setTimeout(() => {
        router.push('/partner/login')
      }, 2000)
    } catch {
      setToast('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4 text-brand-textPrimary">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white shadow-sm p-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="rounded-lg bg-white border border-brand-border shadow-sm px-2 py-1 text-sm font-bold">NC</span>
            <span className="font-semibold">NCCamp</span>
          </Link>
        </div>

        <h1 className="mt-5 text-2xl font-bold">Reset Password</h1>
        <p className="text-xs text-brand-textMuted mt-1">Enter your account email and a new password to reset it directly.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm text-gray-800"
              placeholder="e.g. name@example.com"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-[#F0F2F5] px-3 py-2 text-sm text-gray-800"
              placeholder="Minimum 6 characters"
            />
            {error ? <p className="mt-1.5 text-xs text-red-500 font-semibold">{error}</p> : null}
          </div>

          {success ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 font-semibold">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-textMuted">
          <Link href="/partner/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
