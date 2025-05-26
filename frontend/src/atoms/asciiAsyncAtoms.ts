import { atom } from 'jotai'
import { 
  asciiConversationsAtom, 
  activeAsciiConversationIdAtom, 
  asciiMessagesAtom,
  asciiConfigAtom,
  asciiConfigChangedAtom,
  type AsciiConversation 
} from './asciiAtoms'
import { loadingStatesAtom, errorStatesAtom } from './uiAtoms'

// Load ASCII conversations from API (separate endpoint)
export const loadAsciiConversationsAtom = atom(
  null,
  async (get, set) => {
    set(loadingStatesAtom, prev => ({ ...prev, conversations: true }))
    set(errorStatesAtom, prev => ({ ...prev, conversations: undefined }))
    
    try {
      const response = await fetch('/api/ascii-conversations/list')
      if (!response.ok) {
        // If endpoint doesn't exist yet, create a default conversation
        if (response.status === 404) {
          const defaultConversation: AsciiConversation = {
            id: `ascii-default-${Date.now()}`,
            title: 'ASCII Chat',
            messages: [],
            lastMessageTime: undefined
          }
          set(asciiConversationsAtom, [defaultConversation])
          set(activeAsciiConversationIdAtom, defaultConversation.id)
          return
        }
        throw new Error('Failed to fetch ASCII conversations')
      }
      
      const data = await response.json()
      const conversations = data.map((conv: any) => ({
        id: conv.id,
        title: conv.title || conv.name || `ASCII Chat ${conv.id.substring(0, 8)}`,
        messages: [],
        lastMessageTime: conv.last_message_time
      }))
      
      set(asciiConversationsAtom, conversations)
      
      // Auto-select first conversation if none active
      const activeId = get(activeAsciiConversationIdAtom)
      if (!activeId && conversations.length > 0) {
        set(activeAsciiConversationIdAtom, conversations[0].id)
        set(loadAsciiMessagesAtom, conversations[0].id)
      }
    } catch (error) {
      console.error('Error loading ASCII conversations:', error)
      // Create a default conversation if API fails completely
      const defaultConversation: AsciiConversation = {
        id: `ascii-fallback-${Date.now()}`,
        title: 'ASCII Chat',
        messages: [],
        lastMessageTime: undefined
      }
      set(asciiConversationsAtom, [defaultConversation])
      set(activeAsciiConversationIdAtom, defaultConversation.id)
      set(errorStatesAtom, prev => ({ 
        ...prev, 
        conversations: error instanceof Error ? error.message : 'Unknown error' 
      }))
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, conversations: false }))
    }
  }
)

// Load messages for specific ASCII conversation
export const loadAsciiMessagesAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    set(loadingStatesAtom, prev => ({ ...prev, messages: true }))
    set(errorStatesAtom, prev => ({ ...prev, messages: undefined }))
    
    try {
      const response = await fetch(`/api/ascii-conversations/${conversationId}/messages`)
      if (!response.ok) {
        if (response.status === 404) {
          // Conversation doesn't exist yet, start with empty messages
          set(asciiMessagesAtom, [])
          return
        }
        throw new Error('Failed to load ASCII messages')
      }
      
      const data = await response.json()
      const formattedMessages = data.messages.map((msg: any) => ({
        id: `${msg.role}-${Math.random().toString(36).substring(2, 9)}`,
        role: msg.role,
        content: msg.content
      }))
      
      set(asciiMessagesAtom, formattedMessages)
      
      // Load ASCII conversation configuration
      set(loadAsciiConversationConfigAtom, conversationId)
    } catch (error) {
      console.error('Error loading ASCII messages:', error)
      set(asciiMessagesAtom, [])
      set(errorStatesAtom, prev => ({ 
        ...prev, 
        messages: error instanceof Error ? error.message : 'Unknown error' 
      }))
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, messages: false }))
    }
  }
)

// Load ASCII conversation configuration
export const loadAsciiConversationConfigAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    try {
      const response = await fetch(`/api/ascii-conversations/${conversationId}/config`)
      if (!response.ok) return // Config might not exist yet
      
      const data = await response.json()
      set(asciiConfigAtom, {
        // Chat configuration
        modelName: data.model_name || 'anthropic/claude-3.5-haiku',
        systemDirective: data.system_directive || `You are a helpful AI assistant. Respond to user questions and requests with accurate, helpful information. Be concise and clear in your responses.`,
        temperature: data.temperature ?? 0.7,
        // ASCII-specific configuration
        style: data.style || 'standard',
        width: data.width || 80,
        includeInstructions: data.include_instructions ?? true,
        outputFormat: data.output_format || 'plain',
        // ASCII tool configuration  
        toolWidth: data.tool_width || 80,
        toolHeight: data.tool_height || 24,
        toolPrompt: data.tool_prompt || `Analyze the conversation context provided and generate ASCII art that represents the main topic, concept, or theme being discussed. Create a visual representation using standard ASCII characters that fits within {width} characters wide and {height} lines tall.

Guidelines:
- Identify the key subject matter from the conversation context
- Use standard ASCII characters for maximum compatibility
- Create clear, recognizable shapes and forms that relate to the topic
- Keep the art within the specified dimensions: {width}x{height}
- Focus on the most distinctive visual elements of the subject
- Make the art visually appealing and thematically relevant

Context to analyze: {description}

Generate ASCII art that visually represents the main theme or concept from this conversation:`
      })
      set(asciiConfigChangedAtom, false)
    } catch (error) {
      console.error('Failed to load ASCII conversation config:', error)
    }
  }
)

