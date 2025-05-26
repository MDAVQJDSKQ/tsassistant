import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// ============================================================================
// PERSISTENT SETTINGS ATOMS
// ============================================================================

// Core settings stored in localStorage
export const apiKeyAtom = atomWithStorage('apiKey', '')
export const centralModelAtom = atomWithStorage('centralModel', 'claude-3.7-sonnet')
export const titleGenerationPromptAtom = atomWithStorage('titleGenerationPrompt', '')

// ============================================================================
// UI STATE ATOMS
// ============================================================================

// Settings menu UI state
export const settingsMenuOpenAtom = atom(false)
export const settingsLoadingAtom = atom(false)
export const settingsSavingAtom = atom(false)
export const apiKeyConfiguredAtom = atom(false)

// Temporary values (for editing before save)
export const tempApiKeyAtom = atom('')
export const tempCentralModelAtom = atom('claude-3.7-sonnet')
export const tempTitlePromptAtom = atom('')

// ============================================================================
// DERIVED ATOMS
// ============================================================================

// Combined settings object
export const settingsAtom = atom(
  (get) => ({
    apiKey: get(apiKeyAtom),
    centralModel: get(centralModelAtom),
    titleGenerationPrompt: get(titleGenerationPromptAtom)
  })
)

// Temporary settings object (for editing)
export const tempSettingsAtom = atom(
  (get) => ({
    apiKey: get(tempApiKeyAtom),
    centralModel: get(tempCentralModelAtom),
    titleGenerationPrompt: get(tempTitlePromptAtom)
  })
)

// Settings validation
export const isSettingsValidAtom = atom(
  (get) => {
    const settings = get(settingsAtom)
    return settings.centralModel.length > 0
  }
)

// Check if there are unsaved changes
export const hasUnsavedChangesAtom = atom(
  (get) => {
    const current = get(settingsAtom)
    const temp = get(tempSettingsAtom)
    
    return (
      current.centralModel !== temp.centralModel ||
      current.titleGenerationPrompt !== temp.titleGenerationPrompt ||
      temp.apiKey.length > 0 // API key is always considered a change if not empty
    )
  }
)

// ============================================================================
// ACTION ATOMS
// ============================================================================

