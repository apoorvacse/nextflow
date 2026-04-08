import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const UploadSignSchema = z.object({
  fileType: z.enum(['image', 'video']),
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = UploadSignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  
  const { fileType } = parsed.data

  const templateId = fileType === 'image' 
    ? process.env.TRANSLOADIT_TEMPLATE_ID_IMAGE
    : process.env.TRANSLOADIT_TEMPLATE_ID_VIDEO

  if (!templateId || !process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
      return NextResponse.json({ error: 'Transloadit configuration missing' }, { status: 500 })
  }

  const params = JSON.stringify({
    auth: { key: process.env.TRANSLOADIT_KEY, expires: new Date(Date.now() + 1800000).toISOString() },
    template_id: templateId,
  })

  const signature = 'sha384:' + crypto
    .createHmac('sha384', process.env.TRANSLOADIT_SECRET)
    .update(Buffer.from(params, 'utf-8'))
    .digest('hex')

  return NextResponse.json({ params, signature })
}
