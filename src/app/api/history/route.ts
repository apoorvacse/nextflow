import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')

  const runs = await prisma.run.findMany({
    where: { userId, ...(workflowId ? { workflowId } : {}) },
    include: { nodeResults: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(runs)
}
