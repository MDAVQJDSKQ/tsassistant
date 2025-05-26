'use client'

import { useAtom } from 'jotai'
import { apiKeyAtom, centralModelAtom, sidebarOpenAtom } from '@/atoms'

export function JotaiTest() {
  const [apiKey, setApiKey] = useAtom(apiKeyAtom)
  const [centralModel, setCentralModel] = useAtom(centralModelAtom)
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">Jotai State Test</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">API Key:</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Central Model:</label>
          <select
            value={centralModel}
            onChange={(e) => setCentralModel(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
            <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
          </select>
        </div>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={sidebarOpen}
              onChange={(e) => setSidebarOpen(e.target.checked)}
            />
            <span className="text-sm font-medium">Sidebar Open</span>
          </label>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>API Key: {apiKey ? '***' + apiKey.slice(-4) : 'Not set'}</p>
          <p>Model: {centralModel}</p>
          <p>Sidebar: {sidebarOpen ? 'Open' : 'Closed'}</p>
        </div>
      </div>
    </div>
  )
} 