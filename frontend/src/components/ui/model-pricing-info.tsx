'use client'

import { useState, useEffect } from 'react'

interface ModelPricing {
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
}

interface ModelPricingInfoProps {
  className?: string
}

export function ModelPricingInfo({ className = "" }: ModelPricingInfoProps) {
  const [models, setModels] = useState<ModelPricing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'provider'>('price')

  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/models/list')
        if (response.ok) {
          const data = await response.json()
          setModels(data.models || [])
        } else {
          setError('Failed to load models')
        }
      } catch (err) {
        setError('Error loading models: ' + String(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadModels()
  }, [])

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free'
    if (price < 1) return `$${price.toFixed(3)}`
    return `$${price.toFixed(2)}`
  }

  const sortedModels = [...models].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'provider':
        const providerA = a.top_provider?.name || 'Unknown'
        const providerB = b.top_provider?.name || 'Unknown'
        return providerA.localeCompare(providerB)
      case 'price':
      default:
        const totalA = (a.pricing?.prompt_per_million || 0) + (a.pricing?.completion_per_million || 0)
        const totalB = (b.pricing?.prompt_per_million || 0) + (b.pricing?.completion_per_million || 0)
        return totalA - totalB
    }
  })

  const refreshCache = async () => {
    try {
      await fetch('/api/models/refresh', { method: 'POST' })
      // Reload models after cache refresh
      const response = await fetch('/api/models/list')
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
      }
    } catch (err) {
      setError('Error refreshing cache: ' + String(err))
    }
  }

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">Loading model pricing information...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-500 text-center">{error}</div>
        <button 
          onClick={refreshCache}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 block mx-auto"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Model Pricing Information</h3>
        <div className="flex gap-2">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'provider')}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="price">Sort by Price</option>
            <option value="name">Sort by Name</option>
            <option value="provider">Sort by Provider</option>
          </select>
          <button 
            onClick={refreshCache}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left">Model</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Provider</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Input (per 1M tokens)</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Output (per 1M tokens)</th>
              <th className="border border-gray-300 px-3 py-2 text-right">Total Cost</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Context Length</th>
            </tr>
          </thead>
          <tbody>
            {sortedModels.map((model) => {
              const totalCost = (model.pricing?.prompt_per_million || 0) + (model.pricing?.completion_per_million || 0)
              return (
                <tr key={model.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2">
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.id}</div>
                    </div>
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {model.top_provider?.name || 'Unknown'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatPrice(model.pricing?.prompt_per_million || 0)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {formatPrice(model.pricing?.completion_per_million || 0)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                    {formatPrice(totalCost)}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {model.context_length ? `${(model.context_length / 1000).toFixed(0)}K` : 'N/A'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>• Prices are per million tokens and may vary by provider</p>
        <p>• Total cost assumes equal input/output usage (not typical in practice)</p>
        <p>• Free models may have usage limits or restrictions</p>
        <p>• Data cached for 1 hour to reduce API calls</p>
      </div>
    </div>
  )
} 