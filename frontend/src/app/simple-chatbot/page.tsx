"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useChat, type Message } from "@ai-sdk/react"
import { Send, Trash2 } from "lucide-react"
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
import { ConversationSidebar } from "@/components/Chat/ConversationSidebar"
import { ChatDisplay } from "@/components/Chat/ChatDisplay"
import { ChatInput } from "@/components/Chat/ChatInput"
import { ConfigPanel } from "@/components/Chat/ConfigPanel"
import { SettingsMenu } from "@/components/Settings/SettingsMenu"

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

  // Add settings state
  const [backendModel, setBackendModel] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  
  // Add resize state
  const [chatPanelWidth, setChatPanelWidth] = useState(50); // 50% initial width
  const [isResizing, setIsResizing] = useState(false);

  const loadConversationConfig = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/conversations/${id}/config`);
      const data = await res.json();
      setModelName(data.model_name || "anthropic/claude-3.5-haiku");
      setSystemDirective(data.system_directive || "");
      setTemperature(data.temperature ?? 0.7);
      setConfigChanged(false);
    } catch (err) {
      console.error("CFG load failed", err);
    }
  }, []);

  const [modelName,       setModelName]       = useState("anthropic/claude-3.5-haiku");
  const [systemDirective, setSystemDirective] = useState("");
  const [temperature,     setTemperature]     = useState(0.7);
  const [configChanged,   setConfigChanged]   = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.backendModel) setBackendModel(settings.backendModel);
        if (settings.apiKey) setApiKey(settings.apiKey);
      } catch (err) {
        console.error("Error loading settings from localStorage:", err);
      }
    }
  }, []);

  // Function to handle saving settings
  const handleSaveSettings = useCallback((settings: { backendModel: string; apiKey: string }) => {
    setBackendModel(settings.backendModel);
    setApiKey(settings.apiKey);
    
    // Save to localStorage
    localStorage.setItem('chatSettings', JSON.stringify({
      backendModel: settings.backendModel,
      apiKey: settings.apiKey
    }));

    // Send to backend
    fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        backend_model: settings.backendModel,
        api_key: settings.apiKey
      })
    }).then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`Failed to save settings: ${text}`);
        });
      }
      console.log("Settings saved successfully");
    }).catch(err => {
      console.error("Error saving settings to backend:", err);
      alert(`Error saving settings: ${err.message}`);
    });
  }, []);

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
      conversation_id: activeConversation,
      model_name: modelName,
      system_directive: systemDirective,
      temperature: temperature,
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
            
            // Only load from URL if active conversation isn't already set to that ID
            if (urlConversationId && urlConversationId !== activeConversation) {
              // If URL has a conversation ID, load that specific one
              setActiveConversation(urlConversationId)
              loadConversationMessages(urlConversationId)
            } else if (loadedConversations.length > 0 && !activeConversation) {
              // Otherwise, load the first conversation if available
              const firstConversationId = loadedConversations[0].id
              setActiveConversation(firstConversationId)
              loadConversationMessages(firstConversationId)
              
              // Update URL to match
              if (searchParams.get('conv') !== firstConversationId) {
                router.push(`?conv=${firstConversationId}`, { scroll: false })
              }
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
      
      // Prevent duplicate updates by checking if this conversation already exists
      if (!conversations.some(conv => conv.id === newId)) {
        // For new conversations with no messages, show "New Conversation" 
        setConversations((prev) => [...prev, { id: newId, title: "New Conversation", messages: [] }])
      }
      
      // Only update active conversation if it's different
      if (activeConversation !== newId) {
        setActiveConversation(newId)
        setMessages([]) // Clear messages for the new chat
        
        // Update URL to match, but only if it's different
        const currentUrlId = searchParams.get('conv')
        if (currentUrlId !== newId) {
          router.push(`?conv=${newId}`, { scroll: false })
        }
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const handleSelectConversation = (id: string) => {
    // Only update if selecting a different conversation
    if (id !== activeConversation) {
      setActiveConversation(id);
      loadConversationMessages(id);
      
      // Only update URL if it's different
      if (searchParams.get('conv') !== id) {
        router.push(`?conv=${id}`, { scroll: false });
      }
    }
  };

  const handleDeleteConversation = async (idToDelete: string) => {
    try {
      // Call the backend API to delete conversation
      const response = await fetch(`/api/conversations/${idToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete conversation" }));
        throw new Error(errorData.message || `Failed to delete conversation: ${response.statusText}`);
      }

      console.log(`Conversation ${idToDelete} deleted successfully`);
      
      // Remove from state
      setConversations((prevConversations) => 
        prevConversations.filter((conv) => conv.id !== idToDelete)
      );

      // Handle case where active conversation is deleted
      if (activeConversation === idToDelete) {
        const remainingConversations = conversations.filter((conv) => conv.id !== idToDelete);
        if (remainingConversations.length > 0) {
          // Select first remaining conversation
          const newActiveId = remainingConversations[0].id;
          setActiveConversation(newActiveId);
          loadConversationMessages(newActiveId);
          
          // Only update URL if needed
          if (searchParams.get('conv') !== newActiveId) {
            router.push(`?conv=${newActiveId}`, { scroll: false });
          }
        } else {
          // No conversations left
          setActiveConversation(null);
          setMessages([]);
          
          // Only update URL if not already at base path
          if (searchParams.get('conv')) {
            router.push('/simple-chatbot', { scroll: false });
          }
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert(`Error deleting conversation: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

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

  useEffect(() => {
    if (activeConversation) loadConversationConfig(activeConversation);
  }, [activeConversation, loadConversationConfig]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    console.log('Resize start');
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    e.preventDefault(); // Prevent text selection
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Get container width
    const containerWidth = document.querySelector('.flex.flex-1.h-full.w-full')?.getBoundingClientRect().width || 1000;
    
    // Calculate new width percentage
    const newWidthPercent = (e.clientX / containerWidth) * 100;
    
    // Apply width constraints (30% - 70%)
    if (newWidthPercent >= 30 && newWidthPercent <= 70) {
      setChatPanelWidth(newWidthPercent);
      console.log('Resize move:', newWidthPercent);
    }
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    console.log('Resize end');
    setIsResizing(false);
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  // Remove the old resize useEffect
  // Add resize functionality between chat and config panels
  useEffect(() => {
    // Cleanup resize event listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  console.log("Render - messages:", messages)
  if (error) console.error("Render - error:", error)

  const applyConfiguration = async () => {
    if (!activeConversation) {
      alert("Please select or create a conversation first.");
      return;
    }

    try {
      const temp = Math.min(2, Math.max(0, parseFloat(String(temperature))));
      console.log("Sending configuration:", {
        conversation_id: activeConversation,
        model_name: modelName,
        system_directive: systemDirective || null,
        temperature: temp,
      });
      
      const response = await fetch("/api/conversations/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversation_id: activeConversation,
          model_name: modelName,
          system_directive: systemDirective || null,
          temperature: temp,
        })
      });

      if (response.ok) {
        setConfigChanged(false);
        await loadConversationConfig(activeConversation);
      } else {
        const errorText = await response.text();
        console.error("Failed to save configuration, status:", response.status, errorText);
        alert("Failed to save configuration: " + errorText);
      }
    } catch (err: any) {
      console.error("Error saving configuration:", err);
      alert("Error saving configuration: " + (err.message || String(err)));
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-background overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onCreateNewConversation={createNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Main container */}
        <div className="flex flex-1 h-full w-full">
          {/* Chat area wrapper */}
          <div 
            id="chat-panel" 
            className="flex flex-col h-full relative"
            style={{ width: `${chatPanelWidth}%` }}
          >
            <header className="border-b p-4 flex items-center justify-between">
              <div className="flex items-center">
                <SidebarTrigger className="mr-2 md:hidden" />
                <h1 className="text-xl font-bold">{conversations.find((c) => c.id === activeConversation)?.title || "Chat"}</h1>
              </div>
              
              {/* Add settings menu */}
              <SettingsMenu onSaveSettings={handleSaveSettings} />
            </header>

            <ChatDisplay messages={messages} isLoading={isLoading} />

            <ChatInput
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={onSubmit}
              isLoading={isLoading}
              isConversationActive={!!activeConversation}
            />
            
            {/* Resize handle - wider and with direct event handler */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-6 bg-border/30 cursor-col-resize hover:bg-primary/60 transition-colors duration-200 z-50"
              id="resize-handle"
              style={{ transform: 'translateX(3px)' }}
              onMouseDown={handleResizeStart}
            ></div>
          </div>

          <div 
            id="config-panel" 
            className="flex flex-col h-full border-l"
            style={{ width: `${100 - chatPanelWidth}%` }}
          >
            <ConfigPanel
              modelName={modelName}
              setModelName={(value) => { setModelName(value); setConfigChanged(true); }}
              systemDirective={systemDirective}
              setSystemDirective={(value) => { setSystemDirective(value); setConfigChanged(true); }}
              temperature={temperature}
              setTemperature={(value) => { setTemperature(value); setConfigChanged(true); }}
              configChanged={configChanged}
              applyConfiguration={applyConfiguration}
              isConversationActive={!!activeConversation}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
} 