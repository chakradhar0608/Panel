'use client'

import { useEffect, useMemo, useState } from 'react'

type WithdrawalRequest = { id: number; amount: number; method: 'UPI' | 'BANK'; paymentDetails?: string; status: 'PENDING' | 'PAID' | 'REJECTED'; requestedAt?: string | null; processedAt?: string | null; transactionRef?: string | null; adminNote?: string | null }
type WalletResponse = { walletBalance: number; totalWithdrawn: number; pendingWithdrawalAmount: number; pendingWithdrawalCount: number; hasPendingRequest: boolean; withdrawalRequests: WithdrawalRequest[] }

const STAT_CARDS = [
  { key: 'walletBalance', label: 'BALANCE', bg: 'bg-pink-600' },
]

export default function WalletPage() {
  const [data, setData] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [upiId, setUpiId] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [holderName, setHolderName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/partner/wallet', { cache: 'no-store' })
    const json = (await res.json()) as WalletResponse
    setData(json)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const submit = async () => {
    setError('')
    const amountNum = Number(amount)
    if (amountNum < 500) return setError('Minimum withdrawal is ₹500')
    if (amountNum > Number(data?.walletBalance || 0)) return setError(`Amount exceeds your available balance (₹${data?.walletBalance || 0})`)
    if (!method) return setError('Please select a payment method')
    if (method === 'UPI' && !upiId) return setError('UPI ID is required')
    if (method === 'BANK' && (!accountNo || !ifsc || !holderName)) return setError('Bank account details are required')

    setSubmitting(true)
    const res = await fetch('/api/partner/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountNum, method, paymentDetails: method === 'UPI' ? { upiId } : { accountNo, ifsc, holderName } }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.message || json.error || 'Request failed')
    else { setAmount(''); setMethod(''); setUpiId(''); setAccountNo(''); setIfsc(''); setHolderName(''); await load() }
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-textPrimary">My Wallet</h1>
          <p className="text-sm text-brand-textMuted">Manage your funds and withdrawals</p>
        </div>
      </div>

      <div className="max-w-md">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className={`${card.bg} rounded-xl p-5 text-white shadow-sm`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{card.label}</p>
            <p className="text-3xl font-bold">₹{card.noDecimal ? String(Number(data?.[card.key as keyof WalletResponse] || 0)) : Number(data?.[card.key as keyof WalletResponse] || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-brand-textPrimary">Request Withdrawal</p>
          {data?.pendingWithdrawalCount ? <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">{data.pendingWithdrawalCount} pending</span> : null}
        </div>
        {data?.pendingWithdrawalCount ? <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">Pending withdrawals do not block new requests. Available balance already excludes pending amounts.</div> : null}
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">Amount</label>
              <input type="number" placeholder="Min. ₹500.00" className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-textMuted">Method</label>
              <select className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">Select Method</option><option value="UPI">UPI</option><option value="BANK">Bank Transfer</option>
              </select>
            </div>
          </div>
          {method === 'UPI' ? <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" placeholder="UPI ID" /> : null}
          {method === 'BANK' ? <div className="grid grid-cols-1 gap-2 md:grid-cols-3"><input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Account No" /><input value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" placeholder="IFSC" /><input value={holderName} onChange={(e) => setHolderName(e.target.value)} className="rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100" placeholder="Holder Name" /></div> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button disabled={submitting} onClick={submit} className="w-full rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-white p-5 shadow-sm">
        <p className="mb-3 font-semibold text-brand-textPrimary">Withdrawal Transactions</p>
        {!loading && (data?.withdrawalRequests || []).length === 0 ? <p className="py-8 text-center text-brand-textMuted">No withdrawal requests yet</p> : null}
        <div className="hidden md:block overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-brand-textMuted">
              <tr>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Amount</th>
                <th className="py-2 text-left">Withdraw Type</th>
                <th className="py-2 text-left">Details</th>
                <th className="py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {(data?.withdrawalRequests || []).map((request) => {
                const details = (() => {
                  try { return JSON.parse(request.paymentDetails || '{}') as Record<string, string> } catch { return {} }
                })()
                const detailText = request.method === 'UPI'
                  ? details.upiId || '-'
                  : `A/C: ${details.accountNo || '-'} | IFSC: ${details.ifsc || '-'} | ${details.holderName || '-'}`
                const statusLabel = request.status === 'PAID' ? 'APPROVED' : request.status
                return (
                <tr key={request.id}>
                  <td className="py-2 text-brand-textSecondary">
                    {request.requestedAt
                      ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(request.requestedAt))
                      : 'Not recorded'}
                  </td>
                  <td className="py-2 font-semibold text-brand-textPrimary">₹{request.amount.toFixed(2)}</td>
                  <td className="py-2 text-brand-textSecondary">{request.method === 'BANK' ? 'Bank Transfer' : request.method}</td>
                  <td className="max-w-xs py-2 text-brand-textMuted">{detailText}</td>
                  <td className={`py-2 text-xs font-semibold ${statusLabel === 'APPROVED' ? 'text-green-600' : statusLabel === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>{statusLabel}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="space-y-4 md:hidden">
          {(data?.withdrawalRequests || []).map((request) => {
            const details = (() => {
              try {
                return JSON.parse(request.paymentDetails || '{}') as Record<string, string>
              } catch {
                return {}
              }
            })()
            const detailText = request.method === 'UPI'
              ? details.upiId || '-'
              : `A/C: ${details.accountNo || '-'} | IFSC: ${details.ifsc || '-'} | ${details.holderName || '-'}`
            const statusLabel = request.status === 'PAID' ? 'APPROVED' : request.status

            return (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-xs font-semibold text-gray-400">Request #{request.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    statusLabel === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    statusLabel === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Requested On</p>
                    <p className="text-xs text-gray-800 font-semibold mt-0.5">
                      {request.requestedAt
                        ? new Intl.DateTimeFormat('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata',
                          }).format(new Date(request.requestedAt))
                        : 'Not recorded'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-medium">Amount</p>
                    <p className="text-base font-bold text-gray-900 font-mono">₹{request.amount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs border-t border-gray-100 pt-3 text-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-medium">Withdraw Type:</span>
                    <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[10px]">
                      {request.method === 'BANK' ? 'Bank Transfer' : request.method}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-gray-400 font-medium">Details:</span>
                    <span className="font-semibold text-gray-800 bg-gray-50 p-2 rounded-lg border border-gray-100 break-all select-all font-mono text-[11px] leading-relaxed">
                      {detailText}
                    </span>
                  </div>
                  {request.transactionRef && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-400 font-medium">Transaction Ref:</span>
                      <span className="font-semibold text-gray-850 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[10px]">{request.transactionRef}</span>
                    </div>
                  )}
                  {request.adminNote && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-gray-400 font-medium">Rejection Reason:</span>
                      <span className="font-semibold text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">{request.adminNote}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
