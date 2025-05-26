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
  const [allModels, setAllModels] = useState<ModelOption[]>([])
  const [userPreferredModelIds, setUserPreferredModelIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiSuccess, setApiSuccess] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)

  // Load available models and user preferences
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setApiSuccess(false)
      let fetchedAllModels: ModelOption[] = []
      let fetchedFallbackIds: string[] = []

      try {
        // 1. Fetch all models from API
        const allModelsResponse = await fetch('/api/models/list')
        if (allModelsResponse.ok) {
          const data = await allModelsResponse.json()
          fetchedAllModels = data.models || []
          if (fetchedAllModels.length > 0) {
            setAllModels(fetchedAllModels)
            setApiSuccess(true)
            console.log('Successfully loaded all models from API:', fetchedAllModels.length)
          } else {
            console.warn('API returned empty all models list.')
          }
        } else {
          console.warn('Failed to load all models from API.')
        }

        // 2. Fetch fallback model IDs
        const fallbackResponse = await fetch('/api/models/fallback-list')
        if (fallbackResponse.ok) {
          fetchedFallbackIds = await fallbackResponse.json()
          console.log('Successfully loaded fallback model IDs:', fetchedFallbackIds)
        } else {
          console.warn('Failed to load fallback model IDs from API. Using hardcoded fallback if allModels is also empty.')
        }

      } catch (error) {
        console.warn('Error during API calls for models:', error)
      } finally {
        // 3. Initialize userPreferredModelIds
        const storedPreferredIds = localStorage.getItem('userPreferredModelIds')
        if (storedPreferredIds) {
          setUserPreferredModelIds(JSON.parse(storedPreferredIds))
        } else if (fetchedFallbackIds.length > 0) {
          setUserPreferredModelIds(fetchedFallbackIds)
        } else if (fetchedAllModels.length === 0) {
          // Absolute fallback if both API calls fail and nothing in local storage
          // This uses the FALLBACK_MODELS structure defined in backend/models.py
          // We need to ensure these IDs are consistent.
          const hardcodedFallbackIds = [
            "anthropic/claude-3.5-haiku",
            "anthropic/claude-3.7-sonnet",
            "anthropic/claude-3-opus",
            "openai/gpt-4",
            "openai/gpt-3.5-turbo",
            "openai/gpt-4.1-nano",
            "openai/gpt-4.1-mini",
            "openai/gpt-4.1",
            "x-ai/grok-3-mini-beta",
            "google/gemma-3-12b-it:free",
            "google/gemini-2.5-flash-preview",
          ];
          setUserPreferredModelIds(hardcodedFallbackIds);
          // If allModels is empty, populate it with minimal info for these fallbacks
          if (allModels.length === 0) {
             setAllModels(hardcodedFallbackIds.map(id => ({id, name: id.split('/')[1] || id })));
          }
        }


        // If, after all attempts, allModels is empty but userPreferredModelIds has some IDs,
        // create minimal model entries for them to allow the UI to function.
        if (allModels.length === 0 && userPreferredModelIds.length > 0) {
            const minimalModels = userPreferredModelIds.map(id => {
                const nameParts = id.split('/');
                const name = nameParts.length > 1 ? nameParts[1].replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : id;
                const provider = nameParts.length > 1 ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Other';
                return { id, name, category: provider };
            });
            setAllModels(minimalModels);
            console.warn("Populated allModels with minimal data based on userPreferredModelIds as a last resort.");
        }


        setIsLoading(false)
        // Set apiSuccess based on whether allModels has content
        if (allModels.length > 0) setApiSuccess(true)
      }
    }

    loadData()
  }, [])

  // Update localStorage when userPreferredModelIds changes
  useEffect(() => {
    if (userPreferredModelIds.length > 0) { // Only save if not empty to avoid overwriting with initial empty state
        localStorage.setItem('userPreferredModelIds', JSON.stringify(userPreferredModelIds))
    }
  }, [userPreferredModelIds])

  // Filtered models for the dropdown based on user preferences
  const displayedModels = allModels.filter(model => userPreferredModelIds.includes(model.id))

  // Group models by provider for better organization
  const groupedModels = displayedModels.reduce((acc, model) => {
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

  const selectedModel = allModels.find(m => m.id === value)
  const selectedModelName = selectedModel?.name || 'Select a model'

  // Group allModels by provider for the modal - calculate only when needed
  let groupedAllModelsForModal: Record<string, ModelOption[]> = {};
  if (isManageModalOpen) {
    groupedAllModelsForModal = allModels.reduce((acc, model) => {
      const provider = model.top_provider?.name || 
                      model.category || 
                      (model.id.includes('/') ? 
                        model.id.split('/')[0].charAt(0).toUpperCase() + model.id.split('/')[0].slice(1) : 
                        'Other');
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, ModelOption[]>);
  }

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
            {Object.keys(groupedModels).length > 0 ? (
              // Render grouped options if we have categories
              Object.entries(groupedModels).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-3 py-1 text-xs font-semibold text-black bg-gray-50 border-b">
                    {provider}
                  </div>
                  {providerModels.map(renderModelOption)}
                </div>
              ))
            ) : (
              // Render flat list if no categories or only one category
              displayedModels.map(renderModelOption)
            )}
            {groupedModels && Object.keys(groupedModels).length === 0 && !isLoading && (
                 <div className="px-3 py-2 text-sm text-gray-500">
                    No models selected. Click "Manage Models" to add some.
                 </div>
            )}
          </div>
        )}
      </div>

      {/* "Manage Models" Button */}
      <button 
        type="button"
        onClick={() => setIsManageModalOpen(true)}
        className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        disabled={disabled || isLoading || !apiSuccess}
      >
        Manage Models
      </button>

      {/* Manage Models Modal */}
      {isManageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
              <h3 className="text-xl font-semibold mb-4">Manage Models</h3>
              <div className="overflow-y-auto flex-grow mb-4 pr-2 space-y-1">
                {allModels.length > 0 ? (
                  Object.entries(groupedAllModelsForModal).map(([provider, providerModels]) => (
                    <div key={provider} className="mb-3">
                      <h4 className="text-sm font-semibold text-black mb-1.5 sticky top-0 bg-white py-1">{provider}</h4>
                      {providerModels.map(model => (
                        <label key={model.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-3 h-4 w-4 accent-blue-600"
                            checked={userPreferredModelIds.includes(model.id)}
                            onChange={() => {
                              setUserPreferredModelIds(prev =>
                                prev.includes(model.id)
                                  ? prev.filter(id => id !== model.id)
                                  : [...prev, model.id]
                              );
                            }}
                          />
                          <span className="text-sm">{model.name}</span>
                          {model.pricing && (model.pricing.prompt_per_million > 0 || model.pricing.completion_per_million > 0) ? (
                            <span className="text-xs text-gray-500 ml-auto">
                              {formatPrice(model.pricing!.prompt_per_million)}/{formatPrice(model.pricing!.completion_per_million)}
                            </span>
                          ) : apiSuccess && model.pricing ? (
                            <span className="text-xs text-gray-500 ml-auto">Free</span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  ))
                ) : <p className="text-sm text-gray-500">No models available to manage.</p>}
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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