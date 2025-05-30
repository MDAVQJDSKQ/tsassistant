"use client"

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ConversationSidebar } from '@/components/Chat/ConversationSidebar'
import { ChatDisplay } from '@/components/Chat/ChatDisplay'
import { ChatInput } from '@/components/Chat/ChatInput'
import { ConfigPanel } from '@/components/Chat/ConfigPanel'
import { ResizableLayout } from '@/components/Chat/ResizableLayout'
import { useConversationManagement, useChatWithJotai } from '@/hooks'
import { currentPageContextAtom } from '@/atoms'

export default function ChatPage() {
  const setPageContext = useSetAtom(currentPageContextAtom)
  
  // Set page context to chat when this page loads
  useEffect(() => {
    setPageContext('chat')
  }, [setPageContext])

  const {
    conversations,
    activeConversationId,
    handleSelectConversation,
    handleCreateConversation,
    handleDeleteConversation,
    refreshConversations
  } = useConversationManagement()

  const chat = useChatWithJotai()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full max-w-full bg-background overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          activeConversation={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onCreateNewConversation={handleCreateConversation}
          onDeleteConversation={handleDeleteConversation}
          onRefreshConversations={refreshConversations}
        />

        <ResizableLayout>
          <ChatDisplay 
            messages={chat.messages} 
            isLoading={chat.isLoading} 
          />
          <ChatInput
            input={chat.input}
            handleInputChange={chat.handleInputChange}
            handleSubmit={chat.handleSubmit}
            isLoading={chat.isLoading}
            isConversationActive={chat.canSendMessage}
          />
          <ConfigPanel />
        </ResizableLayout>
      </div>
    </SidebarProvider>
  )
} 