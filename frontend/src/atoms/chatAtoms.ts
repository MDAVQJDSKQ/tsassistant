import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Message } from '@ai-sdk/react'

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastMessageTime?: number
}

export interface ChatConfig {
  modelName: string
  systemDirective: string
  temperature: number
}

// Core chat state
export const conversationsAtom = atom<Conversation[]>([])
export const activeConversationIdAtom = atom<string | null>(null)
export const messagesAtom = atom<Message[]>([])

// Chat configuration
export const chatConfigAtom = atom<ChatConfig>({
  modelName: 'anthropic/claude-3.5-haiku',
  systemDirective: '',
  temperature: 0.7
})

// Configuration change tracking
export const configChangedAtom = atom(false)

// Derived atoms
export const activeConversationAtom = atom(
  (get) => {
    const conversations = get(conversationsAtom)
    const activeId = get(activeConversationIdAtom)
    return conversations.find(c => c.id === activeId) || null
  }
)

export const canSendMessageAtom = atom(
  (get) => {
    const activeId = get(activeConversationIdAtom)
    return activeId !== null
  }
)

// Chat panel width (persistent)
export const chatPanelWidthAtom = atomWithStorage('chatPanelWidth', 70) 