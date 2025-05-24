'use client'

import { useAtom } from 'jotai'
import { useChat } from '@ai-sdk/react'
import { 
  activeConversationIdAtom, 
  messagesAtom, 
  chatConfigAtom
} from '@/atoms'

export function useChatWithJotai() {
  const [activeConversationId] = useAtom(activeConversationIdAtom)
  const [messages] = useAtom(messagesAtom)
  const [config] = useAtom(chatConfigAtom)

  const chat = useChat({
    id: activeConversationId || undefined,
    initialMessages: messages,
    api: '/api/chat',
    body: {
      conversation_id: activeConversationId,
      model_name: config.modelName,
      system_directive: config.systemDirective,
      temperature: config.temperature,
    },
    streamProtocol: 'text',
    onFinish: (message) => {
      console.log('AI response received:', message.content)
    },
    onError: (err) => {
      console.error('Chat error:', err)
    }
  })

  return {
    ...chat,
    canSendMessage: !!activeConversationId
  }
} 