"use client"

import { Button } from '@/components/ui/button'
import { ModelSelection } from '@/components/ui/model-selection'
import { useChatConfiguration } from '@/hooks'

export function ConfigPanel() {
  const {
    config,
    configChanged,
    canSendMessage,
    isLoading,
    updateModelName,
    updateSystemDirective,
    updateTemperature,
    handleSaveConfiguration
  } = useChatConfiguration()

  const handleSave = async () => {
    try {
      await handleSaveConfiguration()
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration')
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="border-b p-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
      </header>
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          <ModelSelection
            value={config.modelName}
            onChange={updateModelName}
            disabled={!canSendMessage}
          />

          <div>
            <label htmlFor="system-directive" className="text-sm font-medium mb-2 block">
              System Directive
            </label>
            <textarea
              id="system-directive"
              className="w-full h-40 p-2 border rounded bg-background resize-none"
              placeholder="Enter system instructions for the AI..."
              value={config.systemDirective}
              onChange={(e) => updateSystemDirective(e.target.value)}
              disabled={!canSendMessage}
            />
          </div>

          <div>
            <label htmlFor="temperature" className="text-sm font-medium mb-2 block">
              Temperature: {config.temperature.toFixed(1)}
            </label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              disabled={!canSendMessage}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!configChanged || !canSendMessage || isLoading}
          >
            {isLoading ? 'Saving...' : 'Apply Configuration'}
          </Button>
        </div>
      </div>
    </div>
  )
} 