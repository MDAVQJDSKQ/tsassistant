'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { 
  chatConfigAtom, 
  configChangedAtom, 
  saveConfigurationAtom,
  canSendMessageAtom,
  loadingStatesAtom,
  activeConversationIdAtom 
} from '@/atoms'

export function useChatConfiguration() {
  const [config, setConfig] = useAtom(chatConfigAtom)
  const [configChanged, setConfigChanged] = useAtom(configChangedAtom)
  const [canSendMessage] = useAtom(canSendMessageAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [activeConversationId] = useAtom(activeConversationIdAtom)
  const saveConfiguration = useSetAtom(saveConfigurationAtom)

  const updateModelName = useCallback((modelName: string) => {
    setConfig(prev => ({ ...prev, modelName }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateSystemDirective = useCallback((systemDirective: string) => {
    setConfig(prev => ({ ...prev, systemDirective }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateTemperature = useCallback((temperature: number) => {
    const clampedTemp = Math.min(2, Math.max(0, temperature))
    setConfig(prev => ({ ...prev, temperature: clampedTemp }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const handleSaveConfiguration = useCallback(async () => {
    if (!activeConversationId) {
      throw new Error('No active conversation to save configuration for')
    }
    
    try {
      await saveConfiguration()
      return true
    } catch (error) {
      console.error('Error saving configuration:', error)
      throw error
    }
  }, [saveConfiguration, activeConversationId])

  const resetConfiguration = useCallback(() => {
    setConfig({
      modelName: 'anthropic/claude-3.5-haiku',
      systemDirective: '',
      temperature: 0.7
    })
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const discardChanges = useCallback(() => {
    // This would typically reload from the server
    // For now, just mark as unchanged
    setConfigChanged(false)
  }, [setConfigChanged])

  return {
    // Current configuration
    config,
    configChanged,
    canSendMessage,
    isLoading: loadingStates.saving,
    activeConversationId,
    
    // Individual update functions
    updateModelName,
    updateSystemDirective,
    updateTemperature,
    
    // Bulk operations
    handleSaveConfiguration,
    resetConfiguration,
    discardChanges,
    
    // Direct setters for advanced use
    setConfig,
    setConfigChanged
  }
} 