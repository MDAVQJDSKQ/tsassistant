'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useState, useCallback } from 'react'
import { 
  settingsAtom, 
  apiKeyAtom, 
  centralModelAtom, 
  titleGenerationPromptAtom,
  isSettingsValidAtom 
} from '@/atoms'

export function useSettings() {
  const [settings] = useAtom(settingsAtom)
  const [isValid] = useAtom(isSettingsValidAtom)
  const [apiKey, setApiKey] = useAtom(apiKeyAtom)
  const [centralModel, setCentralModel] = useAtom(centralModelAtom)
  const [titlePrompt, setTitlePrompt] = useAtom(titleGenerationPromptAtom)
  
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        if (data.central_model) setCentralModel(data.central_model)
        if (data.title_generation_prompt) setTitlePrompt(data.title_generation_prompt)
        setApiKeyConfigured(!!data.api_key_configured)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [setCentralModel, setTitlePrompt])

  const saveSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centralModel,
          apiKey: tempApiKey || undefined,
          titleGenerationPrompt: titlePrompt
        })
      })
      
      if (!response.ok) throw new Error('Failed to save settings')
      
      if (tempApiKey) {
        setApiKey(tempApiKey)
        setTempApiKey('')
        setApiKeyConfigured(true)
      }
      
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [centralModel, titlePrompt, tempApiKey, setApiKey])

  const updateApiKey = useCallback((key: string) => {
    setTempApiKey(key)
  }, [])

  const updateCentralModel = useCallback((model: string) => {
    setCentralModel(model)
  }, [setCentralModel])

  const updateTitlePrompt = useCallback((prompt: string) => {
    setTitlePrompt(prompt)
  }, [setTitlePrompt])

  return {
    // Current settings
    settings,
    isValid,
    apiKeyConfigured,
    isLoading,
    
    // Temporary values
    tempApiKey,
    
    // Actions
    loadSettings,
    saveSettings,
    updateApiKey,
    updateCentralModel,
    updateTitlePrompt,
    
    // Direct atom setters for advanced use
    setApiKey,
    setCentralModel,
    setTitlePrompt
  }
} 