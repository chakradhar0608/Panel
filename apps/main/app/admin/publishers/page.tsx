'use client'

import { useEffect, useMemo, useState } from 'react'

type Publisher = {
  id: string | number
  name?: string
  email?: string
  mobile?: string
  trafficSource?: string
  paymentMethod?: string
  balance?: number
  walletBalance?: number
  status?: string
  joinedAt?: string
  paymentDetails?: Record<string, string>
  leadCount?: number
  publisherOffers?: Array<{ id: number; offerId: number; status: string; requestedAt?: string; offer?: { name?: string } }>
}

export default function AdminPublishersPage() {
  const [rows, setRows] = useState<Publisher[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [trafficFilter, setTrafficFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null)
  const [adjustBalance, setAdjustBalance] = useState('0')

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter !== 'ALL') qs.set('status', statusFilter)
      const res = await fetch(`/api/admin/publishers?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      const list = Array.isArray(data) ? data : Array.isArray(data?.publishers) ? data.publishers : []
      setRows(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const trafficSources = useMemo(
    () => Array.from(new Set(rows.map((row) => (row.trafficSource || '').trim()).filter(Boolean))).sort(),
    [rows],
  )

  const paymentMethods = useMemo(
    () => Array.from(new Set(rows.map((row) => (row.paymentMethod || '').trim()).filter(Boolean))).sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (trafficFilter !== 'ALL' && (row.trafficSource || '') !== trafficFilter) return false
      if (paymentFilter !== 'ALL' && (row.paymentMethod || '') !== paymentFilter) return false
      if (!query) return true
      return [
        row.id,
        row.name,
        row.email,
        row.mobile,
        row.trafficSource,
        row.paymentMethod,
        row.balance,
        row.status,
      ]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [rows, search, trafficFilter, paymentFilter])

  const patchPublisher = async (id: string | number, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/publishers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const error = await res.json()
      alert(`Error: ${error.error || 'Failed to update publisher'}`)
      return
    }
    const action = payload.status === 'APPROVED' ? 'approved' : payload.status === 'SUSPENDED' ? 'suspended' : 'updated'
    alert(`Publisher ${action} successfully!`)
    await load()
  }

  const getPublisherBalance = (publisher: Publisher) => Number(publisher.walletBalance ?? publisher.balance ?? 0)

  const editWalletBalance = async (publisher: Publisher) => {
    const currentBalance = getPublisherBalance(publisher)
    const nextValue = window.prompt(
      `Set wallet balance for ${publisher.name || publisher.email || publisher.id}`,
      String(currentBalance)
    )
    if (nextValue == null) return

    const parsed = Number(nextValue)
    if (!Number.isFinite(parsed)) {
      alert('Enter a valid number')
      return
    }

    const adjustment = parsed - currentBalance
    if (adjustment === 0) return

    await patchPublisher(publisher.id, { adjustBalance: adjustment })
    if (selectedPublisher?.id === publisher.id) {
      const res = await fetch(`/api/admin/publishers/${publisher.id}`, { cache: 'no-store' })
      const json = await res.json()
      setSelectedPublisher(json.publisher || null)
    }
  }

  const deletePublisher = async (publisher: Publisher) => {
    const confirmed = window.confirm(
      `Delete publisher "${publisher.name || publisher.email || publisher.id}" permanently?\n\nThis will remove the publisher, camps, leads, wallet history, withdrawal requests, offer requests, and postback settings.`
    )
    if (!confirmed) return

    const res = await fetch(`/api/admin/publishers/${publisher.id}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      alert(`Error: ${error.error || 'Failed to delete publisher'}`)
      return
    }

    if (selectedPublisher?.id === publisher.id) {
      setSelectedPublisher(null)
    }

    alert('Publisher deleted successfully!')
    await load()
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Publishers</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by id, name, email, mobile" className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm">
          <option>ALL</option>
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>SUSPENDED</option>
        </select>
        <select value={trafficFilter} onChange={(e) => setTrafficFilter(e.target.value)} className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm">
          <option value="ALL">All Traffic Sources</option>
          {trafficSources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm">
          <option value="ALL">All Payment Methods</option>
          {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
        </select>
      </div>

      <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white border border-brand-border shadow-sm">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Mobile</th>
              <th className="px-2 py-2">Traffic Source</th>
              <th className="px-2 py-2">Payment Method</th>
              <th className="px-2 py-2">Balance</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Joined</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-2 py-4">Loading...</td></tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white border border-brand-border shadow-sm' : 'bg-brand-bg'} hover:bg-white border border-brand-border shadow-sm`}>
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2">{row.email}</td>
                  <td className="px-2 py-2">{row.mobile}</td>
                  <td className="px-2 py-2">{row.trafficSource}</td>
                  <td className="px-2 py-2">{row.paymentMethod}</td>
                  <td className="px-2 py-2">{getPublisherBalance(row).toFixed(2)}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{new Date(row.joinedAt || '').toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      {row.status === 'PENDING' && (
                        <button onClick={() => void patchPublisher(row.id, { status: 'APPROVED' })} className="rounded border border-emerald-500/40 px-2 py-1">Approve</button>
                      )}
                      {row.status === 'APPROVED' && (
                        <button onClick={() => void patchPublisher(row.id, { status: 'SUSPENDED' })} className="rounded border border-amber-500/40 px-2 py-1">Suspend</button>
                      )}
                      {row.status === 'SUSPENDED' && (
                        <button onClick={() => void patchPublisher(row.id, { status: 'APPROVED' })} className="rounded border border-emerald-500/40 px-2 py-1">Reactivate</button>
                      )}
                      <button onClick={() => void editWalletBalance(row)} className="rounded border border-blue-500/40 px-2 py-1 text-blue-700">Edit Wallet</button>
                      <button onClick={async () => { const res = await fetch(`/api/admin/publishers/${row.id}`, { cache: 'no-store' }); const json = await res.json(); setSelectedPublisher(json.publisher || row); setAdjustBalance('0') }} className="rounded border border-brand-border px-2 py-1">View Details</button>
                      <button onClick={() => void deletePublisher(row)} className="rounded border border-red-500/40 px-2 py-1 text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredRows.length === 0 ? (
              <tr><td colSpan={10} className="px-2 py-4">No publishers match the current filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mt-4 space-y-4 md:hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border">Loading...</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border">No publishers match the current filters.</div>
        ) : (
          filteredRows.map((row) => {
            const balance = getPublisherBalance(row)
            return (
              <div
                key={row.id}
                className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">ID: {row.id}</span>
                    <h3 className="font-bold text-gray-800">{row.name || 'N/A'}</h3>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    row.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    row.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {row.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 border-t border-b border-gray-100 py-3">
                  <div>
                    <p className="text-gray-400 font-medium">Email</p>
                    <p className="font-semibold text-gray-800 break-all">{row.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Mobile</p>
                    <p className="font-semibold text-gray-800">{row.mobile || 'N/A'}</p>
                  </div>
                  <div className="mt-1">
                    <p className="text-gray-400 font-medium">Traffic Source</p>
                    <p className="font-semibold text-gray-800">{row.trafficSource || 'N/A'}</p>
                  </div>
                  <div className="mt-1">
                    <p className="text-gray-400 font-medium">Payment Method</p>
                    <p className="font-semibold text-gray-800">{row.paymentMethod || 'N/A'}</p>
                  </div>
                  <div className="mt-1 col-span-2 flex justify-between border-t border-gray-50 pt-2">
                    <div>
                      <p className="text-gray-400 font-medium">Balance</p>
                      <p className="font-bold text-green-600 text-sm">₹{balance.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-medium text-right">Joined</p>
                      <p className="font-semibold text-gray-800 text-right">{new Date(row.joinedAt || '').toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 justify-end">
                  {row.status === 'PENDING' && (
                    <button
                      onClick={() => void patchPublisher(row.id, { status: 'APPROVED' })}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/50 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {row.status === 'APPROVED' && (
                    <button
                      onClick={() => void patchPublisher(row.id, { status: 'SUSPENDED' })}
                      className="rounded-lg border border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100/50 transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                  {row.status === 'SUSPENDED' && (
                    <button
                      onClick={() => void patchPublisher(row.id, { status: 'APPROVED' })}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/50 transition-colors"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => void editWalletBalance(row)}
                    className="rounded-lg border border-indigo-500/30 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/50 transition-colors"
                  >
                    Wallet
                  </button>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/admin/publishers/${row.id}`, { cache: 'no-store' })
                      const json = await res.json()
                      setSelectedPublisher(json.publisher || row)
                      setAdjustBalance('0')
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => void deletePublisher(row)}
                    className="rounded-lg border border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100/50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {selectedPublisher ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/70">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-brand-border bg-white border border-brand-border shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Publisher Details</h2>
              <button onClick={() => setSelectedPublisher(null)} className="rounded border border-brand-border px-2 py-1 text-xs">Close</button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[#374151]">
              <p><strong>Name:</strong> {selectedPublisher.name}</p>
              <p><strong>Email:</strong> {selectedPublisher.email}</p>
              <p><strong>Mobile:</strong> {selectedPublisher.mobile}</p>
              <p><strong>Traffic:</strong> {selectedPublisher.trafficSource}</p>
              <p><strong>Payment Method:</strong> {selectedPublisher.paymentMethod}</p>
              <p><strong>Lead Count:</strong> {selectedPublisher.leadCount ?? 0}</p>
              <p><strong>Balance:</strong> {getPublisherBalance(selectedPublisher).toFixed(2)}</p>
              <div>
                <p className="mb-1 font-semibold">Payment Details:</p>
                <pre className="overflow-x-auto rounded bg-brand-bg p-2 text-xs">
                  {JSON.stringify(selectedPublisher.paymentDetails || {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold">Offer Requests</p>
              <div className="space-y-2">
                {(selectedPublisher.publisherOffers || []).length === 0 ? <p className="text-xs text-[#AFAFC2]">No offer requests yet.</p> : null}
                {(selectedPublisher.publisherOffers || []).map((item) => (
                  <div key={item.id} className="rounded border border-brand-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.offer?.name || `Offer #${item.offerId}`}</p>
                        <p className="text-xs text-[#AFAFC2]">{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'Requested'}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' : item.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{item.status}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={async () => { await patchPublisher(selectedPublisher.id, { offerId: item.offerId, offerStatus: 'APPROVED' }); const res = await fetch(`/api/admin/publishers/${selectedPublisher.id}`, { cache: 'no-store' }); const json = await res.json(); setSelectedPublisher(json.publisher || null) }} className="rounded border border-emerald-500/40 px-2 py-1">Approve Offer</button>
                      <button onClick={async () => { await patchPublisher(selectedPublisher.id, { offerId: item.offerId, offerStatus: 'REJECTED' }); const res = await fetch(`/api/admin/publishers/${selectedPublisher.id}`, { cache: 'no-store' }); const json = await res.json(); setSelectedPublisher(json.publisher || null) }} className="rounded border border-red-500/40 px-2 py-1">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm">Adjust Balance</label>
              <input value={adjustBalance} onChange={(e) => setAdjustBalance(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  await patchPublisher(selectedPublisher.id, { adjustBalance: Number(adjustBalance) })
                  setSelectedPublisher(null)
                }}
                className="mt-2 rounded-lg bg-white border border-brand-border shadow-sm px-4 py-2 text-sm font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => void editWalletBalance(selectedPublisher)}
                className="mt-2 ml-2 rounded-lg border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-700"
              >
                Set Exact Wallet
              </button>
            </div>
            <div className="mt-6 border-t border-brand-border pt-4">
              <button
                onClick={() => void deletePublisher(selectedPublisher)}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-700"
              >
                Delete Publisher
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

