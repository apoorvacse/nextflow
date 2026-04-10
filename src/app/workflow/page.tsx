'use client'

import Header from '@/components/layout/Header'
import LeftSidebar from '@/components/layout/LeftSidebar'
import RightSidebar from '@/components/layout/RightSidebar'
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas'
import React, { useEffect, useRef, useState } from 'react'

export default function WorkflowPage() {
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(320)
  const leftCollapsed = leftWidth <= 96
  const dragRef = useRef<{
    side: 'left' | 'right'
    startX: number
    startWidth: number
  } | null>(null)

  useEffect(() => {
    try {
      const lw = window.localStorage.getItem('nextflow:leftSidebarWidth')
      const rw = window.localStorage.getItem('nextflow:rightSidebarWidth')
      if (lw) setLeftWidth(Math.max(200, Math.min(520, parseInt(lw, 10) || 260)))
      if (rw) setRightWidth(Math.max(260, Math.min(600, parseInt(rw, 10) || 320)))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      if (dragRef.current.side === 'left') {
        const raw = dragRef.current.startWidth + dx
        // krea-style: collapse into icon rail below a threshold
        if (raw < 140) {
          setLeftWidth(72)
        } else {
          const next = Math.max(200, Math.min(520, raw))
          setLeftWidth(next)
        }
      } else {
        const next = Math.max(260, Math.min(600, dragRef.current.startWidth - dx))
        setRightWidth(next)
      }
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        window.localStorage.setItem('nextflow:leftSidebarWidth', String(leftWidth))
        window.localStorage.setItem('nextflow:rightSidebarWidth', String(rightWidth))
      } catch {
        // ignore
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [leftWidth, rightWidth])

  const startDrag = (side: 'left' | 'right') => (e: React.PointerEvent) => {
    dragRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftWidth : rightWidth,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar width={leftWidth} collapsed={leftCollapsed} />
        <div
          onPointerDown={startDrag('left')}
          className="w-[6px] cursor-col-resize bg-[#0a0a0a] hover:bg-purple-500/30 active:bg-purple-500/40 transition-colors"
          title="Drag to resize"
        />
        <main className="flex-1 relative">
          <WorkflowCanvas />
        </main>
        <div
          onPointerDown={startDrag('right')}
          className="w-[6px] cursor-col-resize bg-[#0a0a0a] hover:bg-purple-500/30 active:bg-purple-500/40 transition-colors"
          title="Drag to resize"
        />
        <RightSidebar width={rightWidth} />
      </div>
    </div>
  )
}
