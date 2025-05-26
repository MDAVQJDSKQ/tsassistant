'use client'

import { useEffect, useState } from 'react'

interface ModelSelectionProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

interface ModelOption {
  id: string
  name: string
  description?: string
  context_length?: number
  pricing?: {
    prompt: string
    completion: string
    prompt_per_million: number
    completion_per_million: number
  }
  top_provider?: {
    name?: string
  }
  category?: string
}

export function ModelSelection({ value, onChange, disabled = false, className = "" }: ModelSelectionProps) {
  const [models, setModels] = useState<ModelOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiSuccess, setApiSuccess] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Default models (fallback if API fails)
  const defaultModels: ModelOption[] = [
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", category: "Anthropic" },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", category: "Anthropic" },
    { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", category: "OpenAI" },
    { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", category: "OpenAI" },
    { id: "openai/gpt-4.1", name: "GPT-4.1", category: "OpenAI" },
    { id: "x-ai/grok-3-mini-beta", name: "Grok 3 Mini Beta", category: "xAI" },
    { id: "google/gemma-3-12b-it:free", name: "Gemma 3 12B", category: "Google" },
    { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash Preview", category: "Google" }
  ]

  // Load available models (with fallback to defaults)
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true)
      setApiSuccess(false)
      try {
        // Try to fetch models from API
        const response = await fetch('/api/models/list')
        if (response.ok) {
          const data = await response.json()
          // Use the models from the API response
          const apiModels = data.models || []
          
          if (apiModels.length > 0) {
            setModels(apiModels)
            setApiSuccess(true)
            console.log('Successfully loaded models with pricing from API:', apiModels.length)
          } else {
            setModels(defaultModels)
            console.warn('API returned empty models list, using defaults')
          }
        } else {
          // API failed, use defaults
          console.warn('Failed to load models from API, using defaults')
          setModels(defaultModels)
        }
      } catch (error) {
        console.warn('Failed to load models from API, using defaults:', error)
        setModels(defaultModels)
      } finally {
        setIsLoading(false)
      }
    }

    loadModels()
  }, [])

  // Group models by provider for better organization
  const groupedModels = models.reduce((acc, model) => {
    // Extract provider from model ID (e.g., "anthropic/claude-3.5-haiku" -> "Anthropic")
    const provider = model.top_provider?.name || 
                    model.category || 
                    (model.id.includes('/') ? 
                      model.id.split('/')[0].charAt(0).toUpperCase() + model.id.split('/')[0].slice(1) : 
                      'Other')
    
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push(model)
    return acc
  }, {} as Record<string, ModelOption[]>)

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    if (price < 1) return `$${price.toFixed(3)}`
    return `$${price.toFixed(2)}`
  }

  const selectedModel = models.find(m => m.id === value)
  const selectedModelName = selectedModel?.name || 'Select a model'

  const handleOptionClick = (modelId: string) => {
    onChange(modelId)
    setIsOpen(false)
  }

  const renderModelOption = (model: ModelOption) => {
    const hasPrice = model.pricing && (model.pricing.prompt_per_million > 0 || model.pricing.completion_per_million > 0)
    
    return (
      <div
        key={model.id}
        className="flex justify-between items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
        onClick={() => handleOptionClick(model.id)}
        title={model.description}
      >
        <span className="text-sm">{model.name}</span>
        {hasPrice ? (
          <span className="text-xs text-gray-500 ml-2">
            {formatPrice(model.pricing!.prompt_per_million)}/{formatPrice(model.pricing!.completion_per_million)} per 1M
          </span>
        ) : apiSuccess ? (
          <span className="text-xs text-gray-500 ml-2">Free</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className={className}>
      <label htmlFor="model-selection" className="text-sm font-medium mb-2 block">
        Model Selection
      </label>
      
      <div className="relative">
        {/* Custom dropdown trigger */}
        <button
          type="button"
          className="w-full p-2 border rounded bg-background text-sm text-left flex justify-between items-center"
          onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
        >
          <span>{isLoading ? 'Loading models...' : selectedModelName}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Custom dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
            {Object.keys(groupedModels).length > 1 ? (
              // Render grouped options if we have categories
              Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border-b">
                    {provider}
                  </div>
                  {providerModels.map(renderModelOption)}
                </div>
              ))
            ) : (
              // Render flat list if no categories or only one category
              models.map(renderModelOption)
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1">Loading available models...</p>
      )}
    </div>
  )
} 