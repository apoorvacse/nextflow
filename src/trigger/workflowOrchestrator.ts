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

export const workflowOrchestrator = task({
  id: 'workflow-orchestrator',
  run: async (payload: OrchestratorPayload) => {
    const { runId, nodes, edges, nodeIds, userId } = payload

    const targetNodes = nodeIds
      ? nodes.filter(n => nodeIds.includes(n.id))
      : nodes

    const relevantEdges = edges.filter(e =>
      targetNodes.find(n => n.id === e.source) &&
      targetNodes.find(n => n.id === e.target)
    )

    const layers = getExecutionLayers(targetNodes, relevantEdges)

    const nodeOutputs: Record<string, string> = {}
    const startTime = Date.now()
    let hasFailure = false

    for (const layer of layers) {
      const layerResults = await Promise.allSettled(
        layer.map(async (node) => {
          const nodeStart = Date.now()

          const nodeResult = await prisma.nodeResult.create({
            data: {
              runId,
              nodeId: node.id,
              nodeType: node.type,
              nodeLabel: node.data?.label ?? node.type,
              status: 'RUNNING',
            }
          })

          try {
            const inputs = resolveNodeInputs(node, relevantEdges, nodeOutputs)
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
            return { nodeId: node.id, success: true, output }

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
            return { nodeId: node.id, success: false, error: err.message }
          }
        })
      )
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
