"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useChat, type Message } from "@ai-sdk/react"
import { PlusCircle, Send } from "lucide-react"
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [conversations, setConversations] = useState<Conversation[]>([]) // Initialize with empty array
  const [activeConversation, setActiveConversation] = useState<string | null>(null) // Initialize with null
  const router = useRouter()
  const searchParams = useSearchParams()

  const getConversationTitle = useCallback((msgs: Message[], conversationId: string): string => {
    // Check if this is an existing conversation with no messages (just show the ID)
    if (msgs.length === 0) {
      // This is a conversation with no messages, show ID prefix
      return conversationId.substring(0, 8);
    }
    
    // For conversations with messages, use first message content if available
    const firstUserMessage = msgs.find((m) => m.role === "user")?.content
    if (firstUserMessage) {
      return firstUserMessage.length > 20 ? `${firstUserMessage.substring(0, 20)}...` : firstUserMessage
    }
    
    // Fallback for new conversations or edge cases
    return "New Conversation"
  }, [])

  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    setMessages,
    isLoading,
    error
  } = useChat({
    id: activeConversation || undefined, // Pass undefined if activeConversation is null
    initialMessages: conversations.find((c) => c.id === activeConversation)?.messages || [],
    api: "/api/chat",
    body: {
      // Only send conversation_id if it's not null
      ...(activeConversation && { conversation_id: activeConversation })
    },
    streamProtocol: 'text',
    onFinish: (message) => {
      console.log("AI response received:", message.content)
    },
    onError: (err) => {
      console.error("Chat error:", err)
    }
  })

  const updateConversationMessages = useCallback(
    (newMessages: Message[]) => {
      console.log("Updating conversation messages:", newMessages)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation
            ? { ...conv, messages: newMessages, title: getConversationTitle(newMessages, conv.id) }
            : conv,
        ),
      )
    },
    [activeConversation, getConversationTitle]
  )

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      console.log(`Loading messages for conversation: ${conversationId}`)
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data && data.messages) {
        // Format messages for our UI
        const formattedMessages = data.messages.map((msg: any) => ({
          id: `${msg.role}-${Math.random().toString(36).substring(2, 9)}`,
          role: msg.role,
          content: msg.content
        }))
        
        console.log("Loaded formatted messages:", formattedMessages)
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error)
      // If we fail to load messages, at least show an empty conversation
      setMessages([])
    }
  }, [setMessages])

  // Add this useEffect to fetch conversations on component mount
  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch('/api/conversations/list')
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) { // Check if data exists and has items
            // Map backend conversation format to frontend format
            const loadedConversations = data.map((conv: { id: string; name?: string }) => ({
              id: conv.id,
              title: conv.name || "Chat " + conv.id.substring(0, 8), // Changed title slightly
              messages: [] // Messages will be loaded by useChat when conversation becomes active
            }))
            setConversations(loadedConversations)
            
            // Check if a conversation ID is in the URL
            const urlConversationId = searchParams.get('conv')
            
            if (urlConversationId) {
              // If URL has a conversation ID, load that specific one
              setActiveConversation(urlConversationId)
              loadConversationMessages(urlConversationId)
            } else if (loadedConversations.length > 0 && !activeConversation) {
              // Otherwise, load the first conversation if available
              const firstConversationId = loadedConversations[0].id
              setActiveConversation(firstConversationId)
              loadConversationMessages(firstConversationId)
              
              // Update URL to match
              router.push(`?conv=${firstConversationId}`, { scroll: false })
            }
          } else {
            // No conversations on backend, or empty list.
            // User will need to create a new one. activeConversation remains null.
            setConversations([]) // Ensure it's empty
            console.log("No conversations found on backend. User should create a new chat.")
          }
        } else {
          console.error("Failed to fetch conversations list, status:", response.status)
        }
      } catch (error) {
        console.error("Error fetching conversations:", error)
      }
    }
    
    fetchConversations()
  }, [searchParams, router, loadConversationMessages, activeConversation])

  const createNewConversation = async () => {
    try {
      // Call the backend to create a new conversation with UUID
      const response = await fetch('/api/conversations/create', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to create new conversation')
      }
      
      const data = await response.json()
      const newId = data.conversation_id
      
      // For new conversations with no messages, show "New Conversation" 
      setConversations((prev) => [...prev, { id: newId, title: "New Conversation", messages: [] }])
      setActiveConversation(newId)
      setMessages([]) // Clear messages for the new chat
      
      // Update URL to match
      router.push(`?conv=${newId}`, { scroll: false })
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!activeConversation) {
      console.error("No active conversation. Cannot send message.");
      // Optionally, provide user feedback, e.g., alert or a toast notification
      alert("Please select or create a new conversation to start chatting.");
      return;
    }
    handleSubmit(e)
  }

  useEffect(() => {
    console.log("Messages changed:", messages)
    updateConversationMessages(messages)
  }, [messages, updateConversationMessages])

  // Add resize functionality between chat and config panels
  useEffect(() => {
    const chatPanel = document.querySelector('div.flex.flex-col.flex-grow.h-full.w-1\\/2.relative');
    const configPanel = document.querySelector('div.flex.flex-col.h-full.border-l.w-1\\/2');
    const resizeHandle = document.getElementById('resize-handle');
    
    if (!chatPanel || !configPanel || !resizeHandle) return;
    
    let isResizing = false;
    let startX = 0;
    let startChatWidth = 0;
    let startConfigWidth = 0;
    
    const handleMouseDown = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startChatWidth = chatPanel.getBoundingClientRect().width;
      startConfigWidth = configPanel.getBoundingClientRect().width;
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const containerWidth = chatPanel.parentElement!.getBoundingClientRect().width;
      const deltaX = e.clientX - startX;
      
      // Calculate new widths as percentages
      const newChatWidthPercent = ((startChatWidth + deltaX) / containerWidth) * 100;
      const newConfigWidthPercent = 100 - newChatWidthPercent;
      
      // Apply constraints (30% - 70%)
      if (newChatWidthPercent >= 30 && newChatWidthPercent <= 70) {
        (chatPanel as HTMLElement).style.width = `${newChatWidthPercent}%`;
        (configPanel as HTMLElement).style.width = `${newConfigWidthPercent}%`;
      }
    };
    
    const handleMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
    
    resizeHandle.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      resizeHandle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  console.log("Render - messages:", messages)
  if (error) console.error("Render - error:", error)

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-background overflow-hidden">
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
                      
                      // Load conversation messages when switching conversations
                      loadConversationMessages(conv.id)
                      
                      // Update URL to match
                      router.push(`?conv=${conv.id}`, { scroll: false })
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

        {/* Main container - modified to fill all available space */}
        <div className="flex flex-1 h-full w-full">
          {/* Chat area wrapper */}
          <div className="flex flex-col h-full w-1/2 relative">
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
                        {/* Added className for styling newlines */}
                        <div className="message-content-display">{message.content}</div>
                      </div>
                    </div>
                  ))
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
            
            {/* Resize handle */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-border cursor-col-resize hover:bg-primary/50 transition-colors duration-200" 
                 id="resize-handle"></div>
          </div>

          {/* Config panel */}
          <div className="flex flex-col h-full border-l w-1/2">
            <header className="border-b p-4">
              <h2 className="text-lg font-semibold">Config</h2>
            </header>
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Model Selection</h3>
                  <select className="w-full p-2 border rounded bg-background">
                    <option>GPT-4</option>
                    <option>GPT-3.5 Turbo</option>
                    <option>Claude 3</option>
                  </select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">System Directive</h3>
                  <textarea 
                    className="w-full h-40 p-2 border rounded bg-background resize-none" 
                    placeholder="Enter system instructions for the AI..."
                  ></textarea>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Temperature</h3>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Precise</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>
                
                <Button className="w-full">Apply Configuration</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
