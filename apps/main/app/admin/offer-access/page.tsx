'use client'

import { useEffect, useState } from 'react'

type Offer = {
  id: number
  name: string
  slug: string
}

type Publisher = {
  id: number
  name: string
  email: string
}

export default function OfferAccessPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('')
  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Load limited access offers on mount
  useEffect(() => {
    loadOffers()
  }, [])

  // Load publishers when selectedOfferId changes
  useEffect(() => {
    if (selectedOfferId) {
      loadPublishers(selectedOfferId)
    } else {
      setPublishers([])
    }
    setError(null)
    setSuccessMsg(null)
  }, [selectedOfferId])

  const loadOffers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/offer-access', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to load offers')
      setOffers(json.offers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPublishers = async (offerId: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/offer-access?offerId=${offerId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to load publishers')
      setPublishers(json.publishers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOfferId) return
    const email = emailInput.trim()
    if (!email) return

    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/admin/offer-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: selectedOfferId, email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to grant access')

      setSuccessMsg(`Granted access to ${json.publisher?.name || email}`)
      setEmailInput('')
      // Reload publishers list
      await loadPublishers(selectedOfferId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveAccess = async (publisherId: number, publisherName: string) => {
    if (!selectedOfferId) return
    if (!confirm(`Are you sure you want to remove access for ${publisherName}?`)) return

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/admin/offer-access?offerId=${selectedOfferId}&publisherId=${publisherId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to remove access')

      setSuccessMsg(`Successfully removed access for ${publisherName}`)
      // Reload publishers list
      await loadPublishers(selectedOfferId)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Offer Access Management</h1>
        <p className="text-sm text-brand-textMuted">
          Manage publisher visibility and permission settings for private/limited-access offers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400">
          ✅ {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Select Offer & Add Access form */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-sm">
            <h2 className="text-md font-semibold mb-4 text-brand-textPrimary">Select Offer</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-brand-textMuted">Limited Access Offers</label>
                <select
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value ? Number(e.target.value) : '')}
                  disabled={loading}
                  className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm"
                >
                  <option value="">-- Choose Private Offer --</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name} (#{offer.id})
                    </option>
                  ))}
                </select>
                {offers.length === 0 && !loading && (
                  <p className="mt-1 text-xs text-brand-amber">
                    No private offers found. Go to Offers page and change 'Access Type' to 'Limited Access' first.
                  </p>
                )}
              </div>
            </div>
          </div>

          {selectedOfferId && (
            <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-sm">
              <h2 className="text-md font-semibold mb-4 text-brand-textPrimary">Grant Access</h2>
              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-brand-textMuted">Publisher Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="publisher@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !emailInput}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submitting ? 'Granting...' : 'Grant Access'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: List of publishers having access */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-brand-border bg-brand-card p-6 shadow-sm h-full min-h-[300px]">
            <h2 className="text-md font-semibold mb-4 text-brand-textPrimary">Publishers with Access</h2>

            {!selectedOfferId ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-brand-border rounded-xl text-brand-textMuted">
                <span className="text-2xl mb-2">📥</span>
                <p className="text-xs">Select an offer from the dropdown to manage publisher access.</p>
              </div>
            ) : loading && publishers.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-purple" />
              </div>
            ) : publishers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-brand-border rounded-xl text-brand-textMuted">
                <span className="text-2xl mb-2">👥</span>
                <p className="text-xs">No publishers currently have access to this private offer.</p>
                <p className="text-[10px] mt-1 text-gray-500">Enter a publisher email in the form on the left to grant access.</p>
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-brand-border">
                  <table className="min-w-full divide-y divide-brand-border text-sm">
                    <thead className="bg-brand-bg text-brand-textMuted text-xs font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Publisher ID</th>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border bg-brand-card">
                      {publishers.map((pub) => (
                        <tr key={pub.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-brand-textSecondary">#{pub.id}</td>
                          <td className="px-4 py-3 font-medium text-brand-textPrimary">{pub.name}</td>
                          <td className="px-4 py-3 text-brand-textSecondary">{pub.email}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveAccess(pub.id, pub.name)}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                            >
                              Remove Access
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="space-y-3 md:hidden">
                  {publishers.map((pub) => (
                    <div key={pub.id} className="rounded-xl border border-brand-border p-4 bg-brand-card space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-brand-textPrimary">{pub.name}</p>
                          <p className="text-xs text-brand-textSecondary">{pub.email}</p>
                        </div>
                        <span className="rounded bg-brand-bg border border-brand-border px-2 py-0.5 text-[10px] font-semibold text-brand-textSecondary">
                          ID: #{pub.id}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccess(pub.id, pub.name)}
                        className="w-full rounded-xl border border-red-100 py-2 text-center text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        Remove Access
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
