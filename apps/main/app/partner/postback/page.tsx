'use client'

import { useEffect, useState } from 'react'

type PostbackResponse = {
  postback: {
    postbackUrl: string
    isActive: boolean
    lastTestedAt: string | null
    lastTestResult: string | null
  } | null
}

const MACROS = [
  { macro: '{click_id}', label: 'Click ID', desc: 'NCCamp internal click ID.', color: 'bg-blue-100 text-blue-700' },
  { macro: '{p1}', label: 'P1', desc: 'First custom parameter p1 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{p2}', label: 'P2', desc: 'Second custom parameter p2 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{p3}', label: 'P3', desc: 'Third custom parameter p3 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{p4}', label: 'P4', desc: 'Fourth custom parameter p4 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{p5}', label: 'P5', desc: 'Fifth custom parameter p5 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{sub1}', label: 'Sub1', desc: 'First custom parameter sub1 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{sub2}', label: 'Sub2', desc: 'Second custom parameter sub2 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{sub3}', label: 'Sub3', desc: 'Third custom parameter sub3 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{sub4}', label: 'Sub4', desc: 'Fourth custom parameter sub4 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{sub5}', label: 'Sub5', desc: 'Fifth custom parameter sub5 from your tracking link.', color: 'bg-purple-100 text-purple-700' },
  { macro: '{event_name}', label: 'Event Name', desc: 'Approved conversion event display name.', color: 'bg-orange-100 text-orange-700' },
  { macro: '{payout}', label: 'Payout', desc: 'Approved payout amount.', color: 'bg-green-100 text-green-700' },
  { macro: '{offer_id}', label: 'Offer ID', desc: 'NCCamp offer ID.', color: 'bg-blue-50 text-blue-700' },
  { macro: '{ip}', label: 'IP', desc: 'Converting user IP.', color: 'bg-gray-100 text-gray-600' },
  { macro: '{device}', label: 'Device', desc: 'Converting user device type (MOBILE/DESKTOP).', color: 'bg-gray-100 text-gray-600' },
  { macro: '{browser}', label: 'Browser', desc: 'Converting user browser (CHROME/SAFARI/etc.).', color: 'bg-gray-100 text-gray-600' },
  { macro: '{idfa}', label: 'IDFA', desc: 'Mobile advertising ID (iOS IDFA) passed on click.', color: 'bg-pink-100 text-pink-700' },
  { macro: '{gaid}', label: 'GAID', desc: 'Google Advertising ID passed from affiliate postback.', color: 'bg-pink-100 text-pink-700' },
  { macro: '{click_time}', label: 'Click Time', desc: 'Unix timestamp of the user click.', color: 'bg-amber-100 text-amber-700' },
  { macro: '{track_time}', label: 'Track Time', desc: 'Unix timestamp of the conversion postback.', color: 'bg-amber-100 text-amber-700' },
  { macro: '{tdate}', label: 'TDate', desc: 'Conversion date and time in IST.', color: 'bg-amber-100 text-amber-700' },
]

