'use client'

import React, { useState } from 'react'
import { Search, Type, ImagePlus, Video, Bot, Crop, Film, LayoutTemplate } from 'lucide-react'
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

export default function LeftSidebar({ width, collapsed }: { width?: number; collapsed?: boolean }) {
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
    <aside
      className={`bg-[#111111] border-r border-[#1e1e1e] flex flex-col h-full shrink-0 z-10 transition-[width] duration-200 ease-out ${
        collapsed ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'
      }`}
      style={{ width: width ?? 260 }}
    >
      <div
        className={`px-4 transition-all duration-200 ease-out ${
          collapsed ? 'max-h-0 opacity-0 pt-0 pb-0 pointer-events-none' : 'max-h-24 opacity-100 pt-4 pb-0'
        }`}
      >
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
        <div
          className={`text-xs uppercase tracking-widest text-gray-500 mb-2 px-4 font-medium transition-all duration-200 ease-out ${
            collapsed ? 'opacity-0 -translate-y-1 pointer-events-none select-none' : 'opacity-100 translate-y-0'
          }`}
        >
          Quick Access
        </div>
        <div className="flex flex-col">
          {filteredNodes.map(node => (
            <div 
              key={node.type}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              title={node.label}
              className={`w-full py-3 flex items-center hover:bg-[#1e1e1e] active:bg-[#252525] cursor-grab active:cursor-grabbing transition-colors group ${
                collapsed ? 'px-3 justify-center' : 'px-4 gap-3'
              }`}
            >
              <node.icon className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <span
                className={`text-sm font-medium text-gray-200 truncate transition-all duration-200 ease-out ${
                  collapsed
                    ? 'flex-none opacity-0 w-0 -translate-x-1 pointer-events-none select-none'
                    : 'flex-1 opacity-100 w-auto translate-x-0'
                }`}
              >
                {node.label}
              </span>
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
        <div
          className={`text-xs uppercase tracking-widest text-gray-500 mb-2 px-4 font-medium transition-all duration-200 ease-out ${
            collapsed ? 'opacity-0 -translate-y-1 pointer-events-none select-none' : 'opacity-100 translate-y-0'
          }`}
        >
          Templates
        </div>
        <button 
          onClick={handleLoadSample}
          title="Sample Workflow"
          className={`w-full py-3 flex items-center hover:bg-[#1e1e1e] active:bg-[#252525] transition-colors ${
            collapsed ? 'px-3 justify-center' : 'px-4 justify-start gap-3'
          }`}
        >
          <LayoutTemplate className="w-4 h-4 text-purple-500" />
          <span
            className={`text-sm font-medium text-gray-200 transition-all duration-200 ease-out ${
              collapsed
                ? 'inline-flex opacity-0 w-0 -translate-x-1 pointer-events-none select-none'
                : 'inline-flex opacity-100 w-auto translate-x-0'
            }`}
          >
            Sample Workflow
          </span>
        </button>
      </div>
    </aside>
  )
}
