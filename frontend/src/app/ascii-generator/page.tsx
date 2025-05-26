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
          <AsciiConfigPanel />
        </ResizableLayout>
      </div>
    </SidebarProvider>
  )
} 