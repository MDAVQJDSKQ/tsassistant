"use client"

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ConversationSidebar } from '@/components/Chat/ConversationSidebar'
import { AsciiChatDisplay } from '@/components/Ascii/AsciiChatDisplay'
import { AsciiChatInput } from '@/components/Ascii/AsciiChatInput'
import { AsciiConfigPanel } from '@/components/Ascii/AsciiConfigPanel'
import { ResizableLayout } from '@/components/Chat/ResizableLayout'
import { useAsciiConversationManagement, useAsciiChat } from '@/hooks'
import { currentPageContextAtom } from '@/atoms'

export default function AsciiGeneratorPage() {
  const setPageContext = useSetAtom(currentPageContextAtom)
  
  // Set page context to ASCII when this page loads
  useEffect(() => {
    setPageContext('ascii')
    
    // Clean up when leaving the page
    return () => {
      setPageContext('chat')
    }
  }, [setPageContext])

  const {
    conversations,
    activeConversationId,
    handleSelectConversation,
    handleCreateConversation,
    handleDeleteConversation
  } = useAsciiConversationManagement()

  const asciiChat = useAsciiChat()

  const triggerAsciiGeneration = () => {
    if (asciiChat.canSendMessage) {
      const messageContent = "Generate ASCII art using the current conversation context and the configured tool dimensions."
      // The tool_width and tool_height are already part of the body sent by useAsciiChat
      // based on the current config.
      // We add 'tool_choice' in data as an explicit hint for the backend.
      asciiChat.append({
        id: crypto.randomUUID(),
        role: 'user',
        content: messageContent,
        data: { 
          tool_choice: 'ascii_art_generator_tool' 
        }
      })
    } else {
      console.warn("Cannot trigger ASCII generation: No active conversation or cannot send message.")
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full max-w-full bg-background overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          activeConversation={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onCreateNewConversation={handleCreateConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        <ResizableLayout>
          <AsciiChatDisplay 
            messages={asciiChat.messages} 
            isLoading={asciiChat.isLoading} 
          />
          <AsciiChatInput
            input={asciiChat.input}
            handleInputChange={asciiChat.handleInputChange}
            handleSubmit={asciiChat.handleSubmit}
            isLoading={asciiChat.isLoading}
            isConversationActive={asciiChat.canSendMessage}
          />
          <AsciiConfigPanel onGenerateClick={triggerAsciiGeneration} />
        </ResizableLayout>
      </div>
    </SidebarProvider>
  )
} 