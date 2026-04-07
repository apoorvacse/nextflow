'use client'

import React, { useState } from 'react'
import { Search, Type, ImagePlus, Video, Bot, Crop, Film } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { sampleNodes, sampleEdges } from '@/data/sampleWorkflow'

const NODES = [
  { type: 'textNode', label: 'Text Node', icon: Type, bg: 'bg-blue-900/40 text-blue-300' },
  { type: 'uploadImageNode', label: 'Upload Image Node', icon: ImagePlus, bg: 'bg-emerald-900/40 text-emerald-300' },
  { type: 'uploadVideoNode', label: 'Upload Video Node', icon: Video, bg: 'bg-emerald-900/40 text-emerald-300' },
  { type: 'llmNode', label: 'Run Any LLM Node', icon: Bot, bg: 'bg-purple-900/40 text-purple-300' },
  { type: 'cropImageNode', label: 'Crop Image Node', icon: Crop, bg: 'bg-yellow-900/40 text-yellow-300' },
  { type: 'extractFrameNode', label: 'Extract Frame from Video Node', icon: Film, bg: 'bg-pink-900/40 text-pink-300' },
]

export default function LeftSidebar() {
  const [search, setSearch] = useState('')
  const { setNodes, setEdges, pushHistoryState } = useWorkflowStore()

  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleLoadSample = () => {
    pushHistoryState()
    setNodes(sampleNodes)
    setEdges(sampleEdges)
  }

  const filteredNodes = NODES.filter(n => n.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <aside className="w-[260px] bg-[#111111] border-r border-[#1e1e1e] flex flex-col h-full overflow-y-auto shrink-0 z-10 custom-scrollbar">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search nodes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      <div className="mt-2">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 px-4 font-medium">Quick Access</div>
        <div className="flex flex-col">
          {filteredNodes.map(node => (
            <div 
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1e1e1e] active:bg-[#252525] cursor-grab active:cursor-grabbing transition-colors group"
            >
              <node.icon className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-200 flex-1 truncate">{node.label}</span>
              {/* <div className={`text-[10px] px-1.5 py-0.5 rounded ${node.bg}`}>
                {node.type.replace('Node', '').toUpperCase()}
              </div> */}
            </div>
          ))}
          {filteredNodes.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No nodes found.</div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6 pb-4">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 px-4 font-medium">Templates</div>
        <button 
          onClick={handleLoadSample}
          className="w-full px-4 py-3 flex items-center justify-start gap-3 hover:bg-[#1e1e1e] active:bg-[#252525] transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-medium text-gray-200">Sample Workflow</span>
        </button>
      </div>
    </aside>
  )
}
