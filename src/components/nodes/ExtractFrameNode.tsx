'use client'

import React, { memo } from 'react'
import { Handle, Position, useEdges } from '@xyflow/react'
import { Film, Play, RefreshCw } from 'lucide-react'
import NodeWrapper from '../canvas/NodeWrapper'
import { useWorkflowStore } from '@/store/workflowStore'

function ExtractFrameNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
  const { runSingleNode, updateNodeData } = useWorkflowStore()
  const edges = useEdges()

  const isConnected = edges.some(e => e.target === id && e.targetHandle === 'timestamp')

  const handleRun = () => runSingleNode(id)

  return (
    <NodeWrapper id={id} title="Extract Frame" icon={Film} selected={selected} executing={data.executing} error={data.error}>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Timestamp</span>
          </div>
          {isConnected ? (
            <div className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-gray-600 italic">
              From node
            </div>
          ) : (
            <input 
              type="text"
              placeholder="0 (seconds) or 50%"
              className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-gray-300 outline-none focus:border-purple-500 transition-colors"
              value={data.timestamp || ''}
              onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
            />
          )}
          {!isConnected && (
             <span className="text-[10px] text-gray-600">e.g. 5 or 50%</span>
          )}
        </div>

        <button 
          onClick={handleRun}
          disabled={data.executing}
          className="w-full mt-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          {data.executing ? (
             <><RefreshCw className="w-4 h-4 animate-spin" /> Running...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Node</>
          )}
        </button>

        {data.output && !data.executing && !data.error && (
          <div className="mt-3">
            <span className="text-xs text-gray-500 mb-1 block">Output Preview</span>
            <img src={data.output} alt="Extracted frame preview" className="w-full max-h-[180px] object-contain bg-[#111111] border border-[#2a2a2a] rounded-lg p-1" />
          </div>
        )}
      </div>

      {/* Input Handles */}
      <Handle type="target" position={Position.Left} id="video_url" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '25%' }}>
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">video</div>
      </Handle>
      <Handle type="target" position={Position.Left} id="timestamp" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '50%' }}>
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">time</div>
      </Handle>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="output" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400 hover:scale-125 transition-transform">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">frame</div>
      </Handle>
    </NodeWrapper>
  )
}

export default memo(ExtractFrameNode)