// Regenerate titles for all existing conversations
export const regenerateAllTitlesAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('Starting to regenerate all conversation titles...')
      
      // Get list of conversations
      const conversationsResponse = await fetch('/api/conversations')
      if (!conversationsResponse.ok) {
        throw new Error('Failed to fetch conversations')
      }
      
      const conversations = await conversationsResponse.json()
      console.log(`Found ${conversations.length} conversations to update`)
      
      if (conversations.length === 0) {
        return { total: 0, successful: 0, results: [] }
      }
      
      const conversationsToUpdate = conversations.filter((conv: any) => conv.id)
      const results = []
      let successCount = 0
      
      // Process conversations in batches to avoid overwhelming the server
      const batchSize = 3
      for (let i = 0; i < conversationsToUpdate.length; i += batchSize) {
        const batch = conversationsToUpdate.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (conversation: any) => {
          try {
            console.log(`Regenerating title for conversation: ${conversation.id}`)
            const response = await fetch(`/api/conversations/${conversation.id}/generate-title`, {
              method: 'POST'
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log(`Successfully regenerated title for ${conversation.id}: "${result.title}"`)
              successCount++
              return { id: conversation.id, success: true, title: result.title }
            } else {
              console.error(`Failed to regenerate title for ${conversation.id}: ${response.status}`)
              return { id: conversation.id, success: false, error: `HTTP ${response.status}` }
            }
          } catch (error) {
            console.error(`Error regenerating title for ${conversation.id}:`, error)
            return { id: conversation.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        // Small delay between batches
        if (i + batchSize < conversationsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      console.log(`Successfully regenerated ${successCount}/${conversationsToUpdate.length} conversation titles`)
      
      // Dispatch a custom event to notify other parts of the app to refresh conversations
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('conversationTitlesUpdated', {
          detail: { total: conversationsToUpdate.length, successful: successCount }
        }))
      }
      
      return { 
        total: conversationsToUpdate.length, 
        successful: successCount,
        results 
      }
    } catch (error) {
      console.error('Error regenerating all titles:', error)
      throw error
    }
  }
)

// Regenerate all ASCII conversation titles
export const regenerateAllAsciiTitlesAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('Starting to regenerate all ASCII conversation titles...')
      
      // Get list of ASCII conversations
      const conversationsResponse = await fetch('/api/ascii-conversations/list')
      if (!conversationsResponse.ok) {
        throw new Error('Failed to fetch ASCII conversations')
      }
      
      const conversations = await conversationsResponse.json()
      console.log(`Found ${conversations.length} ASCII conversations to update`)
      
      if (conversations.length === 0) {
        return { total: 0, successful: 0, results: [] }
      }
      
      const conversationsToUpdate = conversations.filter((conv: any) => conv.id)
      const results = []
      let successCount = 0
      
      // Process conversations in batches to avoid overwhelming the server
      const batchSize = 3
      for (let i = 0; i < conversationsToUpdate.length; i += batchSize) {
        const batch = conversationsToUpdate.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (conversation: any) => {
          try {
            console.log(`Regenerating title for ASCII conversation: ${conversation.id}`)
            const response = await fetch(`/api/ascii-conversations/${conversation.id}/generate-title`, {
              method: 'POST'
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log(`Successfully regenerated title for ASCII ${conversation.id}: "${result.title}"`)
              successCount++
              return { id: conversation.id, success: true, title: result.title }
            } else {
              console.error(`Failed to regenerate title for ASCII ${conversation.id}: ${response.status}`)
              return { id: conversation.id, success: false, error: `HTTP ${response.status}` }
            }
          } catch (error) {
            console.error(`Error regenerating title for ASCII ${conversation.id}:`, error)
            return { id: conversation.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        // Small delay between batches
        if (i + batchSize < conversationsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      console.log(`Successfully regenerated ${successCount}/${conversationsToUpdate.length} ASCII conversation titles`)
      
      // Dispatch a custom event to notify other parts of the app to refresh conversations
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('asciiConversationTitlesUpdated', {
          detail: { total: conversationsToUpdate.length, successful: successCount }
        }))
      }
      
      return { 
        total: conversationsToUpdate.length, 
        successful: successCount,
        results 
      }
    } catch (error) {
      console.error('Error regenerating all ASCII titles:', error)
      throw error
    }
  }
)

// Load settings from backend
export const loadSettingsAtom = atom(
  null,
  async (get, set) => {
    set(settingsLoadingAtom, true)
    
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        
        // Update persistent atoms
        if (data.central_model) {
          set(centralModelAtom, data.central_model)
          set(tempCentralModelAtom, data.central_model)
        }
        if (data.title_generation_prompt !== undefined) {
          set(titleGenerationPromptAtom, data.title_generation_prompt || '')
          set(tempTitlePromptAtom, data.title_generation_prompt || '')
        }
        
        // Update UI state
        set(apiKeyConfiguredAtom, !!data.api_key_configured)
      } else {
        throw new Error(`Failed to load settings: ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      throw error
    } finally {
      set(settingsLoadingAtom, false)
    }
  }
)

// Save settings to backend
export const saveSettingsAtom = atom(
  null,
  async (get, set) => {
    set(settingsSavingAtom, true)
    
    try {
      const tempSettings = get(tempSettingsAtom)
      const currentSettings = get(settingsAtom)
      const currentPageContext = get(currentPageContextAtom)
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centralModel: tempSettings.centralModel,
          apiKey: tempSettings.apiKey || undefined,
          titleGenerationPrompt: tempSettings.titleGenerationPrompt
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status}`)
      }
      
      // Check if title-related settings changed
      const titleSettingsChanged = (
        currentSettings.centralModel !== tempSettings.centralModel ||
        currentSettings.titleGenerationPrompt !== tempSettings.titleGenerationPrompt
      )
      
      // Update persistent atoms with temp values
      set(centralModelAtom, tempSettings.centralModel)
      set(titleGenerationPromptAtom, tempSettings.titleGenerationPrompt)
      
      // Handle API key
      if (tempSettings.apiKey) {
        set(apiKeyAtom, tempSettings.apiKey)
        set(tempApiKeyAtom, '') // Clear temp API key
        set(apiKeyConfiguredAtom, true)
      }
      
      // If title-related settings changed, regenerate titles based on current page context
      if (titleSettingsChanged) {
        if (currentPageContext === 'ascii') {
          console.log('Title-related settings changed, regenerating ASCII conversation titles...')
          try {
            await set(regenerateAllAsciiTitlesAtom)
            console.log('Successfully regenerated all ASCII conversation titles')
          } catch (error) {
            console.error('Error regenerating ASCII titles after settings save:', error)
            // Don't fail the entire save operation if title regeneration fails
          }
        } else {
          console.log('Title-related settings changed, regenerating regular conversation titles...')
          try {
            await set(regenerateAllTitlesAtom)
            console.log('Successfully regenerated all conversation titles')
          } catch (error) {
            console.error('Error regenerating titles after settings save:', error)
            // Don't fail the entire save operation if title regeneration fails
          }
        }
      }
      
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    } finally {
      set(settingsSavingAtom, false)
    }
  }
)

