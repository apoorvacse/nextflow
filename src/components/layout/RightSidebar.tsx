'use client'

import React, { useState } from 'react'
import { History, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { RunEntry } from '@/types/workflow'

export default function RightSidebar({ width }: { width?: number }) {
  const { runHistory } = useWorkflowStore()
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleRun = (runId: string) => {
    const next = new Set(expandedRuns)
    if (next.has(runId)) next.delete(runId)
    else next.add(runId)
    setExpandedRuns(next)
  }

  const toggleNode = (nodeRunId: string) => {
    const next = new Set(expandedNodes)
    if (next.has(nodeRunId)) next.delete(nodeRunId)
    else next.add(nodeRunId)
    setExpandedNodes(next)
  }

  return (
    <aside
      className="bg-[#111111] border-l border-[#1e1e1e] flex flex-col h-full overflow-hidden shrink-0 z-10 transition-colors"
      style={{ width: width ?? 320 }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e1e1e]">
        <h2 className="text-sm font-semibold text-gray-200">Run History</h2>
        <button className="text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {runHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
            <History className="w-8 h-8 text-gray-700 mb-3" />
            <h3 className="text-sm font-medium text-gray-500">No runs yet</h3>
            <p className="text-xs text-gray-600 mt-1">Run your workflow to see history</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {runHistory.map((run) => (
              <RunEntryItem 
                key={run.id} 
                run={run} 
                isExpanded={expandedRuns.has(run.id)}
                onToggle={() => toggleRun(run.id)}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function RunEntryItem({ run, isExpanded, onToggle, expandedNodes, toggleNode }: { run: RunEntry, isExpanded: boolean, onToggle: () => void, expandedNodes: Set<string>, toggleNode: (id: string) => void }) {
  const normalizeStatus = (status: any): 'success' | 'failed' | 'running' | 'pending' => {
    const s = String(status ?? '').toUpperCase()
    if (s === 'SUCCESS' || s === 'success') return 'success'
    if (s === 'FAILED' || s === 'failed') return 'failed'
    if (s === 'RUNNING' || s === 'PARTIAL' || s === 'running' || s === 'partial') return 'running'
    return 'pending'
  }

  const anyRun = run as any
  const displayStatus = normalizeStatus(anyRun.status)
  const statusColor =
    displayStatus === 'success'
      ? 'bg-emerald-900/40 text-emerald-400'
      : displayStatus === 'failed'
        ? 'bg-red-900/40 text-red-400'
        : displayStatus === 'running'
          ? 'bg-yellow-900/40 text-yellow-400'
          : 'bg-yellow-900/40 text-yellow-400'

  const ts = anyRun.timestamp ?? anyRun.completedAt ?? anyRun.startedAt
  const durationMs = typeof anyRun.duration === 'number' ? anyRun.duration : 0

  return (
    <div className="border-b border-[#1a1a1a]">
      <div 
        onClick={onToggle}
        className="px-4 py-3 hover:bg-[#161616] cursor-pointer transition-colors flex flex-col gap-2"
      >
        <div className="flex items-center justify-between">
          <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${statusColor} flex items-center gap-1.5`}>
            {displayStatus === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
            {displayStatus}
          </div>
          <div className="text-xs text-gray-500">
            {ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-[10px] bg-[#1e1e1e] text-gray-400 rounded px-2 py-0.5 whitespace-nowrap">
            Scope: {String(anyRun.scope ?? '').toLowerCase() === 'full' ? 'Full Workflow' : String(anyRun.scope ?? '').toLowerCase() === 'partial' ? 'Selected Nodes' : 'Single Node'}
          </div>
          <div className="text-[10px] text-gray-600">
            {(durationMs / 1000).toFixed(1)}s total
          </div>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden bg-[#131313]">
          {run.nodeResults.map((node) => (
            <div key={node.nodeId} className="border-l border-[#2a2a2a] ml-6 pl-4 py-2 border-b border-[#1a1a1a] last:border-b-0">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => toggleNode(`${run.id}-${node.nodeId}`)}
              >
                <div className="flex items-center gap-2">
                  {normalizeStatus((node as any).status) === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : normalizeStatus((node as any).status) === 'failed' ? (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                  )}
                  <span className="text-xs text-gray-300 font-medium group-hover:text-purple-400 transition-colors">{node.nodeLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{(((node as any).executionTime ?? 0) / 1000).toFixed(1)}s</span>
                  {expandedNodes.has(`${run.id}-${node.nodeId}`) ? <ChevronDown className="w-3 h-3 text-gray-600 group-hover:text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />}
                </div>
              </div>

              {expandedNodes.has(`${run.id}-${node.nodeId}`) && (
                <div className="mt-2 p-2 bg-[#1a1a1a] rounded text-xs">
                  {node.error ? (
                    <div className="text-red-400">{node.error}</div>
                  ) : node.output ? (
                    node.output.startsWith('data:image') || node.output.startsWith('blob:') ? (
                      <div className="flex items-center gap-2">
                        <img src={node.output} alt="output preview" className="w-8 h-8 object-cover rounded" />
                        <span className="text-gray-500 text-[10px]">Image Output</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 font-mono line-clamp-3">
                        {node.output.substring(0, 100)}{node.output.length > 100 ? '...' : ''}
                      </div>
                    )
                  ) : (
                    <div className="text-gray-600 italic">No output</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
