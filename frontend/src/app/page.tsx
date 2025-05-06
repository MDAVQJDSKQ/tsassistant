"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useChat, type Message } from "@ai-sdk/react"
import { PlusCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "default", title: "New Conversation", messages: [] },
  ])
  const [activeConversation, setActiveConversation] = useState<string>("default")

  const getConversationTitle = useCallback((msgs: Message[]): string => {
    const firstUserMessage = msgs.find((m) => m.role === "user")?.content
    if (firstUserMessage) {
      return firstUserMessage.length > 20 ? `${firstUserMessage.substring(0, 20)}...` : firstUserMessage
    }
    return "New Conversation"
  }, [])

  const updateConversationMessages = useCallback(
    (newMessages: Message[]) => {
      console.log("Updating conversation messages:", newMessages)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation
            ? { ...conv, messages: newMessages, title: getConversationTitle(newMessages) }
            : conv,
        ),
      )
    },
    [activeConversation, getConversationTitle]
  )

  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    setMessages,
    isLoading,
    error
  } = useChat({
    id: activeConversation,
    initialMessages: conversations.find((c) => c.id === activeConversation)?.messages || [],
    api: "/api/chat",
    body: {
      conversation_id: activeConversation
    },
    streamProtocol: 'text',  // Add this to handle plain text streaming from Python backend
    onFinish: (message) => {
      console.log("AI response received:", message.content)
    },
    onError: (err) => {
      console.error("Chat error:", err)
    }
  })

  useEffect(() => {
    console.log("Messages changed:", messages)
    updateConversationMessages(messages)
  }, [messages, updateConversationMessages])

  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`
    setConversations((prev) => [...prev, { id: newId, title: "New Conversation", messages: [] }])
    setActiveConversation(newId)
    setMessages([])
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e)
  }

  console.log("Render - messages:", messages)
  if (error) console.error("Render - error:", error)

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button variant="ghost" size="icon" onClick={createNewConversation} title="New Conversation">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {conversations.map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    isActive={activeConversation === conv.id}
                    onClick={() => {
                      setActiveConversation(conv.id)
                      setMessages(conv.messages)
                    }}
                  >
                    {conv.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="px-3 py-2 text-xs text-muted-foreground">AI Chatbot v1.0</div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 h-full">
          <header className="border-b p-4 flex items-center">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-xl font-bold">{conversations.find((c) => c.id === activeConversation)?.title}</h1>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !isLoading ? (
                <div className="text-center py-20 text-muted-foreground">
                  <h3 className="text-lg font-medium">Start a new conversation</h3>
                  <p className="text-sm mt-1">Ask me anything!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80%] ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                    <div className="animate-pulse">AI is thinking...</div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 max-w-[80%] bg-red-100 text-red-800">
                    <strong>Error:</strong> {error.message || "Something went wrong"}
                  </div>
                </div>
              )}
            </div>
          </main>

          <footer className="border-t p-4">
            <form onSubmit={onSubmit} className="max-w-3xl mx-auto flex gap-2">
              <Input 
                value={input} 
                onChange={handleInputChange} 
                placeholder="Type your message..." 
                className="flex-1" 
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}
