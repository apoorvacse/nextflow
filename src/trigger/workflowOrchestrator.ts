import { task } from '@trigger.dev/sdk/v3'
import { prisma } from '@/lib/prisma'
import { llmTask } from './llmTask'
import { cropImageTask } from './cropImageTask'
import { extractFrameTask } from './extractFrameTask'

interface OrchestratorPayload {
  runId: string
  nodes: any[]
  edges: any[]
  nodeIds?: string[]
  userId: string
}

function safeNodeId(node: any): string {
  if (node?.id == null) return ''
  return typeof node.id === 'string' ? node.id : String(node.id)
}

function safeNodeType(node: any): string {
  const t = node?.type
  if (t == null) return 'unknown'
  return typeof t === 'string' ? t : String(t)
}

function safeNodeLabel(node: any): string {
  const label = node?.data?.label
  const fallback = node?.type
  const raw = label ?? fallback
  if (raw == null) return 'node'
  return typeof raw === 'string' ? raw : String(raw)
}

/** Wait until the API-created Run row is visible (Neon / pooler can lag briefly). */
async function waitForRunRecord(runId: string): Promise<void> {
  const deadline = Date.now() + 12_000
  let interval = 200
  while (Date.now() < deadline) {
    const found = await prisma.run.findUnique({
      where: { id: runId },
      select: { id: true },
    })
    if (found) return
    await new Promise((r) => setTimeout(r, interval))
    interval = Math.min(interval + 150, 800)
  }
  throw new Error(
    `[nextflow] Run "${runId}" not found in this worker's database (foreign key would fail on node results). ` +
      'Set DATABASE_URL in Trigger.dev Production to the same value as Vercel, and ensure it is not overridden by a local .env inside the deployment bundle.'
  )
}

export const workflowOrchestrator = task({
  id: 'workflow-orchestrator',
  run: async (payload: OrchestratorPayload) => {
    const { runId, nodes, edges, nodeIds } = payload

    await waitForRunRecord(runId)

    const targetNodes = nodeIds
      ? nodes.filter(n => nodeIds.includes(n.id))
      : nodes

    const nodeOutputs: Record<string, string> = {}
    const startTime = Date.now()
    let hasFailure = false

    // Seed outputs from existing node data so partial runs can consume upstream values
    // (e.g. uploaded URLs / text) without re-running those upstream nodes.
    for (const n of nodes) {
      const seeded =
        (n?.type === 'uploadImageNode' || n?.type === 'uploadVideoNode')
          ? (n?.data?.uploadedUrl ?? null)
          : n?.type === 'textNode'
            ? (n?.data?.text ?? '')
            : (typeof n?.data?.output === 'string' ? n.data.output : null)

      if (typeof seeded === 'string' && seeded.length > 0) {
        nodeOutputs[n.id] = seeded
      }
    }

    const targetIdSet = new Set(targetNodes.map(n => n.id))
    const seededIdSet = new Set(Object.keys(nodeOutputs))

    // For layering, only consider dependencies within the target set.
    const layerEdges = edges.filter(e => targetIdSet.has(e.source) && targetIdSet.has(e.target))
    const layers = getExecutionLayers(targetNodes, layerEdges)

    // For resolving inputs, allow sources outside the target set if we have a seeded output.
    const inputEdges = edges.filter(e => targetIdSet.has(e.target) && (targetIdSet.has(e.source) || seededIdSet.has(e.source)))

    for (const layer of layers) {
      // IMPORTANT: Trigger.dev does not support parallel waits (e.g. Promise.all around triggerAndWait).
      // Execute nodes in a layer sequentially for reliability.
      for (const node of layer) {
        const nodeStart = Date.now()

        const nodeResult = await prisma.nodeResult.create({
          data: {
            runId,
            nodeId: safeNodeId(node),
            nodeType: safeNodeType(node),
            nodeLabel: safeNodeLabel(node),
            status: 'RUNNING',
          }
        })

        try {
          // Fail fast when a connected upstream value is missing (upstream failed or not provided yet).
          assertConnectedInputsPresent(node, inputEdges, nodeOutputs)

          const inputs = resolveNodeInputs(node, inputEdges, nodeOutputs)
          let output: string | null = null

          if (node.type === 'llmNode') {
            const systemPromptFromInputs = Array.isArray(inputs.system_prompt)
              ? inputs.system_prompt.join('\n')
              : (inputs.system_prompt as string | undefined)
            const userMessageFromInputs = Array.isArray(inputs.user_message)
              ? inputs.user_message.join('\n')
              : (inputs.user_message as string | undefined)

            const result = await llmTask.triggerAndWait({
              nodeId: node.id,
              model: node.data.model ?? 'gemini-2.0-flash',
              systemPrompt: systemPromptFromInputs ?? node.data.systemPrompt ?? '',
              userMessage: userMessageFromInputs ?? node.data.userMessage ?? '',
              imageUrls: inputs.images ? (Array.isArray(inputs.images) ? inputs.images : [inputs.images]) : [],
            })
            if (!result.ok) throw result.error
            output = result.output.response ?? null

          } else if (node.type === 'cropImageNode') {
            const result = await cropImageTask.triggerAndWait({
              imageUrl: (inputs.image_url as string) ?? node.data.imageUrl,
              // UI stores these as snake_case keys (x_percent, etc)
              xPercent: parseFloat((inputs.x_percent as string) ?? node.data.x_percent ?? '0'),
              yPercent: parseFloat((inputs.y_percent as string) ?? node.data.y_percent ?? '0'),
              widthPercent: parseFloat((inputs.width_percent as string) ?? node.data.width_percent ?? '100'),
              heightPercent: parseFloat((inputs.height_percent as string) ?? node.data.height_percent ?? '100'),
            })
            if (!result.ok) throw result.error
            output = result.output.croppedUrl ?? null

          } else if (node.type === 'extractFrameNode') {
            const result = await extractFrameTask.triggerAndWait({
              videoUrl: (inputs.video_url as string) ?? node.data.videoUrl,
              timestamp: (inputs.timestamp as string) ?? node.data.timestamp ?? '0',
            })
            if (!result.ok) throw result.error
            output = result.output.frameUrl ?? null

          } else if (node.type === 'textNode') {
            output = node.data.text ?? ''

          } else if (node.type === 'uploadImageNode' || node.type === 'uploadVideoNode') {
            output = node.data.uploadedUrl ?? null
          }

          if (output !== null) {
            nodeOutputs[node.id] = output
          }

          const execTime = Date.now() - nodeStart
          await prisma.nodeResult.update({
            where: { id: nodeResult.id },
            data: {
              status: 'SUCCESS',
              output,
              completedAt: new Date(),
              executionTime: execTime,
              inputs,
            }
          })

        } catch (err: any) {
          hasFailure = true
          const execTime = Date.now() - nodeStart
          await prisma.nodeResult.update({
            where: { id: nodeResult.id },
            data: {
              status: 'FAILED',
              error: err.message ?? 'Unknown error',
              completedAt: new Date(),
              executionTime: execTime,
            }
          })
        }
      }
    }

    const totalTime = Date.now() - startTime
    const anyNodeRan = Object.keys(nodeOutputs).length > 0

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: hasFailure ? (anyNodeRan ? 'PARTIAL' : 'FAILED') : 'SUCCESS',
        completedAt: new Date(),
        duration: totalTime,
      }
    })

    return { success: !hasFailure, duration: totalTime }
  }
})

