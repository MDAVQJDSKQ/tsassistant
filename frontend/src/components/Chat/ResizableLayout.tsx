'use client'

import { useCallback, useEffect, useRef } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useUIState } from '@/hooks'
import { useAtom } from 'jotai'
import { activeConversationAtom } from '@/atoms'

interface ResizableLayoutProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode] // ChatDisplay, ChatInput, ConfigPanel
}

export function ResizableLayout({ children }: ResizableLayoutProps) {
  const {
    chatPanelWidth,
    isResizing,
    startResizing,
    stopResizing,
    updateChatPanelWidth
  } = useUIState()
  
  const [activeConversation] = useAtom(activeConversationAtom)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startResizing()
    document.body.style.cursor = 'col-resize'
  }, [startResizing])

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContentRef.current) return
    
    const containerRect = mainContentRef.current.getBoundingClientRect()
    const relativeX = e.clientX - containerRect.left
    const newWidthPercent = (relativeX / containerRect.width) * 100
    
    if (newWidthPercent >= 30 && newWidthPercent <= 90) {
      updateChatPanelWidth(newWidthPercent)
    }
  }, [isResizing, updateChatPanelWidth])

  const handleResizeEnd = useCallback(() => {
    stopResizing()
    document.body.style.cursor = ''
  }, [stopResizing])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  return (
    <div ref={mainContentRef} className="flex flex-1 h-full overflow-hidden max-w-full">
      <div 
        className="flex flex-col h-full relative"
        style={{ width: `${chatPanelWidth}%` }}
      >
        <header className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center">
            <SidebarTrigger className="mr-2 md:hidden" />
            <h1 className="text-xl font-bold">
              {activeConversation?.title || "Chat"}
            </h1>
          </div>
        </header>

        {children[0]} {/* ChatDisplay */}
        {children[1]} {/* ChatInput */}
        
        <div 
          className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 z-50 flex items-center justify-center"
          onMouseDown={handleResizeStart}
        >
          <div className="h-12 w-[3px] bg-border rounded-full"></div>
        </div>
      </div>

      <div 
        className="flex flex-col h-full border-l"
        style={{ width: `${100 - chatPanelWidth}%` }}
      >
        {children[2]} {/* ConfigPanel */}
      </div>
    </div>
  )
} 