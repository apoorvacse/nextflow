export type HandleType = 'text' | 'image' | 'video'
export type NodeType = 'textNode' | 'uploadImageNode' | 'uploadVideoNode' | 'llmNode' | 'cropImageNode' | 'extractFrameNode'
export type RunScope = 'full' | 'partial' | 'single'
export type RunStatus = 'success' | 'failed' | 'running' | 'pending'

export interface NodeExecutionState {
  executing: boolean
  error: string | null
  output: string | null
  executionTime: number | null
}

export interface RunEntry {
  id: string
  timestamp: Date
  status: RunStatus
  scope: RunScope
  duration: number
  nodeResults: NodeResult[]
}

export interface NodeResult {
  nodeId: string
  nodeLabel: string
  status: RunStatus
  executionTime: number
  input: Record<string, unknown>
  output: string | null
  error: string | null
}
