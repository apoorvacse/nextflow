import { create } from 'zustand'
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react'
import { RunEntry } from '@/types/workflow'
import { api } from '@/lib/api'

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  selectedNodes: string[]
  workflowId: string | null
  workflowName: string
  isSaving: boolean
  runHistory: RunEntry[]
  
  // History stack for undo/redo
  past: { nodes: Node[], edges: Edge[] }[]
  future: { nodes: Node[], edges: Edge[] }[]
}

interface WorkflowActions {
  // Node operations
  addNode: (type: string, position: { x: number; y: number }) => void
  updateNodeData: (id: string, data: any) => void
  deleteNode: (id: string) => void
  
  // React Flow handlers
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  
  // Canvas operations
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setSelectedNodes: (selectedIds: string[]) => void
  
  // Execution
  setNodeExecuting: (id: string, executing: boolean) => void
  setNodeOutput: (id: string, output: string) => void
  setNodeError: (id: string, error: string) => void
  setWorkflowName: (name: string) => void
  
  // Workflow
  saveWorkflow: () => Promise<void>
  loadWorkflow: (id: string) => Promise<void>
  exportJSON: () => void
  importJSON: (json: string) => void
  
  // History
  addRunEntry: (entry: RunEntry) => void
  
  // Undo/redo
  undo: () => void
  redo: () => void
  pushHistoryState: () => void
  
  // Run functions
  runSingleNode: (nodeId: string) => Promise<string | null>
  runSelectedNodes: (nodeIds: string[]) => Promise<string>
  runAllNodes: () => Promise<string>
  loadHistory: () => Promise<void>
}

