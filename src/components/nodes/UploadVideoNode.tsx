'use client'

import React, { memo, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Video, X } from 'lucide-react'
import NodeWrapper from '../canvas/NodeWrapper'
import { useWorkflowStore } from '@/store/workflowStore'
import { api } from '@/lib/api'

function UploadVideoNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
  const { updateNodeData } = useWorkflowStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    if (!file.type.startsWith('video/')) return
    
    updateNodeData(id, { uploading: true, progress: 0 })
    
    const interval = setInterval(() => {
      updateNodeData(id, { progress: Math.min(100, (data.progress || 0) + 15) })
    }, 100)

    try {
      const url = await api.uploadFile(file)
      clearInterval(interval)
      // Store only serializable metadata in node state (never the raw File object).
      updateNodeData(id, { uploading: false, progress: 100, uploadedUrl: url, fileName: file.name, fileType: file.type })
    } catch {
      clearInterval(interval)
      updateNodeData(id, { uploading: false, error: 'Upload failed' })
    }
  }

  const removeVideo = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNodeData(id, { uploadedUrl: null, fileName: null, fileType: null, progress: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <NodeWrapper id={id} title="Upload Video" icon={Video} selected={selected} executing={data.executing} error={data.error}>
      {!data.uploadedUrl ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border border-dashed border-[#2a2a2a] rounded-lg p-6 text-center hover:border-purple-500 hover:bg-[#1e1e1e] cursor-pointer transition-colors"
        >
          <Video className="w-6 h-6 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">Drop video here</p>
          <p className="text-xs text-gray-600">MP4, MOV, WebM, M4V</p>
          
          {data.uploading && (
            <div className="mt-3 w-full h-1.5 bg-[#111111] rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${data.progress || 0}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="relative group rounded-lg overflow-hidden border border-[#2a2a2a] bg-black">
          <video src={data.uploadedUrl} controls className="w-full max-h-[180px]" />
          <button 
            onClick={removeVideo}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="w-full bg-[#111111] border-t border-[#2a2a2a] px-2 py-1.5 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 truncate max-w-[80%]">{data.fileName || 'video'}</span>
          </div>
        </div>
      )}

      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        accept=".mp4,.mov,.webm,.m4v"
        onChange={handleFileChange}
      />

      <Handle type="source" position={Position.Right} id="output" className="w-3 h-3 bg-purple-500 border-2 border-[#1a1a1a] hover:bg-purple-400 hover:scale-125 transition-transform">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">video</div>
      </Handle>
    </NodeWrapper>
  )
}

export default memo(UploadVideoNode)
