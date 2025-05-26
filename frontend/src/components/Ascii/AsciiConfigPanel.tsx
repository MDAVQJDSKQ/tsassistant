'use client'

import { useAtom } from 'jotai'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModelSelection } from '@/components/ui/model-selection'
import { 
  asciiConfigAtom, 
  asciiConfigChangedAtom,
  canSendAsciiMessageAtom,
  asciiMessagesAtom,
  activeAsciiConversationIdAtom
} from '@/atoms'

export function AsciiConfigPanel() {
  const [config, setConfig] = useAtom(asciiConfigAtom)
  const [configChanged, setConfigChanged] = useAtom(asciiConfigChangedAtom)
  const [canSendMessage] = useAtom(canSendAsciiMessageAtom)
  const [messages] = useAtom(asciiMessagesAtom)
  const [activeConversationId] = useAtom(activeAsciiConversationIdAtom)

  const handleConfigChange = <T extends keyof typeof config>(
    key: T, 
    value: typeof config[T]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setConfigChanged(true)
  }

  const handleSave = () => {
    // Save configuration logic will be implemented later
    setConfigChanged(false)
    console.log('ASCII configuration saved:', config)
  }

  const handleGenerateAscii = async () => {
    // Instead of generating ASCII art here, we'll guide the user to use the chat
    alert('To generate ASCII art from conversation context, type a message like "Generate ASCII art based on our conversation" in the chat below. The AI will automatically use the ASCII art tool with your configured dimensions.')
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
            disabled={!configChanged || !canSendMessage}
          >
            Apply Configuration
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

              {/* Context Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Context-Aware Generation:</strong> The tool will analyze your current conversation 
                  {messages.length > 0 ? ` (${messages.length} messages)` : ''} and generate ASCII art 
                  that represents the main topics or concepts being discussed.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                onClick={handleGenerateAscii}
                disabled={!canSendMessage}
              >
                How to Generate ASCII Art
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 