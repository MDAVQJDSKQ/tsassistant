'use client'

import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface AsciiChatInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  isConversationActive: boolean
}

export function AsciiChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  isConversationActive,
}: AsciiChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "0"
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = scrollHeight + "px"
    }
  }, [input])

  // Handle key events for the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.shiftKey) {
      return
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      
      const form = e.currentTarget.form
      if (form && !isLoading && isConversationActive) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
      }
    }
  }

  return (
    <div className="border-t p-4 space-y-3">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isConversationActive 
                ? "Describe what ASCII art you'd like to generate..." 
                : "Create a new conversation to start generating ASCII art"
            }
            className="w-full min-h-[44px] max-h-32 p-3 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            disabled={isLoading || !isConversationActive}
            rows={1}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !input.trim() || !isConversationActive}
          className="h-11 px-4"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      
      <div className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}