import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

function toApiError(err: unknown): { status: number; body: any } {
  const e = err as any
  const msg = typeof e?.message === 'string' ? e.message : 'Internal Server Error'
  const code = typeof e?.code === 'string' ? e.code : undefined

  // Prisma: database unreachable
  if (code === 'P1001' || String(msg).includes('DatabaseNotReachable')) {
    return {
      status: 503,
      body: {
        error: 'Database unreachable. Check your network/DNS or Neon availability.',
        code,
      },
    }
  }

  return { status: 500, body: { error: msg, code } }
}

const SaveWorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const body = await req.json()
    const parsed = SaveWorkflowSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
    
    const { id, name, nodes, edges } = parsed.data
    
    const workflow = await prisma.workflow.upsert({
      where: { id: id && id !== 'new' ? id : 'new' },
      create: { userId, name, nodes, edges },
      update: { name, nodes, edges, updatedAt: new Date() },
    })
    
    return NextResponse.json(workflow)
  } catch (err) {
    const apiErr = toApiError(err)
    return NextResponse.json(apiErr.body, { status: apiErr.status })
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, updatedAt: true, createdAt: true }
    })
    
    return NextResponse.json(workflows)
  } catch (err) {
    const apiErr = toApiError(err)
    return NextResponse.json(apiErr.body, { status: apiErr.status })
  }
}
