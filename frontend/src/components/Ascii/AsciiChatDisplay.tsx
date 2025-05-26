'use client'

import { useRef, useEffect } from 'react'
import type { Message } from '@ai-sdk/react'

interface AsciiChatDisplayProps {
  messages: Message[]
  isLoading: boolean
}

export function AsciiChatDisplay({ messages, isLoading }: AsciiChatDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <h3 className="text-lg font-medium">ASCII Art Generator</h3>
            <p className="text-sm mt-1">Start a conversation or generate ASCII art!</p>
            <div className="text-xs space-y-1 mt-4">
              <p>• Chat normally with the AI assistant</p>
              <p>• Ask for ASCII art: "draw a cat", "create a house"</p>
              <p>• Use the tool panel to generate from conversation context</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="message-content-display whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </main>
  )
} 