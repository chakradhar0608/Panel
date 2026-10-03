'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'

type RegisterResponse = {
  errorCode?: string
  message?: string
}

type FormValues = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  mobile: string
  websiteOrTelegram: string
  trafficSource: string
  paymentMethod: 'UPI' | 'BANK_TRANSFER'
  upiId: string
  accountNumber: string
  ifsc: string
  accountHolderName: string
  termsAccepted: boolean
}

type FormErrors = Partial<Record<keyof FormValues, string>> & { submit?: string }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UPI_REGEX = /^[\w.\-]+@[\w]+$/
const MOBILE_REGEX = /^[6-9]\d{9}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

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

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' }
  if (score <= 4) return { label: 'Medium', color: 'bg-amber-500', width: '66%' }
  return { label: 'Strong', color: 'bg-emerald-500', width: '100%' }
}

export default function PartnerRegisterPage() {
  const [values, setValues] = useState<FormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    websiteOrTelegram: '',
    trafficSource: 'Telegram',
    paymentMethod: 'UPI',
    upiId: '',
    accountNumber: '',
    ifsc: '',
    accountHolderName: '',
    termsAccepted: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const strength = useMemo(() => getPasswordStrength(values.password), [values.password])

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    const nextErrors: FormErrors = {}

    if (!values.fullName.trim()) nextErrors.fullName = 'Full Name is required.'

    if (!values.email.trim()) nextErrors.email = 'Email Address is required.'
    else if (!EMAIL_REGEX.test(values.email.trim())) nextErrors.email = 'Enter a valid email address.'

    if (!values.password) nextErrors.password = 'Password is required.'
    else if (values.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'

    if (!values.confirmPassword) nextErrors.confirmPassword = 'Confirm Password is required.'
    else if (values.confirmPassword !== values.password) nextErrors.confirmPassword = 'Passwords do not match.'

    if (!values.mobile.trim()) nextErrors.mobile = 'Mobile Number is required.'
    else if (!MOBILE_REGEX.test(values.mobile.trim())) nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.'

    if (values.paymentMethod === 'UPI') {
      if (!values.upiId.trim()) nextErrors.upiId = 'UPI ID is required.'
      else if (!UPI_REGEX.test(values.upiId.trim())) nextErrors.upiId = 'Enter a valid UPI ID.'
    }

    if (values.paymentMethod === 'BANK_TRANSFER') {
      if (!values.accountNumber.trim()) nextErrors.accountNumber = 'Account Number is required.'
      if (!values.ifsc.trim()) nextErrors.ifsc = 'IFSC is required.'
      else if (!IFSC_REGEX.test(values.ifsc.trim().toUpperCase())) nextErrors.ifsc = 'Enter a valid IFSC code.'
      if (!values.accountHolderName.trim()) nextErrors.accountHolderName = 'Account Holder Name is required.'
    }

    if (!values.termsAccepted) nextErrors.termsAccepted = 'You must agree to the terms and conditions.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')
    setErrors({})

    if (!validate()) return

    try {
      setSubmitting(true)
      const payload = {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        mobile: values.mobile.trim(),
        websiteOrTelegram: values.websiteOrTelegram.trim() || undefined,
        trafficSource: values.trafficSource,
        paymentMethod: values.paymentMethod,
        upiId: values.paymentMethod === 'UPI' ? values.upiId.trim() : undefined,
        accountNumber: values.paymentMethod === 'BANK_TRANSFER' ? values.accountNumber.trim() : undefined,
        ifsc: values.paymentMethod === 'BANK_TRANSFER' ? values.ifsc.trim().toUpperCase() : undefined,
        accountHolderName:
          values.paymentMethod === 'BANK_TRANSFER' ? values.accountHolderName.trim() : undefined,
      }

      const res = await fetch('/api/partner/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await res.json()) as RegisterResponse
      if (!res.ok) {
        if (data.errorCode === 'EMAIL_EXISTS') {
          setErrors({
            submit: 'An account with this email already exists. Login instead?',
          })
          return
        }
        setErrors({
          submit: data.message || 'Something went wrong. Please try again.',
        })
        return
      }

      setSuccessMessage(
        'Registration successful. Awaiting admin approval. We will notify you via email.'
      )
      setValues({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobile: '',
        websiteOrTelegram: '',
        trafficSource: 'Telegram',
        paymentMethod: 'UPI',
        upiId: '',
        accountNumber: '',
        ifsc: '',
        accountHolderName: '',
        termsAccepted: false,
      })
      setErrors({})
    } catch {
      setToast('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary">
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <img src="/logo.jpeg" alt="NCCamp" className="h-10 w-auto object-contain drop-shadow-sm" />
          </Link>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-2xl font-bold text-brand-textPrimary">Join NCCamp - Start earning as an affiliate</h1>

          <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Full Name</label>
              <input
                value={values.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
              />
              {errors.fullName ? <p className="mt-1 text-xs text-red-500">{errors.fullName}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email Address</label>
              <input
                type="email"
                value={values.email}
                onChange={(e) => setField('email', e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
              />
              {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <div className="flex items-center rounded-lg border border-brand-border bg-gray-50 pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(e) => setField('password', e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs font-semibold text-brand-textMuted hover:text-brand-textPrimary">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <p className="mt-1 text-xs text-brand-textMuted">Strength: {strength.label}</p>
              {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Confirm Password</label>
              <div className="flex items-center rounded-lg border border-brand-border bg-gray-50 pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-xs font-semibold text-brand-textMuted hover:text-brand-textPrimary">{showConfirmPassword ? 'Hide' : 'Show'}</button>
              </div>
              {errors.confirmPassword ? (
                <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Mobile Number</label>
              <input
                value={values.mobile}
                onChange={(e) => setField('mobile', e.target.value)}
                maxLength={10}
                className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
              />
              {errors.mobile ? <p className="mt-1 text-xs text-red-500">{errors.mobile}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Website or Telegram Channel</label>
              <input
                value={values.websiteOrTelegram}
                onChange={(e) => setField('websiteOrTelegram', e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Traffic Source</label>
              <select
                value={values.trafficSource}
                onChange={(e) => setField('trafficSource', e.target.value)}
                className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
              >
                <option>Telegram</option>
                <option>WhatsApp</option>
                <option>YouTube</option>
                <option>Instagram</option>
                <option>Website</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Payment Method</label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={values.paymentMethod === 'UPI'}
                    onChange={() => setField('paymentMethod', 'UPI')}
                  />
                  UPI
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={values.paymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setField('paymentMethod', 'BANK_TRANSFER')}
                  />
                  Bank Transfer
                </label>
              </div>
            </div>

            {values.paymentMethod === 'UPI' ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">UPI ID</label>
                <input
                  value={values.upiId}
                  onChange={(e) => setField('upiId', e.target.value)}
                  className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
                />
                {errors.upiId ? <p className="mt-1 text-xs text-red-400">{errors.upiId}</p> : null}
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Account Number</label>
                  <input
                    value={values.accountNumber}
                    onChange={(e) => setField('accountNumber', e.target.value)}
                    className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
                  />
                  {errors.accountNumber ? (
                    <p className="mt-1 text-xs text-red-400">{errors.accountNumber}</p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">IFSC</label>
                  <input
                    value={values.ifsc}
                    onChange={(e) => setField('ifsc', e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
                  />
                  {errors.ifsc ? <p className="mt-1 text-xs text-red-400">{errors.ifsc}</p> : null}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Account Holder Name</label>
                  <input
                    value={values.accountHolderName}
                    onChange={(e) => setField('accountHolderName', e.target.value)}
                    className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm"
                  />
                  {errors.accountHolderName ? (
                    <p className="mt-1 text-xs text-red-400">{errors.accountHolderName}</p>
                  ) : null}
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.termsAccepted}
                  onChange={(e) => setField('termsAccepted', e.target.checked)}
                />
                I agree to the terms and conditions
              </label>
              {errors.termsAccepted ? (
                <p className="mt-1 text-xs text-red-400">{errors.termsAccepted}</p>
              ) : null}
            </div>

            {errors.submit ? (
              <div className="md:col-span-2">
                <p className="text-sm text-red-400">
                  {errors.submit}{' '}
                  {errors.submit.includes('Login instead') ? (
                    <Link href="/partner/login" className="underline">
                      Go to login
                    </Link>
                  ) : null}
                </p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}{' '}
                <Link href="/partner/login" className="underline">
                  Login here
                </Link>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-brand-textMuted">
            Already have an account?{' '}
            <Link href="/partner/login" className="font-semibold text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </main>

      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  )
}
