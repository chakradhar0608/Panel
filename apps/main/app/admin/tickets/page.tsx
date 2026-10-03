'use client'

import { useEffect, useMemo, useState } from 'react'

type Ticket = {
  id: string | number
  name?: string
  upi?: string
  email?: string
  issueType?: string
  description?: string
  status?: string
  createdAt?: string
}

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [search, setSearch] = useState('')
  const [issueTypeFilter, setIssueTypeFilter] = useState('ALL')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [replyText, setReplyText] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      const res = await fetch(`/api/admin/tickets?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      const list = Array.isArray(data) ? data : Array.isArray(data?.tickets) ? data.tickets : []
      setRows(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const issueTypes = useMemo(
    () => Array.from(new Set(rows.map((row) => (row.issueType || '').trim()).filter(Boolean))).sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (issueTypeFilter !== 'ALL' && (row.issueType || '') !== issueTypeFilter) return false
      if (!query) return true
      return [row.id, row.name, row.upi, row.email, row.issueType, row.description, row.status]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [rows, search, issueTypeFilter])

  const patchTicket = async (id: string | number, payload: Record<string, unknown>) => {
    await fetch(`/api/admin/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await load()
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Tickets</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by id, name, email, UPI" className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm">
          <option>OPEN</option>
          <option>IN_PROGRESS</option>
          <option>RESOLVED</option>
        </select>
        <select value={issueTypeFilter} onChange={(e) => setIssueTypeFilter(e.target.value)} className="rounded-lg border border-brand-border bg-white border border-brand-border shadow-sm px-3 py-2 text-sm">
          <option value="ALL">All Issue Types</option>
          {issueTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-brand-border">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-white border border-brand-border shadow-sm">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">UPI</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Issue Type</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-2 py-4">Loading...</td></tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white border border-brand-border shadow-sm' : 'bg-brand-bg'} hover:bg-white border border-brand-border shadow-sm`}>
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2">{row.upi}</td>
                  <td className="px-2 py-2">{row.email}</td>
                  <td className="px-2 py-2">{row.issueType}</td>
                  <td className="px-2 py-2">{(row.description || '').slice(0, 40)}...</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">{new Date(row.createdAt || '').toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => { setSelected(row); setReplyText('') }} className="rounded border border-brand-border px-2 py-1">View</button>
                      <button onClick={() => void patchTicket(row.id, { status: 'IN_PROGRESS' })} className="rounded border border-brand-border px-2 py-1">In Progress</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredRows.length === 0 ? (
              <tr><td colSpan={9} className="px-2 py-4">No tickets match the current filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mt-4 space-y-4 md:hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border animate-pulse">Loading...</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-brand-border">No tickets match the current filters.</div>
        ) : (
          filteredRows.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-xl border border-brand-border shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">ID: {row.id}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  row.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  row.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {row.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-700">
                <p><span className="text-gray-400 font-medium">Name:</span> <span className="font-bold text-gray-800">{row.name || 'N/A'}</span></p>
                <p><span className="text-gray-400 font-medium">UPI:</span> <span className="font-semibold text-gray-800">{row.upi || 'N/A'}</span></p>
                <p><span className="text-gray-400 font-medium">Email:</span> <span className="font-semibold text-gray-800 break-all">{row.email || 'N/A'}</span></p>
                <p><span className="text-gray-400 font-medium">Issue Type:</span> <span className="font-semibold text-gray-750 bg-gray-50 px-1.5 py-0.5 rounded">{row.issueType}</span></p>
                <p className="border-t border-gray-100 pt-2 mt-2">
                  <span className="text-gray-400 font-medium block mb-1">Description:</span>
                  <span className="text-gray-700 leading-relaxed font-normal bg-gray-50 p-2 rounded-lg border border-gray-100 block">{row.description}</span>
                </p>
                <p className="text-[10px] text-gray-400 pt-1.5 text-right font-medium">Date: {new Date(row.createdAt || '').toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2 pt-2 justify-end border-t border-gray-50">
                <button
                  onClick={() => { setSelected(row); setReplyText('') }}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  View / Reply
                </button>
                {row.status !== 'RESOLVED' && (
                  <button
                    onClick={() => void patchTicket(row.id, { status: 'IN_PROGRESS' })}
                    className="rounded-lg border border-indigo-500/30 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-705 hover:bg-indigo-100/50 transition-colors"
                  >
                    In Progress
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-5">
            <h2 className="text-xl font-bold">Ticket #{selected.id}</h2>
            <p className="mt-2 text-sm text-[#374151]">{selected.description}</p>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply..." rows={4} className="mt-3 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await patchTicket(selected.id, { status: 'RESOLVED', adminReply: replyText })
                  setSelected(null)
                }}
                className="rounded-lg bg-white border border-brand-border shadow-sm px-4 py-2 text-sm font-semibold"
              >
                Reply + Resolve
              </button>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

