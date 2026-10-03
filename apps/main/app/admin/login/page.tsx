'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      setLoading(true)
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) { setError('Invalid credentials'); return }
      router.push('/admin')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F4FF]">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
          <div className="flex flex-col items-center bg-gradient-to-br from-[#3B4FD8] to-[#2563EB] px-8 py-8 text-white">
            <div className="mb-4 flex h-24 w-auto items-center justify-center">
              <img src="/logo.jpeg" alt="NCCamp Logo" className="h-full w-auto object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="mt-1 text-sm text-blue-100">Access the NCCamp admin dashboard</p>
          </div>
          <div className="bg-white px-8 py-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">Password</label>
                <div className="flex items-center rounded-lg border border-brand-border bg-gray-50 pr-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs font-semibold text-brand-textMuted hover:text-brand-textPrimary">{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60">
                {loading ? 'Signing in...' : '→ Sign In'}
              </button>
            </form>
          </div>
          <div className="bg-gray-900 px-8 py-3 text-center text-xs text-gray-400">© 2026 NCCamp. Administrative access only.</div>
        </div>
      </main>
    </div>
  )
}
