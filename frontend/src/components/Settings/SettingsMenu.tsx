'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useSettings } from '@/hooks'

export function SettingsMenu() {
  const {
    settings,
    apiKeyConfigured,
    isLoading,
    tempApiKey,
    loadSettings,
    saveSettings,
    updateApiKey,
    updateCentralModel,
    updateTitlePrompt
  } = useSettings()
  
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    if (open) {
      try {
        await loadSettings()
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
  }

  const handleSave = async () => {
    try {
      await saveSettings()
      setIsOpen(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-6 w-6" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>App Settings</SheetTitle>
          <SheetDescription>
            Configure application-wide settings here.
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">Loading settings...</div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label htmlFor="central-model" className="text-sm font-medium block">
                Central Model
              </label>
              <select
                id="central-model"
                value={settings.centralModel}
                onChange={(e) => updateCentralModel(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              >
                <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium block">
                OpenRouter API Key {apiKeyConfigured && <span className="text-xs text-green-500">(Configured)</span>}
              </label>
              <Input
                id="api-key"
                type="password"
                placeholder={apiKeyConfigured ? "API key is configured" : "Enter your OpenRouter API key"}
                value={tempApiKey}
                onChange={(e) => updateApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and sent only to the backend.
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="title-generation-prompt" className="text-sm font-medium block">
                Custom Title Generation Prompt
              </label>
              <Textarea
                id="title-generation-prompt"
                placeholder="Enter custom prompt for generating chat titles (leave empty for default)"
                value={settings.titleGenerationPrompt || ''}
                onChange={(e) => updateTitlePrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Customize how chat titles are generated. The conversation context will be appended to this prompt.
              </p>
            </div>
          </div>
        )}
        
        <SheetFooter>
          <Button className="w-full" onClick={handleSave} disabled={isLoading}>
            Save Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 