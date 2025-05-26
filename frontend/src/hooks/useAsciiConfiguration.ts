'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { 
  asciiConfigAtom, 
  asciiConfigChangedAtom, 
  saveAsciiConfigurationAtom,
  canSendAsciiMessageAtom,
  loadingStatesAtom,
  activeAsciiConversationIdAtom 
} from '@/atoms'

export function useAsciiConfiguration() {
  const [config, setConfig] = useAtom(asciiConfigAtom)
  const [configChanged, setConfigChanged] = useAtom(asciiConfigChangedAtom)
  const [canSendMessage] = useAtom(canSendAsciiMessageAtom)
  const [loadingStates] = useAtom(loadingStatesAtom)
  const [activeConversationId] = useAtom(activeAsciiConversationIdAtom)
  const saveConfiguration = useSetAtom(saveAsciiConfigurationAtom)

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

  const updateStyle = useCallback((style: 'standard' | 'block' | 'shadow' | 'slant' | 'small') => {
    setConfig(prev => ({ ...prev, style }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateWidth = useCallback((width: number) => {
    setConfig(prev => ({ ...prev, width: Math.max(1, width) }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateIncludeInstructions = useCallback((includeInstructions: boolean) => {
    setConfig(prev => ({ ...prev, includeInstructions }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateOutputFormat = useCallback((outputFormat: 'plain' | 'html' | 'markdown') => {
    setConfig(prev => ({ ...prev, outputFormat }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateToolWidth = useCallback((toolWidth: number) => {
    setConfig(prev => ({ ...prev, toolWidth: Math.max(1, toolWidth) }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateToolHeight = useCallback((toolHeight: number) => {
    setConfig(prev => ({ ...prev, toolHeight: Math.max(1, toolHeight) }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const updateToolPrompt = useCallback((toolPrompt: string) => {
    setConfig(prev => ({ ...prev, toolPrompt }))
    setConfigChanged(true)
  }, [setConfig, setConfigChanged])

  const handleSaveConfiguration = useCallback(async () => {
    if (!activeConversationId) {
      throw new Error('No active ASCII conversation to save configuration for')
    }
    
    try {
      await saveConfiguration()
      return true
    } catch (error) {
      console.error('Error saving ASCII configuration:', error)
      throw error
    }
  }, [saveConfiguration, activeConversationId])

  const resetConfiguration = useCallback(() => {
    setConfig({
      // Chat configuration defaults
      modelName: 'anthropic/claude-3.5-haiku',
      systemDirective: `You are a helpful AI assistant. Respond to user questions and requests with accurate, helpful information. Be concise and clear in your responses.`,
      temperature: 0.7,
      // ASCII-specific defaults
      style: 'standard',
      width: 80,
      includeInstructions: true,
      outputFormat: 'plain',
      // ASCII tool configuration
      toolWidth: 80,
      toolHeight: 24,
      toolPrompt: `Analyze the conversation context provided and generate ASCII art that represents the main topic, concept, or theme being discussed. Create a visual representation using standard ASCII characters that fits within {width} characters wide and {height} lines tall.

Guidelines:
- Identify the key subject matter from the conversation context
- Use standard ASCII characters for maximum compatibility
- Create clear, recognizable shapes and forms that relate to the topic
- Keep the art within the specified dimensions: {width}x{height}
- Focus on the most distinctive visual elements of the subject
- Make the art visually appealing and thematically relevant

Context to analyze: {description}

Generate ASCII art that visually represents the main theme or concept from this conversation:`
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
    updateStyle,
    updateWidth,
    updateIncludeInstructions,
    updateOutputFormat,
    updateToolWidth,
    updateToolHeight,
    updateToolPrompt,
    
    // Bulk operations
    handleSaveConfiguration,
    resetConfiguration,
    discardChanges,
    
    // Direct setters for advanced use
    setConfig,
    setConfigChanged
  }
} 