function getExecutionLayers(nodes: any[], edges: any[]): any[][] {
  const inDegree: Record<string, number> = {}
  const adj: Record<string, string[]> = {}

  nodes.forEach(n => { inDegree[n.id] = 0; adj[n.id] = [] })
  edges.forEach(e => {
    adj[e.source].push(e.target)
    inDegree[e.target]++
  })

  const layers: any[][] = []
  let current = nodes.filter(n => inDegree[n.id] === 0)

  while (current.length > 0) {
    layers.push(current)
    const next: any[] = []
    current.forEach(node => {
      adj[node.id]?.forEach(targetId => {
        inDegree[targetId]--
        if (inDegree[targetId] === 0) {
          const found = nodes.find(n => n.id === targetId)
          if (found) next.push(found)
        }
      })
    })
    current = next
  }

  return layers
}

function assertConnectedInputsPresent(
  node: any,
  edges: any[],
  nodeOutputs: Record<string, string>
) {
  const incoming = edges.filter((e) => e.target === node.id)
  if (incoming.length === 0) return

  const imageEdges = incoming.filter((e) => e.targetHandle === 'images')
  if (imageEdges.length > 0) {
    const anyPresent = imageEdges.some((e) => nodeOutputs[e.source] !== undefined)
    if (!anyPresent) {
      throw new Error('Missing input: images (connect an image output or upload an image)')
    }
  }

  for (const e of incoming) {
    if (e.targetHandle === 'images') continue
    if (!e.targetHandle) continue
    if (nodeOutputs[e.source] === undefined) {
      throw new Error(`Missing input: ${e.targetHandle}`)
    }
  }
}

function resolveNodeInputs(
  node: any,
  edges: any[],
  nodeOutputs: Record<string, string>
): Record<string, string | string[]> {
  const inputs: Record<string, string | string[]> = {}
  const incomingEdges = edges.filter(e => e.target === node.id)
  const imageInputs: string[] = []

  incomingEdges.forEach(edge => {
    const sourceOutput = nodeOutputs[edge.source]
    if (sourceOutput === undefined) return

    if (edge.targetHandle === 'images') {
      imageInputs.push(sourceOutput)
    } else if (edge.targetHandle) {
      inputs[edge.targetHandle] = sourceOutput
    }
  })

  if (imageInputs.length > 0) {
    inputs['images'] = imageInputs
  }

  return inputs
}
