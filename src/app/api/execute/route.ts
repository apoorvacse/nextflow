import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { tasks } from '@trigger.dev/sdk/v3'
import type { workflowOrchestrator } from '@/trigger/workflowOrchestrator'

function toApiError(err: unknown): { status: number; body: any } {
  const e = err as any
  const msg = typeof e?.message === 'string' ? e.message : 'Internal Server Error'
  const code = typeof e?.code === 'string' ? e.code : undefined

  if (code === 'P1001' || String(msg).includes('DatabaseNotReachable')) {
    return {
      status: 503,
      body: {
        error: 'Database unreachable. Cannot start run.',
        code,
      },
    }
  }
  return { status: 500, body: { error: msg, code } }
}

const ExecuteSchema = z.object({
  workflowId: z.string(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  nodeIds: z.array(z.string()).optional(), // if undefined = run all
  scope: z.enum(['full', 'partial', 'single']),
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = ExecuteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { workflowId, nodes, edges, nodeIds, scope } = parsed.data

    // Create run record
    const run = await prisma.run.create({
      data: {
        workflowId,
        userId,
        status: 'RUNNING',
        scope: scope.toUpperCase() as any,
      }
    })

    // Trigger the orchestrator task
    const handle = await tasks.trigger<typeof workflowOrchestrator>('workflow-orchestrator', {
      runId: run.id,
      nodes,
      edges,
      nodeIds,
      userId,
    })

    return NextResponse.json({ runId: run.id, triggerId: handle.id })
  } catch (err) {
    const apiErr = toApiError(err)
    return NextResponse.json(apiErr.body, { status: apiErr.status })
  }
}