export default function PostbackPage() {
  const [postbackUrl, setPostbackUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Log state changes
  useEffect(() => {
    console.log('[PARTNER_POSTBACK_PAGE] State changed:', {
      postbackUrl: postbackUrl ? 'URL_SET' : 'URL_EMPTY',
      urlLength: postbackUrl.length,
      loading,
      saving,
      testing,
      hasResult: !!result,
      resultOk: result?.ok,
      copied
    })
  }, [postbackUrl, loading, saving, testing, result, copied])

  const exampleCallbackUrl =
    'https://yourdomain.com/postback?click_id={click_id}&p1={p1}&sub1={sub1}&event_name={event_name}&payout={payout}&gaid={gaid}&idfa={idfa}&device={device}&browser={browser}&click_time={click_time}&track_time={track_time}'

  useEffect(() => {
    const load = async () => {
      console.log('[PARTNER_POSTBACK_PAGE] Loading postback configuration')
      setLoading(true)
      
      try {
        const res = await fetch('/api/partner/postback', { cache: 'no-store' })
        console.log('[PARTNER_POSTBACK_PAGE] Load response status:', res.status, res.statusText)
        
        const json = (await res.json()) as PostbackResponse
        console.log('[PARTNER_POSTBACK_PAGE] Load response data:', {
          hasPostback: !!json.postback,
          isActive: json.postback?.isActive,
          hasUrl: !!json.postback?.postbackUrl,
          urlLength: json.postback?.postbackUrl?.length || 0,
          lastTestedAt: json.postback?.lastTestedAt,
          lastTestResult: json.postback?.lastTestResult
        })
        
        setPostbackUrl(json.postback?.postbackUrl || '')
      } catch (error) {
        console.error('[PARTNER_POSTBACK_PAGE] Load failed:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const save = async () => {
    console.log('[PARTNER_POSTBACK_PAGE] Save button clicked')
    setSaving(true)
    
    try {
      console.log('[PARTNER_POSTBACK_PAGE] Sending save request')
      const res = await fetch('/api/partner/postback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postbackUrl }),
      })
      
      console.log('[PARTNER_POSTBACK_PAGE] Save response status:', res.status, res.statusText)
      const json = await res.json()
      console.log('[PARTNER_POSTBACK_PAGE] Save response data:', json)
      
      const resultData = {
        ok: res.ok,
        text: res.ok ? 'Saved successfully.' : (json.message || json.error || 'Failed to save'),
      }
      
      console.log('[PARTNER_POSTBACK_PAGE] Setting result:', resultData)
      setResult(resultData)
    } catch (error) {
      console.error('[PARTNER_POSTBACK_PAGE] Save failed:', error)
      setResult({
        ok: false,
        text: 'Network error occurred',
      })
    } finally {
      setSaving(false)
      setTimeout(() => setResult(null), 4000)
    }
  }

  const test = async () => {
    console.log('[PARTNER_POSTBACK_PAGE] Test button clicked')
    setTesting(true)
    
    try {
      console.log('[PARTNER_POSTBACK_PAGE] Sending test request')
      const res = await fetch('/api/partner/postback/test', { method: 'POST' })
      
      console.log('[PARTNER_POSTBACK_PAGE] Test response status:', res.status, res.statusText)
      const json = await res.json()
      console.log('[PARTNER_POSTBACK_PAGE] Test response data:', json)
      
      const resultData = {
        ok: !!json.success,
        text: json.success ? `Test postback sent. Status: ${json.statusCode}` : `Failed: ${json.response || json.message || json.error}`,
      }
      
      console.log('[PARTNER_POSTBACK_PAGE] Setting test result:', resultData)
      setResult(resultData)
    } catch (error) {
      console.error('[PARTNER_POSTBACK_PAGE] Test failed:', error)
      setResult({
        ok: false,
        text: 'Network error occurred',
      })
    } finally {
      setTesting(false)
      setTimeout(() => setResult(null), 8000)
    }
  }

  const copyMacro = async (macro: string) => {
    console.log('[PARTNER_POSTBACK_PAGE] Copy macro clicked:', macro)
    try {
      await navigator.clipboard.writeText(macro)
      console.log('[PARTNER_POSTBACK_PAGE] Macro copied to clipboard:', macro)
      setCopied(macro)
      setTimeout(() => setCopied(null), 1500)
    } catch (error) {
      console.error('[PARTNER_POSTBACK_PAGE] Failed to copy macro:', macro, error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global Postback Configuration</h1>
        <p className="mt-1 text-sm text-gray-500">Configure the callback URL where NCCamp should send approved conversions.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-brand-textPrimary">
              <p className="text-lg font-semibold">Your Callback URL</p>
              <p className="text-sm text-brand-textPrimary/90">We send one request here for every approved conversion.</p>
            </div>
            <div className="p-5">
              <label className="text-xs uppercase text-gray-500">Postback URL</label>
              <input
                disabled={loading}
                value={postbackUrl}
                onChange={(e) => {
                  console.log('[PARTNER_POSTBACK_PAGE] URL input changed:', {
                    length: e.target.value.length,
                    hasValue: !!e.target.value.trim()
                  })
                  setPostbackUrl(e.target.value)
                }}
                placeholder={exampleCallbackUrl}
                className="mt-2 w-full rounded-lg border border-brand-border bg-gray-50 px-3 py-2 font-mono text-sm"
              />

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">Example callback</p>
                <p className="mt-2 break-all font-mono">{exampleCallbackUrl}</p>
                
              </div>

              <div className="mt-4 space-y-2">
                <button onClick={save} disabled={saving} className="w-full rounded-xl bg-blue-600 px-3 py-2 text-white disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button onClick={test} disabled={testing} className="w-full rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-textSecondary disabled:opacity-60">
                  {testing ? 'Testing...' : 'Test Postback'}
                </button>
              </div>

              {result ? (
                <div className={`mt-3 rounded p-3 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {result.text}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-xl border border-brand-border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <p className="font-semibold">Available Macros</p>
              <p className="text-xs text-gray-500">Click to copy</p>
            </div>
            <div className="divide-y">
              {MACROS.map(({ macro, label, desc, color }) => (
                <button
                  key={macro}
                  onClick={() => copyMacro(macro)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${color}`}>
                    {copied === macro ? 'Copied' : macro}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
