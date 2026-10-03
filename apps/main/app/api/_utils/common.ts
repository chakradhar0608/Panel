import { NextResponse } from 'next/server'

export function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...(extra || {}) }, { status })
}

export function parseJsonSafe<T = unknown>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getIp(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null
}

export function detectDevice(userAgent: string | null) {
  if (!userAgent) return 'DESKTOP'
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'MOBILE'
  return 'DESKTOP'
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function generateSlugBase(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
}

export function randomChars(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
