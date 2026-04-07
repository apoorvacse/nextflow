import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const SaveWorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
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
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true, createdAt: true }
  })
  
  return NextResponse.json(workflows)
}
