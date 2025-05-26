import { atom } from 'jotai'
import { 
  conversationsAtom, 
  activeConversationIdAtom, 
  messagesAtom,
  chatConfigAtom,
  configChangedAtom 
} from './chatAtoms'
import { loadingStatesAtom, errorStatesAtom } from './uiAtoms'
import type { Message } from '@ai-sdk/react'

// API response types
interface ConversationResponse {
  id: string
  title?: string
  name?: string
  last_message_time?: number
}

interface MessageResponse {
  role: 'system' | 'user' | 'assistant' | 'data'
  content: string
}

interface MessagesResponse {
  messages: MessageResponse[]
}

// Load conversations from API
export const loadConversationsAtom = atom(
  null,
  async (get, set) => {
    set(loadingStatesAtom, prev => ({ ...prev, conversations: true }))
    set(errorStatesAtom, prev => ({ ...prev, conversations: undefined }))
    
    try {
      const response = await fetch('/api/conversations/list')
      if (!response.ok) throw new Error('Failed to fetch conversations')
      
      const data: ConversationResponse[] = await response.json()
      const conversations = data.map((conv) => ({
        id: conv.id,
        title: conv.title || conv.name || `Chat ${conv.id.substring(0, 8)}`,
        messages: [],
        lastMessageTime: conv.last_message_time
      }))
      
      set(conversationsAtom, conversations)
      
      // Auto-select first conversation if none active (but don't auto-load messages)
      const activeId = get(activeConversationIdAtom)
      if (!activeId && conversations.length > 0) {
        set(activeConversationIdAtom, conversations[0].id)
        // Remove automatic message loading to prevent loops
        // set(loadMessagesAtom, conversations[0].id)
      }
    } catch (error) {
      set(errorStatesAtom, prev => ({ 
        ...prev, 
        conversations: error instanceof Error ? error.message : 'Unknown error' 
      }))
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, conversations: false }))
    }
  }
)

// Load messages for specific conversation
export const loadMessagesAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    set(loadingStatesAtom, prev => ({ ...prev, messages: true }))
    set(errorStatesAtom, prev => ({ ...prev, messages: undefined }))
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!response.ok) throw new Error('Failed to load messages')
      
      const data: MessagesResponse = await response.json()
      const formattedMessages: Message[] = data.messages.map((msg) => ({
        id: `${msg.role}-${Math.random().toString(36).substring(2, 9)}`,
        role: msg.role,
        content: msg.content
      }))
      
      set(messagesAtom, formattedMessages)
      
      // Load conversation config
      set(loadConversationConfigAtom, conversationId)
    } catch (error) {
      set(errorStatesAtom, prev => ({ 
        ...prev, 
        messages: error instanceof Error ? error.message : 'Unknown error' 
      }))
      set(messagesAtom, [])
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, messages: false }))
    }
  }
)

// Load conversation configuration
export const loadConversationConfigAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/config`)
      if (!response.ok) return // Config might not exist yet
      
      const data = await response.json()
      set(chatConfigAtom, {
        modelName: data.model_name || 'anthropic/claude-3.5-haiku',
        systemDirective: data.system_directive || '',
        temperature: data.temperature ?? 0.7
      })
      set(configChangedAtom, false)
    } catch (error) {
      console.error('Failed to load conversation config:', error)
    }
  }
)

// Create new conversation
export const createConversationAtom = atom(
  null,
  async (get, set) => {
    set(loadingStatesAtom, prev => ({ ...prev, creating: true }))
    
    try {
      const response = await fetch('/api/conversations/create', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to create conversation')
      
      const data = await response.json()
      const newConversation = {
        id: data.conversation_id,
        title: 'New Conversation',
        messages: [],
        lastMessageTime: undefined
      }
      
      set(conversationsAtom, prev => [...prev, newConversation])
      set(activeConversationIdAtom, newConversation.id)
      set(messagesAtom, [])
      
      return newConversation.id
    } catch (error) {
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, creating: false }))
    }
  }
)

// Delete conversation
export const deleteConversationAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    set(loadingStatesAtom, prev => ({ ...prev, deleting: true }))
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete conversation')
      
      const conversations = get(conversationsAtom)
      const updatedConversations = conversations.filter(c => c.id !== conversationId)
      set(conversationsAtom, updatedConversations)
      
      // Handle active conversation deletion
      const activeId = get(activeConversationIdAtom)
      if (activeId === conversationId) {
        if (updatedConversations.length > 0) {
          const newActiveId = updatedConversations[0].id
          set(activeConversationIdAtom, newActiveId)
          set(loadMessagesAtom, newActiveId)
        } else {
          set(activeConversationIdAtom, null)
          set(messagesAtom, [])
        }
      }
    } catch (error) {
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, deleting: false }))
    }
  }
)

// Save conversation configuration
export const saveConfigurationAtom = atom(
  null,
  async (get, set) => {
    const activeId = get(activeConversationIdAtom)
    if (!activeId) throw new Error('No active conversation')
    
    const config = get(chatConfigAtom)
    set(loadingStatesAtom, prev => ({ ...prev, saving: true }))
    
    try {
      const response = await fetch('/api/conversations/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeId,
          model_name: config.modelName,
          system_directive: config.systemDirective || null,
          temperature: Math.min(2, Math.max(0, config.temperature))
        })
      })
      
      if (!response.ok) throw new Error('Failed to save configuration')
      
      set(configChangedAtom, false)
      // Reload config to ensure sync
      set(loadConversationConfigAtom, activeId)
    } catch (error) {
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, saving: false }))
    }
  }
)

// Generate conversation title
export const generateTitleAtom = atom(
  null,
  async (get, set, conversationId: string) => {
    set(loadingStatesAtom, prev => ({ ...prev, generating: true }))
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/generate-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Failed to generate title')
      
      const data = await response.json()
      if (data?.title) {
        // Update local conversation list
        set(conversationsAtom, prev => prev.map(conv => 
          conv.id === conversationId ? { ...conv, title: data.title } : conv
        ))
        
        // Also refresh the conversation list from backend to ensure consistency
        setTimeout(() => {
          set(loadConversationsAtom)
        }, 500)
        
        return data.title
      }
    } catch (error) {
      console.error('Error generating title:', error)
      throw error
    } finally {
      set(loadingStatesAtom, prev => ({ ...prev, generating: false }))
    }
  }
)

// Update messages (for useChat integration)
export const updateMessagesAtom = atom(
  null,
  (get, set, newMessages: Message[]) => {
    set(messagesAtom, newMessages)
    
    // Update conversation messages in the conversations list
    const activeId = get(activeConversationIdAtom)
    if (activeId) {
      set(conversationsAtom, prev => prev.map(conv => 
        conv.id === activeId ? { ...conv, messages: newMessages } : conv
      ))
      
      // Auto-generate title after 2-4 messages if conversation still has default title
      const currentConversation = get(conversationsAtom).find(c => c.id === activeId)
      const shouldGenerateTitle = (
        newMessages.length >= 2 && // At least 2 messages (user + assistant)
        newMessages.length <= 6 && // Don't keep regenerating for long conversations
        currentConversation &&
        (currentConversation.title === 'New Conversation' || 
         currentConversation.title.startsWith('Chat ') ||
         !currentConversation.title ||
         currentConversation.title.length < 10) // Very short/generic titles
      )
      
      if (shouldGenerateTitle) {
        // Trigger title generation asynchronously (don't await to avoid blocking)
        setTimeout(() => {
          set(generateTitleAtom, activeId)
        }, 1000) // Small delay to ensure message is saved to backend first
      }
    }
  }
) 