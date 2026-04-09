'use client'

import React, { memo } from 'react'
import { Handle, Position, useEdges } from '@xyflow/react'
import { Bot, Play, Copy, RefreshCw } from 'lucide-react'
import NodeWrapper from '../canvas/NodeWrapper'
import { useWorkflowStore } from '@/store/workflowStore'

function LLMNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
  const { runSingleNode, updateNodeData } = useWorkflowStore()
  const edges = useEdges()

  // Check connections
  const isSystemConnected = edges.some(e => e.target === id && e.targetHandle === 'system_prompt')
  const isUserConnected = edges.some(e => e.target === id && e.targetHandle === 'user_message')
  const isImagesConnected = edges.some(e => e.target === id && e.targetHandle === 'images')

  const handleRun = () => {
    runSingleNode(id)
  }

  const handleCopy = () => {
    if (data.output) {
      navigator.clipboard.writeText(data.output)
    }
  }

  // Model selector defaults to OpenRouter (configured default) or free router
  const model = data.model || 'google/gemma-4-31b-it:free'

  return (
    <NodeWrapper id={id} title="Run LLM" icon={Bot} selected={selected} executing={data.executing} error={data.error}>
      <div className="absolute top-3 right-10 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded font-medium">{model}</span>
      </div>

      <div className="space-y-3">
        <select 
          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500 appearance-none"
          value={model}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option value="openrouter/free">OpenRouter (Free Router)</option>
          <option value="google/gemma-4-31b-it:free">Gemma 4 31B IT (free)</option>
          <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B Instruct (free)</option>
          <option>Gemini 2.0 Flash</option>
          <option>Gemini 2.0 Flash Thinking</option>
          <option>Gemini 1.5 Pro</option>
          <option>Gemini 1.5 Flash</option>
          <option>Gemini 1.5 Flash-8B</option>
        </select>

        <div className="space-y-2 mt-2">
          {[{ label: 'System prompt', connected: isSystemConnected, id: 'system_prompt' },
            { label: 'User message', connected: isUserConnected, id: 'user_message' },
            { label: 'Images', connected: isImagesConnected, id: 'images' }
          ].map(input => (
            <div key={input.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{input.label}</span>
                <div className={`w-1.5 h-1.5 rounded-full border ${input.connected ? 'bg-emerald-500 border-none' : 'border-gray-600'}`} />
              </div>
              {!input.connected && input.id !== 'images' && (
                <input 
                  type="text"
                  placeholder={`Manual ${input.label.toLowerCase()}...`}
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-xs text-gray-300 outline-none focus:border-purple-500"
                  value={data[input.id] || ''}
                  onChange={(e) => updateNodeData(id, { [input.id]: e.target.value })}
                />
              )}
              {input.connected && (
                <span className="text-xs text-gray-600 italic">Connected via handle</span>
              )}
            </div>
          ))}
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

        {data.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
            {data.error}
          </div>
        )}

        {data.output && !data.executing && !data.error && (
          <div className="mt-3 pt-3 border-t border-[#252525]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Output</span>
              <button onClick={handleCopy} className="text-gray-500 hover:text-gray-300 transition-colors p-1 group relative">
                <Copy className="w-3.5 h-3.5" />
                <span className="absolute -top-6 -translate-x-1/2 left-1/2 bg-[#1e1e1e] border border-[#2a2a2a] rounded px-2 py-0.5 text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Copy</span>
              </button>
            </div>
            <div className="bg-[#111111] rounded-lg p-3 text-sm text-gray-200 max-h-[200px] overflow-y-auto font-mono custom-scrollbar">
              {data.output}
            </div>
            <div className="text-right mt-1 text-[10px] text-gray-600">
              {data.executionTime ? `${(data.executionTime / 1000).toFixed(1)}s` : '0.0s'}
            </div>
          </div>
        )}
      </div>

      {/* Input Handles */}
      <Handle type="target" position={Position.Left} id="system_prompt" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '25%' }}>
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">system</div>
      </Handle>
      <Handle type="target" position={Position.Left} id="user_message" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '50%' }}>
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">msg</div>
      </Handle>
      <Handle type="target" position={Position.Left} id="images" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400" style={{ top: '75%' }}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">img</div>
      </Handle>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="output" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400 hover:scale-125 transition-transform">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">text</div>
      </Handle>
    </NodeWrapper>
  )
}

export default memo(LLMNode)
