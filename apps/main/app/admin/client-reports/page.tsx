'use client'

import { useEffect, useRef, useState } from 'react'
import { parseOfferEvents } from '@/lib/offer-events'

type Offer = { id: number; name: string; publisherPayout: number; events: string }
type Row = { clickId: string; status: string; publisher: number | null; payout: number; clickedAt?: string; eventId?: number }

function parseClickIds(text: string) {
  const values = text
    .split(/[\n,\r\t]+/)
    .map((value) => value.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
  return Array.from(new Set(values))
}

export default function ClientReportsPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerId, setOfferId] = useState('')
  const [eventName, setEventName] = useState('')
  const [clickIds, setClickIds] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/client-reports', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setOffers(data.offers || []))
      .catch(() => setMessage('Could not load offers.'))
  }, [])

  const selectedOffer = offers.find((offer) => offer.id === Number(offerId))
  const events = selectedOffer ? parseOfferEvents(selectedOffer.events).events : []

  const loadFile = async (file: File) => {
    const text = await file.text()
    setClickIds(parseClickIds(text))
    setFileName(file.name)
    setRows([])
    setSummary(null)
    setMessage('')
  }

  const processReport = async () => {
    if (!offerId || !eventName || !clickIds.length) {
      setMessage('Select an offer, event, and upload/paste click IDs first.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/client-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', offerId: Number(offerId), eventName, clickIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Processing failed')
      setRows(data.rows || [])
      setSummary(data.summary || null)
    } catch (error: any) {
      setMessage(error.message || 'Processing failed')
    } finally {
      setLoading(false)
    }
  }

  const confirmCredit = async () => {
    if (!summary?.ready) return
    if (!window.confirm(`Confirm and credit ${summary.ready} successful click IDs for ₹${summary.payable}?`)) return
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/client-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'confirm', offerId: Number(offerId), eventName, clickIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Credit failed')
      setMessage(`Done: ${data.credited} credited, ${data.skipped} already processed, ₹${Number(data.totalPayout || 0).toFixed(2)} added.`)
      await processReport()
    } catch (error: any) {
      setMessage(error.message || 'Credit failed')
    } finally {
      setLoading(false)
    }
  }

  const clearAll = () => {
    setClickIds([]); setFileName(''); setRows([]); setSummary(null); setMessage('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Client Report Matching</h1>
        <p className="mt-1 text-sm text-brand-textSecondary">Upload successful Click IDs received from the client and match them with your tracking data.</p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.35fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">1. Campaign / Offer</label>
            <select value={offerId} onChange={(e) => { setOfferId(e.target.value); setEventName(''); setRows([]); setSummary(null) }} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium outline-none focus:border-blue-500">
              <option value="">Select offer</option>
              {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name} (#{offer.id})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">2. Event</label>
            <select value={eventName} onChange={(e) => { setEventName(e.target.value); setRows([]); setSummary(null) }} disabled={!offerId} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium outline-none focus:border-blue-500 disabled:bg-gray-50">
              <option value="">Select event</option>
              {events.map((event) => <option key={event.name} value={event.name}>{event.displayName} — ₹{Number(event.payout || 0)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-400">3. Click IDs</label>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Upload CSV/TXT</button>
              <button type="button" onClick={() => { const value = window.prompt('Paste Click IDs, one per line or comma-separated'); if (value != null) { setClickIds(parseClickIds(value)); setFileName('Pasted Click IDs'); setRows([]); setSummary(null) } }} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">Paste IDs</button>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">{clickIds.length ? `${clickIds.length.toLocaleString()} unique IDs loaded${fileName ? ` • ${fileName}` : ''}` : 'CSV/TXT: one Click ID per line or first column.'}</p>
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={processReport} disabled={loading} className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">{loading ? 'Processing…' : 'Process Report'}</button>
            <button type="button" onClick={clearAll} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Reset</button>
          </div>
        </div>
      </div>

      {message && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">{message}</div>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Total Click IDs', summary.total, 'bg-blue-50 text-blue-700'],
            ['Ready / Success', summary.ready, 'bg-emerald-50 text-emerald-700'],
            ['Already Processed', summary.alreadyProcessed, 'bg-amber-50 text-amber-700'],
            ['Not Found', summary.notFound, 'bg-red-50 text-red-700'],
            ['Total Payable', `₹${Number(summary.payable || 0).toFixed(2)}`, 'bg-purple-50 text-purple-700'],
          ].map(([label, value, cls]) => <div key={label as string} className={`rounded-2xl p-4 ${cls}`}><p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div><h2 className="font-bold text-gray-900">Matched Click IDs</h2><p className="text-xs text-gray-400">Only rows marked Ready will be credited.</p></div>
            <button type="button" onClick={confirmCredit} disabled={loading || !summary?.ready} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">Confirm &amp; Credit Success ({summary?.ready || 0})</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Click ID</th><th className="px-4 py-3">Publisher ID</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payout</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, index) => <tr key={`${row.clickId}-${index}`} className="hover:bg-gray-50"><td className="px-4 py-3 text-gray-400">{index + 1}</td><td className="px-4 py-3 font-mono text-xs text-gray-800">{row.clickId}</td><td className="px-4 py-3">{row.publisher ?? '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.status === 'READY' ? 'bg-emerald-100 text-emerald-700' : row.status === 'ALREADY_PROCESSED' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.status === 'READY' ? 'SUCCESS / READY' : row.status.replace('_', ' ')}</span></td><td className="px-4 py-3 font-semibold">{row.status === 'NOT_FOUND' ? '—' : `₹${Number(row.payout || 0).toFixed(2)}`}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
