import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { tasks } from '@trigger.dev/sdk/v3'
import type { workflowOrchestrator } from '@/trigger/workflowOrchestrator'

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
}
