import { requireAdmin } from '@/lib/auth'
import { jsonError } from '@/app/api/_utils/common'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return jsonError('UNAUTHORIZED', 401)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true })

    // Generate a clean unique name
    const ext = path.extname(file.name) || '.jpg'
    const name = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
    const filePath = path.join(uploadDir, name)

    await fs.writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/${name}`,
    })
  } catch (error: any) {
    console.error('[ADMIN_UPLOAD] File upload failed:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
