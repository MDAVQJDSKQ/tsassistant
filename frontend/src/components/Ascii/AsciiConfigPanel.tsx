'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModelSelection } from '@/components/ui/model-selection'
import { 
  asciiConfigAtom, 
  asciiConfigChangedAtom,
  canSendAsciiMessageAtom,
  asciiMessagesAtom,
  activeAsciiConversationIdAtom,
  saveAsciiConfigurationAtom
} from '@/atoms'

export interface AsciiConfigPanelProps {
  onGenerateClick: () => void;
}

export function AsciiConfigPanel({ onGenerateClick }: AsciiConfigPanelProps) {
  const [config, setConfig] = useAtom(asciiConfigAtom)
  const [configChanged, setConfigChanged] = useAtom(asciiConfigChangedAtom)
  const [canSendMessage] = useAtom(canSendAsciiMessageAtom)
  const [messages] = useAtom(asciiMessagesAtom)
  const [activeConversationId] = useAtom(activeAsciiConversationIdAtom)
  const saveConfiguration = useSetAtom(saveAsciiConfigurationAtom)
  const [saving, setSaving] = useState(false)

  const handleConfigChange = <T extends keyof typeof config>(
    key: T, 
    value: typeof config[T]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setConfigChanged(true)
  }

  const handleSave = async () => {
    if (!activeConversationId || !configChanged) return
    
    setSaving(true)
    try {
      await saveConfiguration()
      console.log('ASCII configuration saved successfully')
    } catch (error) {
      console.error('Failed to save ASCII configuration:', error)
      alert('Failed to save configuration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <header className="border-b p-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
      </header>
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          {/* Chat Configuration Section */}
          <div>
            <h3 className="text-sm font-medium mb-3 block">Chat Configuration</h3>
            
            <div className="space-y-4">
              <ModelSelection
                value={config.modelName}
                onChange={(value) => handleConfigChange('modelName', value)}
                disabled={!canSendMessage}
              />

              <div>
                <label htmlFor="system-directive" className="text-sm font-medium mb-2 block">
                  System Directive
                </label>
                <textarea
                  id="system-directive"
                  className="w-full h-32 p-2 border rounded bg-background resize-none"
                  placeholder="Enter system instructions for the AI assistant..."
                  value={config.systemDirective}
                  onChange={(e) => handleConfigChange('systemDirective', e.target.value)}
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
                  onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  disabled={!canSendMessage}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!configChanged || !canSendMessage || saving}
          >
            {saving ? 'Saving...' : 'Apply Configuration'}
          </Button>

          {/* ASCII Tool Section */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-medium mb-3 block">ASCII Art Generator Tool</h3>
            
            <div className="space-y-4">
              {/* Tool Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tool-width" className="text-sm font-medium mb-2 block">
                    Width (characters)
                  </label>
                  <input
                    id="tool-width"
                    type="number"
                    min="1"
                    value={config.toolWidth}
                    onChange={(e) => handleConfigChange('toolWidth', Math.max(1, parseInt(e.target.value) || 80))}
                    className="w-full p-2 border rounded bg-background"
                    disabled={!canSendMessage}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Any positive number (default: 80)
                  </p>
                </div>
                <div>
                  <label htmlFor="tool-height" className="text-sm font-medium mb-2 block">
                    Height (lines)
                  </label>
                  <input
                    id="tool-height"
                    type="number"
                    min="1"
                    value={config.toolHeight}
                    onChange={(e) => handleConfigChange('toolHeight', Math.max(1, parseInt(e.target.value) || 24))}
                    className="w-full p-2 border rounded bg-background"
                    disabled={!canSendMessage}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Any positive number (default: 24)
                  </p>
                </div>
              </div>

              {/* Tool Prompt */}
              <div>
                <label htmlFor="tool-prompt" className="text-sm font-medium mb-2 block">
                  Tool Prompt Template
                </label>
                <textarea
                  id="tool-prompt"
                  className="w-full h-32 p-2 border rounded bg-background resize-none"
                  placeholder="Enter the prompt template for ASCII generation..."
                  value={config.toolPrompt}
                  onChange={(e) => handleConfigChange('toolPrompt', e.target.value)}
                  disabled={!canSendMessage}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{width}'}, {'{height}'}, and {'{description}'} as placeholders.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                onClick={onGenerateClick}
                disabled={!canSendMessage}
              >
                Generate ASCII Art
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 