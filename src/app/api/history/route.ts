import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')

  try {
    const runs = await prisma.run.findMany({
      where: { userId, ...(workflowId ? { workflowId } : {}) },
      include: { nodeResults: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(runs)
  } catch (err: unknown) {
    const e = err as any
    const msg = typeof e?.message === 'string' ? e.message : 'Internal Server Error'
    const code = typeof e?.code === 'string' ? e.code : undefined

    if (code === 'P1001' || String(msg).includes('DatabaseNotReachable')) {
      return NextResponse.json(
        { error: 'Database unreachable. History temporarily unavailable.', code },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: msg, code }, { status: 500 })
  }
}