// Create new ASCII conversation
export const createAsciiConversationAtom = atom(
  null,
  async (get, set) => {
    set(loadingStatesAtom, prev => ({ ...prev, creating: true }))
    
    try {
      const response = await fetch('/api/ascii-conversations/create', {
        method: 'POST'
      })
      
      let newConversation: AsciiConversation
      
      if (!response.ok) {
        // If API doesn't exist, create a local conversation
        newConversation = {
          id: `ascii-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: 'New ASCII Chat',
          messages: [],
          lastMessageTime: undefined
        }
      } else {
        const data = await response.json()
        newConversation = {
          id: data.conversation_id,
          title: 'New ASCII Chat',
          messages: [],
          lastMessageTime: undefined
        }
      }
      
      set(asciiConversationsAtom, prev => [...prev, newConversation])
      set(activeAsciiConversationIdAtom, newConversation.id)
      set(asciiMessagesAtom, [])
      
      return newConversation.id
    } catch (error) {
      console.error('Error creating ASCII conversation:', error)
      // Create local conversation as fallback
      const newConversation: AsciiConversation = {
        id: `ascii-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: 'New ASCII Chat',
        messages: [],
        lastMessageTime: undefined
      }
      
      set(asciiConversationsAtom, prev => [...prev, newConversation])
      set(activeAsciiConversationIdAtom, newConversation.id)
      set(asciiMessagesAtom, [])
      
      return newConversation.id
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, creating: false }))
    }
  }
)

// Delete ASCII conversation
export const deleteAsciiConversationAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    set(loadingStatesAtom, prev => ({ ...prev, deleting: true }))
    
    try {
      // Try to delete from API, but don't fail if API doesn't exist
      try {
        const response = await fetch(`/api/ascii-conversations/${conversationId}`, {
          method: 'DELETE'
        })
        if (!response.ok && response.status !== 404) {
          console.warn('Failed to delete ASCII conversation from API')
        }
      } catch (error) {
        console.warn('API not available for deleting ASCII conversation')
      }
      
      const conversations = get(asciiConversationsAtom)
      const updatedConversations = conversations.filter(c => c.id !== conversationId)
      set(asciiConversationsAtom, updatedConversations)
      
      // Handle active conversation deletion
      const activeId = get(activeAsciiConversationIdAtom)
      if (activeId === conversationId) {
        if (updatedConversations.length > 0) {
          const newActiveId = updatedConversations[0].id
          set(activeAsciiConversationIdAtom, newActiveId)
          set(loadAsciiMessagesAtom, newActiveId)
        } else {
          set(activeAsciiConversationIdAtom, null)
          set(asciiMessagesAtom, [])
        }
      }
    } catch (error) {
      console.error('Error deleting ASCII conversation:', error)
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, deleting: false }))
    }
  }
)

// Save ASCII conversation configuration
export const saveAsciiConfigurationAtom = atom(
  null,
  async (get, set) => {
    const activeId = get(activeAsciiConversationIdAtom)
    if (!activeId) throw new Error('No active ASCII conversation')
    
    const config = get(asciiConfigAtom)
    set(loadingStatesAtom, prev => ({ ...prev, saving: true }))
    
    try {
      const response = await fetch('/api/ascii-conversations/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeId,
          // Chat configuration
          model_name: config.modelName,
          system_directive: config.systemDirective || null,
          temperature: Math.min(2, Math.max(0, config.temperature)),
          // ASCII-specific configuration
          style: config.style,
          width: config.width,
          include_instructions: config.includeInstructions,
          output_format: config.outputFormat,
          // ASCII tool configuration
          tool_width: config.toolWidth,
          tool_height: config.toolHeight,
          tool_prompt: config.toolPrompt || null
        })
      })
      
      if (!response.ok) throw new Error('Failed to save ASCII configuration')
      
      set(asciiConfigChangedAtom, false)
      // Reload config to ensure sync
      set(loadAsciiConversationConfigAtom, activeId)
    } catch (error) {
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, saving: false }))
    }
  }
)

// Update ASCII messages (for useChat integration)
export const updateAsciiMessagesAtom = atom(
  null,
  (get, set, newMessages: any[]) => {
    set(asciiMessagesAtom, newMessages)
    
    // Update conversation messages in the conversations list
    const activeId = get(activeAsciiConversationIdAtom)
    if (activeId) {
      set(asciiConversationsAtom, prev => prev.map(conv => 
        conv.id === activeId ? { ...conv, messages: newMessages } : conv
      ))
    }
  }
) 