export type WorkflowStore = WorkflowState & WorkflowActions

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isSaving: false,
  runHistory: [],
  past: [],
  future: [],

  pushHistoryState: () => {
    const { nodes, edges, past } = get()
    // limit to 50
    const newPast = [...past, { nodes, edges }].slice(-50)
    set({ past: newPast, future: [] })
  },

  undo: () => {
    const { past, future, nodes, edges } = get()
    if (past.length === 0) return
    
    const previous = past[past.length - 1]
    const newPast = past.slice(0, past.length - 1)
    
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: newPast,
      future: [{ nodes, edges }, ...future]
    })
  },

  redo: () => {
    const { past, future, nodes, edges } = get()
    if (future.length === 0) return
    
    const next = future[0]
    const newFuture = future.slice(1)
    
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }],
      future: newFuture
    })
  },

  addNode: (type, position) => {
    get().pushHistoryState()
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: type } // Will add default data component-wise
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
  },

  updateNodeData: (id, data) => {
    get().pushHistoryState()
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    }))
  },

  deleteNode: (id) => {
    get().pushHistoryState()
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id)
    }))
  },

  onNodesChange: (changes) => {
    // Determine if it's a drag operation. If yes, we might not want to save history on every move.
    // Instead handled per user interactions where 'add/remove' are involved.
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },

  onConnect: (connection) => {
    get().pushHistoryState()
    set({
      edges: addEdge({ ...connection, type: 'smoothstep', animated: true }, get().edges),
    })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNodes: (selectedIds) => set({ selectedNodes: selectedIds }),
  setWorkflowName: (name) => set({ workflowName: name }),

  setNodeExecuting: (id, executing) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, executing } } : n))
    }))
  },

  setNodeOutput: (id, output) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, output, executing: false, error: null } } : n))
    }))
  },

  setNodeError: (id, error) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, error, executing: false } } : n))
    }))
  },

  saveWorkflow: async () => {
    set({ isSaving: true })
    try {
      const saved = await api.saveWorkflow({
        id: get().workflowId ?? undefined,
        name: get().workflowName,
        nodes: get().nodes,
        edges: get().edges,
      })
      if (saved?.id) set({ workflowId: saved.id })
    } finally {
      set({ isSaving: false })
    }
  },

  loadWorkflow: async (id) => {
    const wf = await api.loadWorkflow(id)
    set({
      workflowId: wf.id ?? id,
      workflowName: wf.name ?? 'Untitled Workflow',
      nodes: wf.nodes ?? [],
      edges: wf.edges ?? [],
      past: [],
      future: [],
    })
  },

  exportJSON: () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      name: get().workflowName,
      nodes: get().nodes,
      edges: get().edges
    }))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `workflow-${get().workflowName.replace(/\s+/g, '-')}-${Date.now()}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  },

  importJSON: (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.nodes && data.edges) {
        get().pushHistoryState()
        set({ nodes: data.nodes, edges: data.edges, workflowName: data.name || 'Imported Workflow' })
      }
    } catch (e) {
      console.error("Invalid JSON")
    }
  },

  addRunEntry: (entry) => set((state) => ({ runHistory: [entry, ...state.runHistory] })),

  loadHistory: async () => {
    try {
      const history = await api.getHistory()
      set({ runHistory: history })
    } catch (e) {
      console.error(e)
    }
  },

  runSelectedNodes: async (nodeIds) => {
    const { nodes, edges } = get()
    
    // Optimistic set executing and save
    const byId = new Map(nodes.map((n) => [n.id, n] as const))
    const isExecutable = (n: Node | undefined) =>
      !!n && !(n.type === 'uploadImageNode' || n.type === 'uploadVideoNode' || n.type === 'textNode')

    nodeIds.forEach((id) => {
      if (isExecutable(byId.get(id))) get().setNodeExecuting(id, true)
    })
    try {
      if (!get().workflowId) {
        await get().saveWorkflow()
      }
      const workflowId = get().workflowId
      if (!workflowId) throw new Error('Workflow must be saved before execution.')

      // Call execution
      const res = await api.runNodes({
        workflowId,
        nodes,
        edges,
        nodeIds,
        scope: 'partial'
      })

      return res.runId
    } catch (err) {
      // Roll back optimistic state if the request failed.
      nodeIds.forEach(id => get().setNodeExecuting(id, false))
      throw err
    }
  },

  runSingleNode: async (nodeId) => {
    const { nodes, edges } = get()

    // Collect all upstream dependencies for the clicked node.
    const upstream = new Set<string>()
    const visited = new Set<string>()
    const collectUpstream = (currentId: string) => {
      if (visited.has(currentId)) return
      visited.add(currentId)
      const incoming = edges.filter((e) => e.target === currentId)
      for (const edge of incoming) {
        upstream.add(edge.source)
        collectUpstream(edge.source)
      }
    }
    collectUpstream(nodeId)

    const upstreamNodes = [...upstream]
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean) as Node[]

    // Preflight: Upload nodes can't be "auto-run" — they require user action.
    // If the pipeline depends on them and they have no uploaded URL, fail fast with a clear error.
    for (const n of upstreamNodes) {
      if (n.type === 'uploadImageNode' || n.type === 'uploadVideoNode') {
        const url = (n.data as any)?.uploadedUrl
        if (!url || typeof url !== 'string') {
          get().setNodeError(n.id, 'Please upload a file in this node first.')
          return null
        }
      }
      if (n.type === 'textNode') {
        const txt = (n.data as any)?.text
        if (typeof txt !== 'string' || txt.trim().length === 0) {
          // Only flag if it’s actually wired into the chain (it is, since it's upstream).
          get().setNodeError(n.id, 'Please enter text in this node first.')
          return null
        }
      }
    }

    // Always re-run upstream processing nodes to avoid stale outputs when inputs change.
    // Upload/Text nodes are treated as provided inputs (they don't execute server-side).
    const shouldRunAsDependency = (n: Node) =>
      !(n.type === 'uploadImageNode' || n.type === 'uploadVideoNode' || n.type === 'textNode')

    const nodeIdsToRun = [...upstreamNodes.filter(shouldRunAsDependency).map((n) => n.id), nodeId]

    let runId: string
    try {
      runId = await get().runSelectedNodes(nodeIdsToRun)
    } catch (err: any) {
      // Never let execution errors bubble to the browser as unhandled rejections.
      nodeIdsToRun.forEach((id) => get().setNodeExecuting(id, false))
      const message =
        (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string')
          ? err.message
          : 'Execution failed'
      get().setNodeError(nodeId, message)
      return null
    }

    while (true) {
      const run = await api.getRunStatus(runId)
      run.nodeResults.forEach((nr: any) => {
        if (nr.status === 'RUNNING') {
          get().setNodeExecuting(nr.nodeId, true)
        } else if (nr.status === 'SUCCESS') {
          get().setNodeExecuting(nr.nodeId, false)
          get().setNodeOutput(nr.nodeId, nr.output ?? '')
        } else if (nr.status === 'FAILED') {
          get().setNodeExecuting(nr.nodeId, false)
          get().setNodeError(nr.nodeId, nr.error ?? 'Failed')
        }
      })

      if (run.status !== 'RUNNING') {
        // Final safety pass: stop executing for all nodes.
        // Some nodes (e.g. Upload nodes) are not executed server-side and won't appear in nodeResults,
        // but they may have been marked executing by previous runs.
        get().nodes.forEach((n) => get().setNodeExecuting(n.id, false))
        await get().loadHistory()
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    return runId
  },

  runAllNodes: async () => {
    const { nodes, edges } = get()
    
    // Upload/Text nodes don't execute server-side; don't mark them as running.
    nodes.forEach((n) => {
      if (n.type !== 'uploadImageNode' && n.type !== 'uploadVideoNode' && n.type !== 'textNode') {
        get().setNodeExecuting(n.id, true)
      }
    })
    if (!get().workflowId) {
      await get().saveWorkflow()
    }
    const workflowId = get().workflowId
    if (!workflowId) throw new Error('Workflow must be saved before execution.')
    
    const res = await api.runNodes({
      workflowId,
      nodes,
      edges,
      scope: 'full'
    })
    
    return res.runId
  }
}))
