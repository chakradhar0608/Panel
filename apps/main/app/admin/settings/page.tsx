'use client'

import { FormEvent, useEffect, useState } from 'react'

type PlatformStatsForm = {
  campsCompleted: string
  activeUsers: string
  totalPaidLakh: string
  successRate: string
}

export default function AdminSettingsPage() {
  const [stats, setStats] = useState<PlatformStatsForm>({
    campsCompleted: '100',
    activeUsers: '2000',
    totalPaidLakh: '2.3',
    successRate: '96',
  })
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/platform-stats', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setStats({
          campsCompleted: String(data.campsCompleted ?? '100'),
          activeUsers: String(data.activeUsers ?? '2000'),
          totalPaidLakh: String(data.totalPaidLakh ?? '2.3'),
          successRate: String(data.successRate ?? '96'),
        })
      }
    }
    void load()
  }, [])

  const saveStats = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await fetch('/api/admin/platform-stats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campsCompleted: Number(stats.campsCompleted),
        activeUsers: Number(stats.activeUsers),
        totalPaidLakh: Number(stats.totalPaidLakh),
        successRate: Number(stats.successRate),
      }),
    })
    setMessage('Platform stats saved.')
  }

  const testTelegram = async () => {
    await fetch('/api/admin/settings/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId }),
    })
    setMessage('Telegram test message sent.')
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Settings</h1>

      <section className="mt-6 rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-5">
        <h2 className="text-xl font-bold">Platform Stats</h2>
        <form onSubmit={saveStats} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Camps Completed</label>
            <input value={stats.campsCompleted} onChange={(e) => setStats((prev) => ({ ...prev, campsCompleted: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Active Users</label>
            <input value={stats.activeUsers} onChange={(e) => setStats((prev) => ({ ...prev, activeUsers: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Total Paid (Lakh)</label>
            <input value={stats.totalPaidLakh} onChange={(e) => setStats((prev) => ({ ...prev, totalPaidLakh: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Success Rate %</label>
            <input value={stats.successRate} onChange={(e) => setStats((prev) => ({ ...prev, successRate: e.target.value }))} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-white border border-brand-border shadow-sm px-4 py-2 text-sm font-semibold">Save</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-brand-border bg-white border border-brand-border shadow-sm p-5">
        <h2 className="text-xl font-bold">Telegram Settings</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Bot Token</label>
            <input value={botToken} onChange={(e) => setBotToken(e.target.value)} type="password" className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Admin Chat ID</label>
            <input value={chatId} onChange={(e) => setChatId(e.target.value)} className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={testTelegram} className="mt-3 rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold">
          Test
        </button>
      </section>

      {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
    </div>
  )
}

