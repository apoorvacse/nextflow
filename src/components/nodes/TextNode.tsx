'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Type } from 'lucide-react'
import NodeWrapper from '../canvas/NodeWrapper'
import { useWorkflowStore } from '@/store/workflowStore'

function TextNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
  const { updateNodeData } = useWorkflowStore()
  const text = data.text || ''

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { text: e.target.value })
  }

  return (
    <NodeWrapper id={id} title="Text" icon={Type} selected={selected} executing={data.executing} error={data.error}>
      <textarea
        className="w-full min-h-[100px] max-h-[300px] bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 font-mono text-xs focus:border-purple-500 outline-none resize-y"
        placeholder="Enter text..."
        value={text}
        onChange={handleChange}
        autoFocus
      />
      <div className="text-right mt-1 text-xs text-gray-600">
        {text.length} chars
      </div>
      
      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400 hover:scale-125 transition-transform"
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">text</div>
      </Handle>
    </NodeWrapper>
  )
}

export default memo(TextNode)
