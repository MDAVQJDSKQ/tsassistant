'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Sparkles, Wrench } from 'lucide-react'

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
  const [showToolCall, setShowToolCall] = useState(false)
  
  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "0"
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = scrollHeight + "px"
    }
  }, [input])

  // Check for ASCII keywords and show tool call indicator
  useEffect(() => {
    const asciiKeywords = ["draw", "create", "generate", "make", "ascii", "art", "picture", "image", "show me"]
    const hasAsciiKeyword = asciiKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    )
    setShowToolCall(hasAsciiKeyword && input.trim().length > 3)
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

  const quickPrompts = [
    "Convert 'HELLO' to ASCII art",
    "Create ASCII art of a cat",
    "Generate a decorative banner with my name",
    "Make ASCII art of a house"
  ]

  const insertQuickPrompt = (prompt: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.value = prompt
      handleInputChange({ target: textarea } as React.ChangeEvent<HTMLTextAreaElement>)
      textarea.focus()
    }
  }

  return (
    <div className="border-t p-4 space-y-3">
      {/* Tool Call Indicator */}
      {showToolCall && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800">
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-medium">TOOL CALL DETECTED</span>
          <span className="text-xs">ASCII Art Generator will be used</span>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => insertQuickPrompt(prompt)}
            className="text-xs h-7"
            disabled={isLoading || !isConversationActive}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {prompt}
          </Button>
        ))}
      </div>

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