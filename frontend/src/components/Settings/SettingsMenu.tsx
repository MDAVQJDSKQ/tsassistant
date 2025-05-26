'use client'

import { useAtom, useSetAtom } from 'jotai'
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
import {
  settingsMenuOpenAtom,
  settingsLoadingAtom,
  settingsSavingAtom,
  apiKeyConfiguredAtom,
  tempApiKeyAtom,
  tempCentralModelAtom,
  tempTitlePromptAtom,
  hasUnsavedChangesAtom,
  openSettingsMenuAtom,
  closeSettingsMenuAtom,
  saveAndCloseSettingsAtom,
  updateTempApiKeyAtom,
  updateTempCentralModelAtom,
  updateTempTitlePromptAtom,
  currentPageContextAtom
} from '@/atoms'

export function SettingsMenu() {
  // UI State
  const [isOpen] = useAtom(settingsMenuOpenAtom)
  const [isLoading] = useAtom(settingsLoadingAtom)
  const [isSaving] = useAtom(settingsSavingAtom)
  const [apiKeyConfigured] = useAtom(apiKeyConfiguredAtom)
  const [hasUnsavedChanges] = useAtom(hasUnsavedChangesAtom)
  const [currentPageContext] = useAtom(currentPageContextAtom)
  
  // Temp Values
  const [tempApiKey] = useAtom(tempApiKeyAtom)
  const [tempCentralModel] = useAtom(tempCentralModelAtom)
  const [tempTitlePrompt] = useAtom(tempTitlePromptAtom)
  
  // Actions
  const openSettings = useSetAtom(openSettingsMenuAtom)
  const closeSettings = useSetAtom(closeSettingsMenuAtom)
  const saveAndClose = useSetAtom(saveAndCloseSettingsAtom)
  const updateApiKey = useSetAtom(updateTempApiKeyAtom)
  const updateCentralModel = useSetAtom(updateTempCentralModelAtom)
  const updateTitlePrompt = useSetAtom(updateTempTitlePromptAtom)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      openSettings()
    } else {
      closeSettings()
    }
  }

  const handleSave = async () => {
    try {
      await saveAndClose()
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const isWorking = isLoading || isSaving
  const conversationType = currentPageContext === 'ascii' ? 'ASCII' : 'regular'
  const savingMessage = currentPageContext === 'ascii' 
    ? 'Saving settings and regenerating ASCII conversation titles...'
    : 'Saving settings and regenerating conversation titles...'

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
            {hasUnsavedChanges && (
              <span className="block text-amber-600 text-sm mt-1">
                You have unsaved changes.
              </span>
            )}
            {isSaving && (
              <span className="block text-blue-600 text-sm mt-1">
                {savingMessage}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        ) : (
          <div className="py-4 px-4 space-y-6">
            <div className="space-y-2">
              <label htmlFor="central-model" className="text-sm font-medium block">
                Central Model
              </label>
              <select
                id="central-model"
                value={tempCentralModel}
                onChange={(e) => updateCentralModel(e.target.value)}
                disabled={isWorking}
                className="w-full p-2 border rounded bg-background disabled:opacity-50"
              >
                <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              </select>
              <p className="text-xs text-muted-foreground">
                This model will be used for new conversations and ASCII generation.
              </p>
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
                disabled={isWorking}
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
                value={tempTitlePrompt}
                onChange={(e) => updateTitlePrompt(e.target.value)}
                disabled={isWorking}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Customize how {conversationType} conversation titles are generated. The conversation context will be appended to this prompt.
              </p>
            </div>

            {/* Context indicator */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Current Context:</strong> You're on the {conversationType} chat page. 
                Title regeneration will apply to {conversationType} conversations only.
              </p>
            </div>
          </div>
        )}
        
        <SheetFooter>
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => closeSettings()}
              disabled={isWorking}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isWorking || !hasUnsavedChanges}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Regenerating {conversationType} Titles...
                </>
              ) : (
                `Save & Update ${conversationType} Titles`
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 