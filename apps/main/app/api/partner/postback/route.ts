import { NextResponse } from 'next/server'
import { db } from '@nccamp/db'
import { requirePublisher } from '@/lib/auth'

export async function GET() {

  
  const publisher = await requirePublisher()
  if (!publisher) {

    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  


  const postback = await db.publisherPostback.findUnique({ where: { publisherId: publisher.id } })
  
  return NextResponse.json({
    postback: postback
      ? {
          postbackUrl: postback.postbackUrl,
          isActive: postback.isActive,
          lastTestedAt: postback.lastTestedAt,
          lastTestResult: postback.lastTestResult,
        }
      : null,
  })
}

export async function POST(req: Request) {

  
  const publisher = await requirePublisher()
  if (!publisher) {

    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = (await req.json()) as { postbackUrl?: string }
  const postbackUrl = body.postbackUrl?.trim() || ''

  try {
    const parsed = new URL(postbackUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID')
    // Prevent misconfiguration loops: publisher postback must not point to our own
    // conversion intake endpoint.
    const appBase = process.env.NEXT_PUBLIC_BASE_URL
    if (appBase) {
      try {
        const appUrl = new URL(appBase)
        const isSameHost = parsed.host === appUrl.host
        const isInternalPostbackPath =
          parsed.pathname === '/api/postback' ||
          parsed.pathname.startsWith('/api/postback/')
        if (isSameHost && isInternalPostbackPath) {
          return NextResponse.json(
            {
              error: 'INVALID_POSTBACK_TARGET',
              message: 'Publisher postback URL cannot target your own /api/postback endpoint. Use publisher server endpoint.',
            },
            { status: 422 },
          )
        }
      } catch {
        // ignore base URL parsing issues
      }
    }
  } catch (error) {
    return NextResponse.json({ error: 'INVALID_URL', message: 'Please enter a valid URL' }, { status: 422 })
  }


  const postback = await db.publisherPostback.upsert({
    where: { publisherId: publisher.id },
    update: { postbackUrl, isActive: true },
    create: { publisherId: publisher.id, postbackUrl, isActive: true },
  })

  return NextResponse.json({ success: true, postback: { postbackUrl: postback.postbackUrl, isActive: postback.isActive } })
}
