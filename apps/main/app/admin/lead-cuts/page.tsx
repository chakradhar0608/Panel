'use client'

import { useEffect, useState } from 'react'

type StatsData = {
  totalCut: number
  totalProcessed: number
  totalReceived: number
  cutRate: number
  byOffer: { offerId: number; offerName: string; cut: number; processed: number; received: number; cutRate: number }[]
  byDate: { date: string; cut: number; processed: number; received: number; cutRate: number }[]
  records: {
    id: number
    offerId: number
    offerName: string
    publisherId: number
    publisherName: string
    clickId: string
    eventName: string
    payout: number
    cutAt: string
  }[]
  total: number
  page: number
  limit: number
}

type Offer = { id: number; name: string }

type DatePreset = 'today' | 'yesterday' | 'last7' | 'custom'

function toIstDate(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function presetDates(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const today = toIstDate()
  if (preset === 'today') return { dateFrom: today, dateTo: today }
  if (preset === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const y = toIstDate(d)
    return { dateFrom: y, dateTo: y }
  }
  if (preset === 'last7') {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return { dateFrom: toIstDate(d), dateTo: today }
  }
  return { dateFrom: '', dateTo: '' }
}

export default function LeadCutsPage() {
  const [preset, setPreset] = useState<DatePreset>('today')
  const [dateFrom, setDateFrom] = useState(toIstDate())
  const [dateTo, setDateTo] = useState(toIstDate())
  const [offerId, setOfferId] = useState('')
  const [offers, setOffers] = useState<Offer[]>([])
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/admin/offers', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setOffers(Array.isArray(d?.offers) ? d.offers : []))
      .catch(() => {})
  }, [])

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (offerId) params.set('offerId', offerId)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/admin/lead-cuts?${params}`, { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, offerId])

  const applyPreset = (p: DatePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      const { dateFrom: df, dateTo: dt } = presetDates(p)
      setDateFrom(df)
      setDateTo(dt)
    }
  }

  const fmtTime = (iso: string) =>
    iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : '—'

  const presetBtn = (p: DatePreset, label: string) => (
    <button
      key={p}
      onClick={() => applyPreset(p)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
        preset === p
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'border-brand-border bg-white text-brand-textSecondary hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Lead Cut Stats</h1>

      {/* Filters */}
      <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {presetBtn('today', 'Today')}
            {presetBtn('yesterday', 'Yesterday')}
            {presetBtn('last7', 'Last 7 Days')}
            {presetBtn('custom', 'Custom')}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-sm"
              />
              <span className="text-brand-textMuted text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-sm"
              />
            </div>
          )}

          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-sm min-w-[160px]"
          >
            <option value="">All Offers</option>
            {offers.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>

          <button
            onClick={() => load(1)}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total Received', value: data.totalReceived, color: 'text-blue-600' },
            { label: 'Total Cut', value: data.totalCut, color: 'text-red-500' },
            { label: 'Total Passed', value: data.totalProcessed, color: 'text-green-600' },
            { label: 'Cut Rate', value: `${data.cutRate}%`, color: 'text-orange-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
              <p className="text-xs text-brand-textMuted">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {!data && !loading && (
        <p className="text-center text-brand-textMuted py-8">Select filters and click Refresh.</p>
      )}
      {loading && (
        <p className="text-center text-brand-textMuted py-8">Loading…</p>
      )}

      {data && (
        <>
          {/* By Offer Table */}
          {data.byOffer.length > 0 && (
            <div>
              <h2 className="mb-2 text-base font-bold">By Offer</h2>
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white border-b border-brand-border text-[#1F2937]">
                    <tr>
                      <th className="px-3 py-2">Offer</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right text-red-500">Cut</th>
                      <th className="px-3 py-2 text-right text-green-600">Passed</th>
                      <th className="px-3 py-2 text-right text-orange-500">Cut Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byOffer.map((row, i) => (
                      <tr key={row.offerId} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-bg'}>
                        <td className="px-3 py-2 font-medium">{row.offerName}</td>
                        <td className="px-3 py-2 text-right">{row.received}</td>
                        <td className="px-3 py-2 text-right text-red-500">{row.cut}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.processed}</td>
                        <td className="px-3 py-2 text-right text-orange-500">{row.cutRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* By Offer Mobile Grid */}
              <div className="md:hidden space-y-3">
                {data.byOffer.map((row) => (
                  <div key={row.offerId} className="bg-white rounded-xl border border-brand-border p-4 space-y-2 shadow-sm">
                    <h3 className="font-bold text-gray-800">{row.offerName}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-50 pt-2 text-gray-600">
                      <div>
                        <p className="text-gray-400">Received</p>
                        <p className="font-semibold text-gray-800">{row.received}</p>
                      </div>
                      <div>
                        <p className="text-red-500">Cut</p>
                        <p className="font-semibold text-red-600">{row.cut}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Passed</p>
                        <p className="font-semibold text-green-600">{row.processed}</p>
                      </div>
                      <div>
                        <p className="text-orange-500">Cut Rate</p>
                        <p className="font-bold text-orange-600">{row.cutRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Date Table */}
          {data.byDate.length > 0 && (
            <div>
              <h2 className="mb-2 text-base font-bold mt-4 md:mt-0">By Date</h2>
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-white border-b border-brand-border text-[#1F2937]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right text-red-500">Cut</th>
                      <th className="px-3 py-2 text-right text-green-600">Passed</th>
                      <th className="px-3 py-2 text-right text-orange-500">Cut Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byDate.map((row, i) => (
                      <tr key={row.date} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-bg'}>
                        <td className="px-3 py-2 font-medium">{row.date}</td>
                        <td className="px-3 py-2 text-right">{row.received}</td>
                        <td className="px-3 py-2 text-right text-red-500">{row.cut}</td>
                        <td className="px-3 py-2 text-right text-green-600">{row.processed}</td>
                        <td className="px-3 py-2 text-right text-orange-500">{row.cutRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* By Date Mobile Grid */}
              <div className="md:hidden space-y-3">
                {data.byDate.map((row) => (
                  <div key={row.date} className="bg-white rounded-xl border border-brand-border p-4 space-y-2 shadow-sm">
                    <h3 className="font-bold text-gray-800">{row.date}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-50 pt-2 text-gray-600">
                      <div>
                        <p className="text-gray-400">Received</p>
                        <p className="font-semibold text-gray-850">{row.received}</p>
                      </div>
                      <div>
                        <p className="text-red-500">Cut</p>
                        <p className="font-semibold text-red-650">{row.cut}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Passed</p>
                        <p className="font-semibold text-green-750">{row.processed}</p>
                      </div>
                      <div>
                        <p className="text-orange-500">Cut Rate</p>
                        <p className="font-bold text-orange-600">{row.cutRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cut Records Table */}
          <div className="mt-4">
            <h2 className="mb-2 text-base font-bold">
              Cut Records
              <span className="ml-2 text-xs font-normal text-brand-textMuted">({data.total} total)</span>
            </h2>
            {data.records.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white p-8 text-center text-sm text-brand-textMuted">
                No cut leads found for this period.
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-white border-b border-brand-border text-[#1F2937]">
                      <tr>
                        <th className="px-3 py-2">Cut At (IST)</th>
                        <th className="px-3 py-2">Offer</th>
                        <th className="px-3 py-2">Publisher</th>
                        <th className="px-3 py-2">Click ID</th>
                        <th className="px-3 py-2">Event</th>
                        <th className="px-3 py-2 text-right">Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((rec, i) => (
                        <tr key={rec.id} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-bg'}>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtTime(rec.cutAt)}</td>
                          <td className="px-3 py-2">{rec.offerName}</td>
                          <td className="px-3 py-2">{rec.publisherName}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-brand-textMuted">{rec.clickId}</td>
                          <td className="px-3 py-2">{rec.eventName}</td>
                          <td className="px-3 py-2 text-right">₹{rec.payout.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cut Records Mobile Grid */}
                <div className="md:hidden space-y-3">
                  {data.records.map((rec) => (
                    <div key={rec.id} className="bg-white rounded-xl border border-brand-border p-4 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">ID: {rec.id}</span>
                        <span className="text-xs text-gray-505 font-semibold">{fmtTime(rec.cutAt)}</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <p><span className="text-gray-400 font-medium">Offer:</span> <span className="font-bold text-gray-800">{rec.offerName}</span></p>
                        <p><span className="text-gray-400 font-medium">Publisher:</span> <span className="font-bold text-gray-800">{rec.publisherName}</span></p>
                        <p><span className="text-gray-400 font-medium">Event:</span> <span className="font-semibold text-gray-750 bg-gray-50 px-1.5 py-0.5 rounded">{rec.eventName}</span></p>
                        <p><span className="text-gray-400 font-medium">Payout:</span> <span className="font-extrabold text-green-600">₹{rec.payout.toFixed(2)}</span></p>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Click ID</p>
                        <p className="font-mono text-xs text-gray-650 break-all select-all leading-normal">{rec.clickId}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {data.total > data.limit && (
                  <div className="mt-3 flex items-center justify-between text-xs text-brand-textMuted">
                    <span>
                      Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={data.page <= 1}
                        onClick={() => load(data.page - 1)}
                        className="rounded border border-brand-border px-3 py-1 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={data.page * data.limit >= data.total}
                        onClick={() => load(data.page + 1)}
                        className="rounded border border-brand-border px-3 py-1 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
