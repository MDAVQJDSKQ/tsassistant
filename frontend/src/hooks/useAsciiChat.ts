'use client'

import { useAtom, useSetAtom } from 'jotai'
import { useChat } from '@ai-sdk/react'
import { useEffect, useRef } from 'react'
import { 
  activeAsciiConversationIdAtom, 
  asciiMessagesAtom, 
  asciiConfigAtom,
  updateAsciiMessagesAtom,
  canSendAsciiMessageAtom
} from '@/atoms'

export function useAsciiChat() {
  const [activeConversationId] = useAtom(activeAsciiConversationIdAtom)
  const [messagesFromAtom] = useAtom(asciiMessagesAtom)
  const [config] = useAtom(asciiConfigAtom)
  const [canSendMessage] = useAtom(canSendAsciiMessageAtom)
  const updateMessagesInAtom = useSetAtom(updateAsciiMessagesAtom)
  
  const chat = useChat({
    id: activeConversationId || undefined,
    initialMessages: messagesFromAtom,
    api: '/api/ascii/chat',
    body: {
      conversation_id: activeConversationId,
      model_name: config.modelName,
      system_directive: config.systemDirective,
      temperature: config.temperature,
      tool_width: config.toolWidth,
      tool_height: config.toolHeight,
    },
    streamProtocol: 'text',
    onFinish: (message) => {
      console.log('ASCII response received:', message.content)
    },
    onError: (err) => {
      console.error('ASCII chat error:', err)
    }
  })

  // Sync useChat messages back to Jotai state when they change
  useEffect(() => {
    if (activeConversationId === chat.id) {
        updateMessagesInAtom(chat.messages)
    }
  }, [chat.messages, updateMessagesInAtom, activeConversationId, chat.id])

  // This effect is to explicitly load messages into useChat when the ID changes
  // AND the messages in the atom have potentially been updated by useAsciiConversationManagement
  useEffect(() => {
    if (activeConversationId && activeConversationId !== chat.id) {
      console.log(`[useAsciiChat] activeConversationId (${activeConversationId}) changed. chat.id is ${chat.id}. Reloading messages for useChat.`);
      chat.reload();
    } else if (!activeConversationId && chat.messages.length > 0) {
      chat.setMessages([]);
    }
  }, [activeConversationId, messagesFromAtom, chat]);

  return {
    ...chat,
    canSendMessage
  }
} 