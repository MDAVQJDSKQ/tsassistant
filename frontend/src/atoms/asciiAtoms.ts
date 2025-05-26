import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { Message } from '@ai-sdk/react'

export interface AsciiConfig {
  // Chat configuration fields (same as regular chat)
  modelName: string
  systemDirective: string
  temperature: number
  // ASCII tool configuration
  toolWidth: number
  toolHeight: number
  toolPrompt: string
  // ASCII-specific fields (legacy, keeping for compatibility)
  style: 'standard' | 'block' | 'shadow' | 'slant' | 'small'
  width: number
  includeInstructions: boolean
  outputFormat: 'plain' | 'html' | 'markdown'
}

export interface AsciiConversation {
  id: string
  title: string
  messages: Message[]
  lastMessageTime?: number
}

// ASCII-specific conversation management (separate from regular chat)
export const asciiConversationsAtom = atom<AsciiConversation[]>([])
export const activeAsciiConversationIdAtom = atom<string | null>(null)
export const asciiMessagesAtom = atom<Message[]>([])

// ASCII configuration
export const asciiConfigAtom = atom<AsciiConfig>({
  // Chat configuration defaults
  modelName: 'anthropic/claude-3.5-haiku',
  systemDirective: `You are a helpful AI assistant. Respond to user questions and requests with accurate, helpful information. Be concise and clear in your responses.`,
  temperature: 0.7,
  // ASCII-specific defaults
  style: 'standard',
  width: 80,
  includeInstructions: true,
  outputFormat: 'plain',
  // ASCII tool configuration
  toolWidth: 80,
  toolHeight: 24,
  toolPrompt: `Analyze the conversation context provided and generate ASCII art that represents the main topic, concept, or theme being discussed. Create a visual representation using standard ASCII characters that fits within {width} characters wide and {height} lines tall.

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

// ASCII configuration change tracking
export const asciiConfigChangedAtom = atom(false)

// ASCII generation settings (persistent)
export const asciiStyleAtom = atomWithStorage('asciiStyle', 'standard')
export const asciiWidthAtom = atomWithStorage('asciiWidth', 80)
export const asciiFormatAtom = atomWithStorage('asciiFormat', 'plain')

// Derived atoms for ASCII conversations
export const activeAsciiConversationAtom = atom(
  (get) => {
    const conversations = get(asciiConversationsAtom)
    const activeId = get(activeAsciiConversationIdAtom)
    return conversations.find(c => c.id === activeId) || null
  }
)

export const canSendAsciiMessageAtom = atom(
  (get) => {
    const activeId = get(activeAsciiConversationIdAtom)
    return activeId !== null
  }
) 