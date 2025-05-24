'use client'

import { useSettings, useChatConfiguration, useUIState } from '@/hooks'

export function HooksTest() {
  const { 
    settings, 
    isValid, 
    updateCentralModel, 
    updateApiKey,
    tempApiKey,
    isLoading: settingsLoading 
  } = useSettings()
  
  const { 
    config, 
    configChanged, 
    updateModelName, 
    updateTemperature,
    isLoading: configLoading 
  } = useChatConfiguration()
  
  const { 
    sidebarOpen, 
    toggleSidebar, 
    chatPanelWidth, 
    updateChatPanelWidth,
    isAnyLoading 
  } = useUIState()

  return (
    <div className="p-6 space-y-6 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <h3 className="text-xl font-semibold mb-4">Custom Hooks Test</h3>
      
      {/* Settings Hook Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium">Settings Hook</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">API Key:</label>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => updateApiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Central Model:</label>
            <select
              value={settings.centralModel}
              onChange={(e) => updateCentralModel(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
              <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Settings Valid: {isValid ? '✅' : '❌'} | Loading: {settingsLoading ? '⏳' : '✅'}
        </div>
      </div>

      {/* Chat Configuration Hook Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium">Chat Configuration Hook</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model Name:</label>
            <select
              value={config.modelName}
              onChange={(e) => updateModelName(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
              <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Temperature: {config.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Config Changed: {configChanged ? '🔄' : '✅'} | Loading: {configLoading ? '⏳' : '✅'}
        </div>
      </div>

      {/* UI State Hook Test */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium">UI State Hook</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={sidebarOpen}
                onChange={toggleSidebar}
              />
              <span className="text-sm font-medium">Sidebar Open</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Chat Panel Width: {chatPanelWidth}%
            </label>
            <input
              type="range"
              min="30"
              max="90"
              value={chatPanelWidth}
              onChange={(e) => updateChatPanelWidth(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Any Loading: {isAnyLoading ? '⏳' : '✅'} | Sidebar: {sidebarOpen ? 'Open' : 'Closed'}
        </div>
      </div>

      {/* Status Summary */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
        <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Hook Status Summary</h5>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>✅ Settings Hook: {Object.keys(settings).length} settings loaded</p>
          <p>✅ Chat Config Hook: Model {config.modelName} at {config.temperature}°</p>
          <p>✅ UI State Hook: Panel at {chatPanelWidth}%, sidebar {sidebarOpen ? 'open' : 'closed'}</p>
        </div>
      </div>
    </div>
  )
} 