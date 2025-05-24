'use client'

import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { 
  sidebarOpenAtom, 
  settingsOpenAtom, 
  isResizingAtom,
  chatPanelWidthAtom,
  loadingStatesAtom,
  errorStatesAtom 
} from '@/atoms'

export function useUIState() {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const [settingsOpen, setSettingsOpen] = useAtom(settingsOpenAtom)
  const [isResizing, setIsResizing] = useAtom(isResizingAtom)
  const [chatPanelWidth, setChatPanelWidth] = useAtom(chatPanelWidthAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [errorStates] = useAtom(errorStatesAtom)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [setSidebarOpen])

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev)
  }, [setSettingsOpen])

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [setSettingsOpen])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
  }, [setSettingsOpen])

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [setIsResizing])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [setIsResizing])

  const updateChatPanelWidth = useCallback((width: number) => {
    const clampedWidth = Math.min(90, Math.max(30, width))
    setChatPanelWidth(clampedWidth)
  }, [setChatPanelWidth])

  const resetLayout = useCallback(() => {
    setChatPanelWidth(70)
    setSidebarOpen(true)
    setSettingsOpen(false)
  }, [setChatPanelWidth, setSidebarOpen, setSettingsOpen])

  // Computed states
  const isAnyLoading = Object.values(loadingStates).some(Boolean)
  const hasErrors = Object.values(errorStates).some(error => !!error)

  return {
    // Current state
    sidebarOpen,
    settingsOpen,
    isResizing,
    chatPanelWidth,
    loadingStates,
    errorStates,
    
    // Computed states
    isAnyLoading,
    hasErrors,
    
    // Sidebar actions
    toggleSidebar,
    setSidebarOpen,
    
    // Settings actions
    toggleSettings,
    openSettings,
    closeSettings,
    setSettingsOpen,
    
    // Resizing actions
    startResizing,
    stopResizing,
    setIsResizing,
    
    // Layout actions
    updateChatPanelWidth,
    resetLayout,
    
    // Direct setters for advanced use
    setChatPanelWidth
  }
} 