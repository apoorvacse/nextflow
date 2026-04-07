'use client'

import React, { memo } from 'react'
import { Handle, Position, useEdges } from '@xyflow/react'
import { Crop, Play, RefreshCw } from 'lucide-react'
import NodeWrapper from '../canvas/NodeWrapper'
import { useWorkflowStore } from '@/store/workflowStore'

function CropImageNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
  const { runSingleNode, updateNodeData } = useWorkflowStore()
  const edges = useEdges()

  const isConnected = (handleId: string) => edges.some(e => e.target === id && e.targetHandle === handleId)

  const handleInputChange = (field: string, val: string) => {
    updateNodeData(id, { [field]: val })
  }

  const handleRun = () => runSingleNode(id)

  const params = [
    { id: 'x_percent', label: 'X Offset %', default: '0', min: '0', max: '100' },
    { id: 'y_percent', label: 'Y Offset %', default: '0', min: '0', max: '100' },
    { id: 'width_percent', label: 'Width %', default: '100', min: '1', max: '100' },
    { id: 'height_percent', label: 'Height %', default: '100', min: '1', max: '100' },
  ]

  return (
    <NodeWrapper id={id} title="Crop Image" icon={Crop} selected={selected} executing={data.executing} error={data.error}>
      <div className="space-y-3">
        {params.map(param => (
          <div key={param.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 shrink-0">{param.label}</span>
            {isConnected(param.id) ? (
              <div className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-gray-600 italic">
                From node
              </div>
            ) : (
              <input 
                type="number"
                min={param.min}
                max={param.max}
                value={data[param.id] ?? param.default}
                onChange={(e) => handleInputChange(param.id, e.target.value)}
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-gray-300 outline-none focus:border-purple-500 transition-colors"
              />
            )}
            <Handle type="target" position={Position.Left} id={param.id} className="w-2.5 h-2.5 bg-purple-500 border-2 border-[#1a1a1a]" style={{ position: 'relative', left: '-8px', top: 'auto', transform: 'none' }} />
          </div>
        ))}

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
            <img src={data.output} alt="Cropped preview" className="w-full max-h-[180px] object-contain bg-[#111111] border border-[#2a2a2a] rounded-lg p-1" />
          </div>
        )}
      </div>

      {/* Main Image Input Handle */}
      <Handle type="target" position={Position.Left} id="image_url" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '16px' }}>
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">image</div>
      </Handle>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="output" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400 hover:scale-125 transition-transform">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">image</div>
      </Handle>
    </NodeWrapper>
  )
}

export default memo(CropImageNode)
