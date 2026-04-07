'use client'

import React from 'react'
import { UserButton } from '@clerk/nextjs'
import { Download, Upload, Save, Play, RefreshCw } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'

export default function Header() {
  const { workflowName, setWorkflowName, saveWorkflow, exportJSON, importJSON, runAllNodes, isSaving } = useWorkflowStore()

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (re: any) => importJSON(re.target.result)
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <header className="h-12 bg-[#111111] border-b border-[#1e1e1e] flex items-center justify-between px-4 shrink-0 transition-colors">
      <div className="flex items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent select-none cursor-default">
          NextFlow
        </h1>
      </div>

      <div className="flex-1 flex justify-center">
        <input 
          type="text" 
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent border-none outline-none text-center text-sm font-medium text-gray-200 w-64 hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] rounded px-2 py-1 transition-colors"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveWorkflow} disabled={isSaving} className="text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded hover:bg-[#1a1a1a] flex items-center justify-center gap-1.5 text-xs">
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
        <button onClick={exportJSON} className="text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded hover:bg-[#1a1a1a] flex items-center justify-center gap-1.5 text-xs">
          <Download className="w-4 h-4" /> Export
        </button>
        <button onClick={handleImport} className="text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded hover:bg-[#1a1a1a] flex items-center justify-center gap-1.5 text-xs">
          <Upload className="w-4 h-4" /> Import
        </button>
        <button onClick={runAllNodes} className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white transition-all px-3 py-1.5 rounded flex items-center justify-center gap-1.5 text-xs font-medium mr-2">
          <Play className="w-3.5 h-3.5" /> Run All
        </button>
        <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
      </div>
    </header>
  )
}
