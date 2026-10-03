'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

type LoginResponse = {
  errorCode?: string
  message?: string
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
    <div className="fixed bottom-4 right-4 z-[90] rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-textPrimary shadow-lg">
      {message}
    </div>
  )
}

export default function PartnerLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // Log all state changes
  useEffect(() => {
    console.log('[PARTNER_LOGIN] State changed:', {
      email: email ? `${email.substring(0, 3)}***` : '',
      password: password ? '***'.repeat(password.length) : '',
      remember,
      showPassword,
      submitting,
      emailError,
      passwordError,
      formError,
      toast
    })
  }, [email, password, remember, showPassword, submitting, emailError, passwordError, formError, toast])

  const validate = () => {
    console.log('[PARTNER_LOGIN] Validation started')
    let valid = true
    setEmailError('')
    setPasswordError('')
    setFormError('')

    if (!email.trim()) {
      console.log('[PARTNER_LOGIN] Email validation failed: empty')
      setEmailError('Email is required.')
      valid = false
    }
    if (!password) {
      console.log('[PARTNER_LOGIN] Password validation failed: empty')
      setPasswordError('Password is required.')
      valid = false
    }

    console.log('[PARTNER_LOGIN] Validation result:', valid)
    return valid
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log('[PARTNER_LOGIN] Form submission started')
    
    if (!validate()) {
      console.log('[PARTNER_LOGIN] Form submission aborted: validation failed')
      return
    }

    try {
      setSubmitting(true)
      const requestData = {
        email: email.trim(),
        password,
        remember,
      }
      console.log('[PARTNER_LOGIN] API request data:', {
        email: requestData.email,
        password: '***'.repeat(requestData.password.length),
        remember: requestData.remember
      })
      
      const res = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      console.log('[PARTNER_LOGIN] API response status:', res.status, res.statusText)
      const data = (await res.json()) as LoginResponse
      console.log('[PARTNER_LOGIN] API response data:', data)
      
      if (!res.ok) {
        if (data.errorCode === 'INVALID_CREDENTIALS') {
          console.log('[PARTNER_LOGIN] Error: Invalid credentials')
          setFormError('Invalid email or password.')
          return
        }
        if (data.errorCode === 'ACCOUNT_NOT_APPROVED') {
          console.log('[PARTNER_LOGIN] Redirecting: Account not approved')
          router.push('/partner/pending-approval')
          return
        }
        if (data.errorCode === 'SUSPENDED') {
          console.log('[PARTNER_LOGIN] Error: Account suspended')
          setFormError('Your account has been suspended. Contact support@nccamp.in')
          return
        }
        console.log('[PARTNER_LOGIN] Error: Unknown error', data)
        setToast('Something went wrong. Please try again.')
        return
      }

      console.log('[PARTNER_LOGIN] Login successful, redirecting to dashboard')
      router.push('/partner/dashboard')
    } catch (error) {
      console.error('[PARTNER_LOGIN] Login error:', error)
      setToast('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4FF]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
          {/* Blue header section */}
          <div className="flex flex-col items-center bg-gradient-to-br from-[#3B4FD8] to-[#2563EB] px-8 py-8 text-white">
            <div className="mb-4 flex h-24 w-auto items-center justify-center">
              <img src="/logo.jpeg" alt="NCCamp Logo" className="h-full w-auto object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-bold">Welcome Back!</h1>
            <p className="mt-1 text-sm text-blue-100">Access your Affiliate dashboard</p>
          </div>

          {/* White form section */}
          <div className="bg-white px-8 py-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    console.log('[PARTNER_LOGIN] Email input changed:', e.target.value ? `${e.target.value.substring(0, 3)}***` : '')
                    setEmail(e.target.value)
                  }}
                  placeholder="partner@example.com"
                  className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2.5 text-sm text-brand-textPrimary outline-none placeholder:text-brand-textMuted focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
                  Password
                </label>
                <div className="flex items-center rounded-lg border border-brand-border bg-gray-50 pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      console.log('[PARTNER_LOGIN] Password input changed:', e.target.value ? '***'.repeat(e.target.value.length) : '')
                      setPassword(e.target.value)
                    }}
                    placeholder="Enter your password"
                    className="w-full bg-transparent px-3 py-2.5 text-sm text-brand-textPrimary outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log('[PARTNER_LOGIN] Password visibility toggle clicked, current:', showPassword)
                      setShowPassword((prev) => !prev)
                    }}
                    className="text-xs font-semibold text-brand-textMuted hover:text-brand-textPrimary"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {passwordError ? <p className="mt-1 text-xs text-red-500">{passwordError}</p> : null}
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-brand-textSecondary">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => {
                      console.log('[PARTNER_LOGIN] Remember me checkbox changed:', e.target.checked)
                      setRemember(e.target.checked)
                    }}
                    className="h-4 w-4 rounded border-brand-border accent-blue-600"
                  />
                  Remember me for 30 days
                </label>
              </div>

              {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing In...
                  </span>
                ) : (
                  '→ Sign In'
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-brand-textMuted">
              Don&apos;t have an account?{' '}
              <Link href="/partner/register" className="font-semibold text-blue-600 hover:underline">
                Register here
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="bg-gray-900 px-8 py-3 text-center text-xs text-gray-400">
            © 2026 NCCamp. All rights reserved.
          </div>
        </div>
      </main>

      {toast ? <Toast message={toast} onClose={() => {
        console.log('[PARTNER_LOGIN] Toast closed')
        setToast(null)
      }} /> : null}
    </div>
  )
}
