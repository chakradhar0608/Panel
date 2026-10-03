'use client'

import { useEffect, useMemo, useState } from 'react'

type Withdrawal = { id: number; publisher: { id: number; name: string; email: string }; amount: number; method: string; paymentDetails: string; status: string; requestedAt?: string | null; adminNote: string | null; transactionRef: string | null }
type Summary = { totalPendingCount: number; totalPendingAmount: number; approvedToday: number; totalPaidOut: number; averagePayout: number }

export default function AdminWithdrawalsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [requests, setRequests] = useState<Withdrawal[]>([])
  const [status, setStatus] = useState('ALL')
  const [publisherId, setPublisherId] = useState('')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  const query = useMemo(() => {
    const params = new URLSearchParams({ status })
    if (publisherId) params.set('publisherId', publisherId)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('page', '1')
    params.set('limit', '100')
    return params.toString()
  }, [status, publisherId, dateFrom, dateTo])

  const load = async () => {
    setLoading(true)
    const [sRes, rRes] = await Promise.all([
      fetch('/api/admin/withdrawal-requests?summary=true', { cache: 'no-store' }),
      fetch(`/api/admin/withdrawal-requests?${query}`, { cache: 'no-store' }),
    ])
    const sJson = await sRes.json()
    const rJson = await rRes.json()
    setSummary(sJson)
    setRequests(rJson.requests || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [query])

  const filteredRequests = useMemo(() => {
    const queryValue = search.trim().toLowerCase()
    return requests.filter((item) => {
      if (methodFilter !== 'ALL' && item.method !== methodFilter) return false
      if (!queryValue) return true
      return [
        item.id,
        item.publisher.id,
        item.publisher.name,
        item.publisher.email,
        item.amount,
        item.method,
        item.status,
        item.transactionRef,
        item.adminNote,
      ]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(queryValue))
    })
  }, [requests, search, methodFilter])

  const patch = async (id: number, payload: Record<string, string>) => {
    await fetch(`/api/admin/withdrawal-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    await load()
  }

  return (
    <div className="space-y-4">
      {summary && summary.totalPendingCount > 0 ? <button className="w-full rounded bg-orange-100 p-3 text-left text-orange-700" onClick={() => document.getElementById('first-pending')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>⚠️ You have {summary.totalPendingCount} pending withdrawal requests totalling ₹{summary.totalPendingAmount.toFixed(2)}</button> : null}
      <div><h1 className="text-2xl font-bold">Withdrawal Requests</h1><p className="text-sm text-brand-textMuted">Manage publisher payment requests</p></div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white border border-brand-border shadow-sm p-4 text-brand-textPrimary"><p className="text-xs text-brand-textSecondary">Total Pending</p><p className="text-2xl font-bold">{summary?.totalPendingCount || 0}</p><p className="text-sm">₹{Number(summary?.totalPendingAmount || 0).toFixed(2)}</p></div>
        <div className="rounded-xl bg-white border border-brand-border shadow-sm p-4 text-brand-textPrimary"><p className="text-xs text-brand-textSecondary">Approved Today</p><p className="text-2xl font-bold">{summary?.approvedToday || 0}</p></div>
        <div className="rounded-xl bg-white border border-brand-border shadow-sm p-4 text-brand-textPrimary"><p className="text-xs text-brand-textSecondary">Total Paid Out</p><p className="text-2xl font-bold">₹{Number(summary?.totalPaidOut || 0).toFixed(2)}</p></div>
        <div className="rounded-xl bg-white border border-brand-border shadow-sm p-4 text-brand-textPrimary"><p className="text-xs text-brand-textSecondary">Average Payout</p><p className="text-2xl font-bold">₹{Number(summary?.averagePayout || 0).toFixed(2)}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl bg-white border border-brand-border shadow-sm p-4 text-brand-textPrimary md:grid-cols-7"><select className="rounded border px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option>{['PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => <option key={s}>{s}</option>)}</select><input className="rounded border px-2 py-1" placeholder="Publisher ID" value={publisherId} onChange={(e) => setPublisherId(e.target.value)} /><input className="rounded border px-2 py-1" placeholder="Search publisher, ref, amount" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="rounded border px-2 py-1" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}><option value="ALL">All Methods</option><option value="UPI">UPI</option><option value="BANK">BANK</option></select><input type="date" className="rounded border px-2 py-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /><input type="date" className="rounded border px-2 py-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /><button className="rounded border px-3 py-1" onClick={() => { setStatus('ALL'); setPublisherId(''); setSearch(''); setMethodFilter('ALL'); setDateFrom(''); setDateTo('') }}>Reset</button></div>

      <div className="hidden md:block overflow-auto rounded-xl bg-white border border-brand-border shadow-sm text-brand-textPrimary">
        <table className="min-w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-brand-textMuted"><tr><th className="px-3 py-2 text-left">ID</th><th className="px-3 py-2 text-left">Publisher</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-left">Payment Details</th><th className="px-3 py-2 text-left">Requested</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Actions</th></tr></thead><tbody>{loading ? <tr><td className="px-3 py-3" colSpan={8}><div className="h-4 animate-pulse rounded bg-gray-200" /></td></tr> : null}{!loading && filteredRequests.length === 0 ? <tr><td className="px-3 py-6 text-center text-brand-textSecondary" colSpan={8}>No withdrawal requests match the current filters.</td></tr> : null}{filteredRequests.map((item, idx) => { const details = (() => { try { return JSON.parse(item.paymentDetails) as Record<string, string> } catch { return {} } })(); const normalizedStatus = item.status || 'PENDING'; const isPending = normalizedStatus === 'PENDING'; const rowId = idx === 0 && isPending ? 'first-pending' : undefined; return <tr key={item.id} id={rowId} className="border-t border-brand-border"><td className="px-3 py-2">#{item.id}</td><td className="px-3 py-2"><p className="font-semibold">{item.publisher.name}</p><p className="text-xs text-brand-textSecondary">{item.publisher.email}</p></td><td className="px-3 py-2 text-lg font-semibold">₹{item.amount.toFixed(2)}</td><td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{item.method === 'BANK' ? 'Bank Transfer' : item.method}</span></td><td className="max-w-xs px-3 py-2 text-xs text-gray-600">{item.method === 'UPI' ? details.upiId : `Account: ${details.accountNo || ''} / IFSC: ${details.ifsc || ''}`}</td><td className="px-3 py-2"><p>{item.requestedAt ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(item.requestedAt)) : 'Not recorded'}</p></td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${normalizedStatus === 'PENDING' ? 'bg-orange-100 text-orange-700' : normalizedStatus === 'PAID' ? 'bg-green-100 text-green-700' : normalizedStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{normalizedStatus}</span></td><td className="px-3 py-2"><div className="flex gap-1">{['PENDING', 'APPROVED'].includes(normalizedStatus) ? <button className="rounded border border-green-300 px-2 py-1 text-green-700" onClick={() => { const transactionRef = prompt('Enter UTR or transaction ID') || ''; if (!transactionRef.trim()) return; void patch(item.id, { status: 'PAID', transactionRef }) }}>Mark as Paid</button> : null}{normalizedStatus === 'PENDING' ? <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => { const adminNote = prompt('Reason for rejection') || ''; if (!adminNote.trim()) return; void patch(item.id, { status: 'REJECTED', adminNote }) }}>Reject</button> : null}</div></td></tr> })}</tbody></table>
      </div>

      {/* Mobile view cards */}
      <div className="space-y-4 md:hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 animate-pulse rounded-xl bg-white border border-brand-border p-4" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl bg-white border border-brand-border p-6 text-center text-brand-textSecondary shadow-sm">
            No withdrawal requests match the current filters.
          </div>
        ) : (
          filteredRequests.map((item, idx) => {
            const details = (() => {
              try {
                return JSON.parse(item.paymentDetails) as Record<string, string>
              } catch {
                return {}
              }
            })()
            const normalizedStatus = item.status || 'PENDING'
            const isPending = normalizedStatus === 'PENDING'
            const rowId = idx === 0 && isPending ? 'first-pending' : undefined

            return (
              <div
                key={item.id}
                id={rowId}
                className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">#{item.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    normalizedStatus === 'PENDING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    normalizedStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    normalizedStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {normalizedStatus}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{item.publisher.name}</h3>
                    <p className="text-xs text-brand-textSecondary">{item.publisher.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Amount</p>
                    <p className="text-base font-bold text-gray-900">₹{item.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-gray-100 py-3 text-gray-600">
                  <div>
                    <p className="text-gray-400 font-medium">Method</p>
                    <span className="inline-block mt-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {item.method === 'BANK' ? 'Bank' : item.method}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Requested</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {item.requestedAt
                        ? new Intl.DateTimeFormat('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata',
                          }).format(new Date(item.requestedAt))
                        : 'Not recorded'}
                    </p>
                  </div>
                  <div className="col-span-2 mt-1">
                    <p className="text-gray-400 font-medium">Payment Details</p>
                    <p className="font-semibold text-gray-800 mt-0.5 bg-gray-50 p-2 rounded-lg border border-gray-100 break-all select-all font-mono text-xs">
                      {item.method === 'UPI'
                        ? details.upiId
                        : `A/C: ${details.accountNo || ''} / IFSC: ${details.ifsc || ''}`}
                    </p>
                  </div>
                  {(item.transactionRef || item.adminNote) && (
                    <div className="col-span-2 mt-1 space-y-1">
                      {item.transactionRef && (
                        <p className="text-xs">
                          <span className="text-gray-400 font-medium">Ref/UTR:</span>{' '}
                          <span className="font-semibold text-gray-800 bg-gray-50 px-1 rounded">{item.transactionRef}</span>
                        </p>
                      )}
                      {item.adminNote && (
                        <p className="text-xs">
                          <span className="text-gray-400 font-medium">Note:</span>{' '}
                          <span className="font-semibold text-rose-600">{item.adminNote}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {['PENDING', 'APPROVED'].includes(normalizedStatus) && (
                    <button
                      className="rounded-lg border border-green-500/30 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100/50 transition-colors"
                      onClick={() => {
                        const transactionRef = prompt('Enter UTR or transaction ID') || ''
                        if (!transactionRef.trim()) return
                        void patch(item.id, { status: 'PAID', transactionRef })
                      }}
                    >
                      Mark as Paid
                    </button>
                  )}
                  {normalizedStatus === 'PENDING' && (
                    <button
                      className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100/50 transition-colors"
                      onClick={() => {
                        const adminNote = prompt('Reason for rejection') || ''
                        if (!adminNote.trim()) return
                        void patch(item.id, { status: 'REJECTED', adminNote })
                      }}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