// Open settings menu and load current settings
export const openSettingsMenuAtom = atom(
  null,
  async (get, set) => {
    set(settingsMenuOpenAtom, true)
    
    // Reset temp values to current values
    const current = get(settingsAtom)
    set(tempCentralModelAtom, current.centralModel)
    set(tempTitlePromptAtom, current.titleGenerationPrompt)
    set(tempApiKeyAtom, '')
    
    // Load latest settings from backend
    try {
      await set(loadSettingsAtom)
      // Update temp values again after loading from backend
      const updated = get(settingsAtom)
      set(tempCentralModelAtom, updated.centralModel)
      set(tempTitlePromptAtom, updated.titleGenerationPrompt)
    } catch (error) {
      console.error('Error loading settings on menu open:', error)
    }
  }
)

// Close settings menu
export const closeSettingsMenuAtom = atom(
  null,
  (get, set) => {
    set(settingsMenuOpenAtom, false)
    
    // Reset temp values to current persistent values
    const current = get(settingsAtom)
    set(tempCentralModelAtom, current.centralModel)
    set(tempTitlePromptAtom, current.titleGenerationPrompt)
    set(tempApiKeyAtom, '')
  }
)

// Save and close settings menu
export const saveAndCloseSettingsAtom = atom(
  null,
  async (get, set) => {
    try {
      await set(saveSettingsAtom)
      set(closeSettingsMenuAtom)
      return true
    } catch (error) {
      // Don't close menu if save failed
      throw error
    }
  }
)

// Update temp API key
export const updateTempApiKeyAtom = atom(
  null,
  (get, set, newKey: string) => {
    set(tempApiKeyAtom, newKey)
  }
)

// Update temp central model
export const updateTempCentralModelAtom = atom(
  null,
  (get, set, newModel: string) => {
    set(tempCentralModelAtom, newModel)
  }
)

// Update temp title prompt
export const updateTempTitlePromptAtom = atom(
  null,
  (get, set, newPrompt: string) => {
    set(tempTitlePromptAtom, newPrompt)
  }
)

// Context atom to track which page we're on
export const currentPageContextAtom = atom<'chat' | 'ascii'>('chat')

// Import conversation atoms for refreshing after title regeneration
// Note: This creates a circular dependency, so we'll handle the refresh differently 