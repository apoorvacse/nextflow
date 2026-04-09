'use client'

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  Edge,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkflowStore } from '@/store/workflowStore'
import { isValidConnection } from '@/lib/typeValidation'
import { api } from '@/lib/api'
import AnimatedEdge from './AnimatedEdge'

// import nodes later when created
import TextNode from '../nodes/TextNode'
import UploadImageNode from '../nodes/UploadImageNode'
import UploadVideoNode from '../nodes/UploadVideoNode'
import LLMNode from '../nodes/LLMNode'
import CropImageNode from '../nodes/CropImageNode'
import ExtractFrameNode from '../nodes/ExtractFrameNode'

const nodeTypes = {
  textNode: TextNode,
  uploadImageNode: UploadImageNode,
  uploadVideoNode: UploadVideoNode,
  llmNode: LLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
}

const edgeTypes = {
  animated: AnimatedEdge,
}

let idCounter = 100
const getId = () => `dndnode_${idCounter++}`

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const memoNodeTypes = useMemo(() => nodeTypes, [])
  const memoEdgeTypes = useMemo(() => edgeTypes, [])
  
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setNodes,
    setEdges,
    setSelectedNodes,
    pushHistoryState,
    deleteNode,
    saveWorkflow,
    runAllNodes,
    loadHistory
  } = useWorkflowStore()

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      
      addNode(type, position)
    },
    [screenToFlowPosition, addNode],
  )

  const startPolling = useCallback((runId: string) => {
    // Single-flight polling: stop any previous poller first.
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    const pollInterval = setInterval(async () => {
      try {
        const run = await api.getRunStatus(runId)
        
        run.nodeResults.forEach((nr: any) => {
          if (nr.status === 'RUNNING') {
            useWorkflowStore.getState().setNodeExecuting(nr.nodeId, true)
          } else if (nr.status === 'SUCCESS') {
            useWorkflowStore.getState().setNodeExecuting(nr.nodeId, false)
            useWorkflowStore.getState().setNodeOutput(nr.nodeId, nr.output ?? '')
          } else if (nr.status === 'FAILED') {
            useWorkflowStore.getState().setNodeExecuting(nr.nodeId, false)
            useWorkflowStore.getState().setNodeError(nr.nodeId, nr.error ?? 'Failed')
          }
        })
        
        if (run.status !== 'RUNNING') {
          clearInterval(pollInterval)
          pollIntervalRef.current = null
          // Ensure UI stops showing executing state after the run ends
          const state = useWorkflowStore.getState()
          state.nodes.forEach((n) => state.setNodeExecuting(n.id, false))
          loadHistory()
        }
      } catch (err) {
        console.error("Polling error", err)
      }
    }, 1500)
    pollIntervalRef.current = pollInterval
  }, [loadHistory])

  const handleRunAll = useCallback(async () => {
    try {
      const runId = await runAllNodes()
      startPolling(runId)
    } catch (err) {
      console.error(err)
    }
  }, [runAllNodes, startPolling])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedIds = nodes.filter(n => n.selected).map(n => n.id)
        selectedIds.forEach(id => deleteNode(id))
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        useWorkflowStore.getState().undo()
      } else if ((e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) || (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault()
        useWorkflowStore.getState().redo()
      } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        saveWorkflow()
      } else if (e.code === 'KeyA' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setNodes(nodes.map(n => ({ ...n, selected: true })))
      } else if (e.code === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleRunAll()
      } else if (e.key === 'Escape') {
        setNodes(nodes.map((n: any) => ({ ...n, selected: false })))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, setNodes, deleteNode, saveWorkflow, handleRunAll])


  // Initial history load
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Custom validation before returning connection
      const sourceNode = nodes.find(n => n.id === connection.source)
      let sourceType = 'text' // default
      if (sourceNode?.type?.toLowerCase().includes('image')) sourceType = 'image'
      if (sourceNode?.type?.toLowerCase().includes('video')) sourceType = 'video'
      
      if (!isValidConnection(sourceType, connection.targetHandle || '')) {
        // Here we could trigger a toast that the connection is invalid
        console.error('Invalid connection type')
        return
      }
      
      onConnect(connection)
    },
    [nodes, onConnect],
  )

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={memoNodeTypes}
        edgeTypes={memoEdgeTypes as any}
        defaultEdgeOptions={{ type: 'animated', style: { stroke: '#8b5cf6', strokeWidth: 2 } }}
        snapToGrid={false}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} color="#1e1e1e" gap={24} size={1} />
        <MiniMap
          nodeStrokeColor="#2a2a2a"
          nodeColor="#1a1a1a"
          maskColor="rgba(0,0,0,0.5)"
          style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', borderRadius: '8px' }}
        />
        <Controls 
          className="bg-[#111111] border border-[#2a2a2a] rounded-lg shadow-lg fill-gray-200"
          style={{ backgroundColor: '#111111' }}
        />
      </ReactFlow>
    </div>
  )
}

export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  )
}
