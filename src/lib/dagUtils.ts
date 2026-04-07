import { Edge, Node } from '@xyflow/react'

export const hasCycle = (nodes: Node[], edges: Edge[], newEdge?: Edge): boolean => {
  const adjList = new Map<string, string[]>()
  
  // Initialize adjacency list
  nodes.forEach(node => adjList.set(node.id, []))
  edges.forEach(edge => {
    if (adjList.has(edge.source)) {
      adjList.get(edge.source)!.push(edge.target)
    }
  })

  // Add the proposed new edge to check if it creates a cycle
  if (newEdge && adjList.has(newEdge.source)) {
    adjList.get(newEdge.source)!.push(newEdge.target)
  }

  const visited = new Set<string>()
  const recStack = new Set<string>()

  const isCyclicUtil = (nodeId: string): boolean => {
    if (!visited.has(nodeId)) {
      visited.add(nodeId)
      recStack.add(nodeId)

      const neighbors = adjList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && isCyclicUtil(neighbor)) {
          return true
        } else if (recStack.has(neighbor)) {
          return true
        }
      }
    }
    recStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (isCyclicUtil(node.id)) {
      return true
    }
  }

  return false
}

export const getExecutionLayers = (nodes: Node[], edges: Edge[]): string[][] => {
  const adjList = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  nodes.forEach(node => {
    adjList.set(node.id, [])
    inDegree.set(node.id, 0)
  })

  edges.forEach(edge => {
    if (adjList.has(edge.source)) {
      adjList.get(edge.source)!.push(edge.target)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }
  })

  const queue: string[] = []
  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id)
    }
  })

  const layers: string[][] = []

  while (queue.length > 0) {
    const levelSize = queue.length
    const currentLayer: string[] = []

    for (let i = 0; i < levelSize; i++) {
      const u = queue.shift()!
      currentLayer.push(u)

      const neighbors = adjList.get(u) || []
      for (const v of neighbors) {
        inDegree.set(v, (inDegree.get(v) || 0) - 1)
        if (inDegree.get(v) === 0) {
          queue.push(v)
        }
      }
    }
    layers.push(currentLayer)
  }

  return layers
}
