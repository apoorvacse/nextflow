'use client'

import React from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface NodeWrapperProps {
  id: string
  title: string
  icon: React.ElementType
  selected?: boolean
  executing?: boolean
  error?: string | null
  children: React.ReactNode
}

export default function NodeWrapper({ id, title, icon: Icon, selected, executing, error, children }: NodeWrapperProps) {
  const { deleteNode } = useWorkflowStore()
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <div className={cn(
      "relative bg-[#1a1a1a] border rounded-xl min-w-[280px] max-w-[360px] transition-all duration-150",
      selected ? "border-purple-500" : "border-[#2a2a2a]",
      executing ? "shadow-[0_0_0_2px_#8b5cf6,0_0_20px_4px_rgba(139,92,246,0.4)] animate-pulse-glow" : "",
      error ? "border-red-500 shadow-[0_0_0_2px_#ef4444,0_0_20px_4px_rgba(239,68,68,0.4)]" : ""
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525] group">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-200">{title}</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className={cn(
            "w-2 h-2 rounded-full",
            executing ? "bg-yellow-400 animate-pulse" : error ? "bg-red-500" : "bg-emerald-500"
          )} />
          <button 
            className="text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#111111] border border-[#2a2a2a] rounded-lg shadow-xl z-50 w-32 py-1">
              <button 
                className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[#1a1a1a] flex items-center gap-2"
                onClick={() => { setMenuOpen(false); deleteNode(id) }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  )
}
