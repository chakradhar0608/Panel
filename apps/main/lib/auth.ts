import { cookies } from 'next/headers'

type SessionPayload = {
  publisherId?: number
  adminId?: number
  email?: string
}

type AdminSessionUser = {
  id: number
  email: string
  name: string
}

function parseSession(
  raw: string | undefined
): SessionPayload | null {
  if (!raw) return null

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(decoded) as SessionPayload
  } catch {
    return null
  }
}

export function createSessionCookieValue(
  payload: SessionPayload
) {
  return Buffer.from(
    JSON.stringify(payload)
  ).toString('base64')
}

export async function requirePublisher() {
  const { db } = await import('@nccamp/db')

  const jar = cookies()

  const session = parseSession(
    jar.get('publisher_session')?.value
  )

  if (!session?.publisherId) return null

  const publisher = await db.publisher.findUnique({
    where: { id: session.publisherId },
  })

  if (!publisher) return null

  return publisher
}

export async function requireApprovedPublisher() {
  const publisher = await requirePublisher()

  if (!publisher) return null
  if (publisher.status !== 'APPROVED') return null

  return publisher
}

export async function requireAdmin() {
  const jar = cookies()

  const session = parseSession(
    jar.get('admin_session')?.value
  )

  if (!session) return null

  // Environment admin does not need the database
  const envEmail = process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase()

  if (
    session.email &&
    envEmail &&
    session.email.toLowerCase() === envEmail
  ) {
    return {
      id: 0,
      email: envEmail,
      name: 'Environment Admin',
    } as AdminSessionUser
  }

  // Only load the database for normal database admins
  if (session.adminId) {
    const { db } = await import('@nccamp/db')

    const admin = await db.adminUser.findUnique({
      where: { id: session.adminId },
    })

    if (admin) return admin
  }

  return null
}
