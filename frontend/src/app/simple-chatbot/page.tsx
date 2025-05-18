"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
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
  lastMessageTime?: number
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]) // Initialize with empty array
  const [activeConversation, setActiveConversation] = useState<string | null>(null) // Initialize with null
  const router = useRouter()
  const searchParams = useSearchParams()

  // Add settings state
  const [backendModel, setBackendModel] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [titleGenerationPrompt, setTitleGenerationPrompt] = useState<string | undefined>(undefined);
  
  // Add resize state
  const [chatPanelWidth, setChatPanelWidth] = useState(70); // Default to 70% initial width
  const [isResizing, setIsResizing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

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
        setBackendModel(settings.centralModel || "openrouter"); // Ensure default
        if (settings.apiKey) setApiKey(settings.apiKey);
        if (settings.titleGenerationPrompt) setTitleGenerationPrompt(settings.titleGenerationPrompt);
      } catch (err) {
        console.error("Error loading settings from localStorage:", err);
      }
    } else {
      // If no saved settings, ensure defaults
      setBackendModel("openrouter");
      setTitleGenerationPrompt(undefined);
    }
  }, []);

  // Add a function to automatically generate a title for a conversation
  const generateConversationTitle = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    
    try {
      console.log(`Generating title for conversation: ${conversationId}`);
      const response = await fetch(`/api/conversations/${conversationId}/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate title: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.title) {
        // Update the conversation title in the local state
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, title: data.title } 
              : conv
          )
        );
        console.log(`Title generated successfully: ${data.title}`);
        return data.title;
      }
    } catch (error) {
      console.error("Error generating conversation title:", error);
    }
  }, []);

  // Function to handle saving settings
  const handleSaveSettings = useCallback((newSettings: { 
    centralModel: string;
    apiKey: string;
    titleGenerationPrompt?: string;
  }) => {
    const oldBackendModel = backendModel;
    const oldTitleGenPrompt = titleGenerationPrompt;

    console.log("[handleSaveSettings] Received newSettings:", newSettings);
    console.log("[handleSaveSettings] Current backendModel state:", backendModel);

    const modelToSave = newSettings.centralModel || backendModel; 
    console.log("[handleSaveSettings] Calculated modelToSave:", modelToSave);

    if (!modelToSave) {
        alert("Critical Frontend Error: Central model value is empty before sending. Please select a model. Defaulting to 'openrouter' for this save attempt.");
        console.error("[handleSaveSettings] CRITICAL: modelToSave is empty or undefined. newSettings.centralModel:", newSettings.centralModel, "Current backendModel:", backendModel);
        
        // Attempt to recover by forcing a default and updating state, then sending
        const recoveryModel = "openrouter";
        setBackendModel(recoveryModel); 
        setApiKey(newSettings.apiKey);
        setTitleGenerationPrompt(newSettings.titleGenerationPrompt);

        localStorage.setItem('chatSettings', JSON.stringify({
          centralModel: recoveryModel,
          apiKey: newSettings.apiKey,
          titleGenerationPrompt: newSettings.titleGenerationPrompt
        }));
        
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            centralModel: recoveryModel, // Hardcoded default for safety
            apiKey: newSettings.apiKey,
            titleGenerationPrompt: newSettings.titleGenerationPrompt
          })
        }).then(response => {
          if (!response.ok) {
            return response.text().then(text => { throw new Error(`Failed to save settings (with forced recovery default): ${text}`); });
          }
          console.log("Settings saved successfully (with forced recovery default model).");
        }).catch(err => {
          console.error("Error saving settings to backend (with forced recovery default):", err);
          alert(`Error saving settings: ${err.message}`);
        });
        return; // Exit after recovery attempt
    }
    
    // If modelToSave is valid, proceed as normal
    setBackendModel(modelToSave);
    setApiKey(newSettings.apiKey);
    setTitleGenerationPrompt(newSettings.titleGenerationPrompt);
    
    const settingsToStore = {
      centralModel: modelToSave,
      apiKey: newSettings.apiKey,
      titleGenerationPrompt: newSettings.titleGenerationPrompt
    };
    localStorage.setItem('chatSettings', JSON.stringify(settingsToStore));

    console.log("[handleSaveSettings] Sending to /api/settings with body:", {
        centralModel: modelToSave,
        apiKey: newSettings.apiKey,
        titleGenerationPrompt: newSettings.titleGenerationPrompt
    });

    // Send to backend
    fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        centralModel: modelToSave,
        apiKey: newSettings.apiKey,
        titleGenerationPrompt: newSettings.titleGenerationPrompt
      })
    }).then(async response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`Failed to save settings: ${text}`);
        });
      }
      console.log("Settings saved successfully");

      console.log("[handleSaveSettings] Checking for title regeneration conditions...");
      console.log("[handleSaveSettings] Old backendModel:", oldBackendModel, "New modelToSave:", modelToSave);
      console.log("[handleSaveSettings] Old titleGenerationPrompt:", oldTitleGenPrompt, "New newSettings.titleGenerationPrompt:", newSettings.titleGenerationPrompt);

      const modelChanged = oldBackendModel !== modelToSave;
      const promptChanged = oldTitleGenPrompt !== newSettings.titleGenerationPrompt;

      console.log("[handleSaveSettings] modelChanged:", modelChanged, "promptChanged:", promptChanged);

      if (modelChanged || promptChanged) {
        console.log("[handleSaveSettings] Relevant settings changed. Regenerating all conversation titles.");
        const currentConversations = [...conversations]; // Use a stable copy
        for (const conv of currentConversations) {
          if (conv.id) { // Regenerate for any conversation with an ID
            console.log(`[handleSaveSettings] Requesting title regeneration for conversation: ${conv.id}`);
            await generateConversationTitle(conv.id);
          }
        }
        console.log("[handleSaveSettings] Finished regenerating titles.");
      }

    }).catch(err => {
      console.error("Error saving settings to backend:", err);
      alert(`Error saving settings: ${err.message}`);
    });
  }, [backendModel, apiKey, titleGenerationPrompt, conversations, generateConversationTitle, setBackendModel, setApiKey, setTitleGenerationPrompt]);

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
            ? (() => {
                const currentTitle = conv.title;
                // Default placeholders are "New Conversation" or a title derived from the conversation ID (first 8 chars).
                // Also consider an empty or null title as a placeholder.
                const isDefaultPlaceholder =
                  !currentTitle ||
                  currentTitle === "New Conversation" ||
                  currentTitle === conv.id.substring(0, 8);

                let newTitle = currentTitle;
                if (isDefaultPlaceholder) {
                  // If the current title is a placeholder, generate a new one based on messages.
                  // If newMessages is empty, getConversationTitle will provide a suitable default (e.g., UUID prefix).
                  newTitle = getConversationTitle(newMessages, conv.id);
                }
                // Otherwise, retain the existing (potentially AI-generated or user-set) title.
                return { ...conv, messages: newMessages, title: newTitle };
              })()
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
        console.log("Fetching conversations from API...");
        const response = await fetch('/api/conversations/list')
        if (response.ok) {
          const data = await response.json()
          console.log("API Response:", data);
          
          if (data && data.length > 0) { // Check if data exists and has items
            console.log("Got conversations from API:", data);
            // Map backend conversation format to frontend format, handle all fields from backend
            const loadedConversations = data.map((conv: { id: string; name?: string; title?: string; last_message_time?: number }) => ({
              id: conv.id,
              // Prioritize title from config, then fallback to name or ID
              title: conv.title || conv.name || "Chat " + conv.id.substring(0, 8),
              messages: [], // Messages will be loaded by useChat when conversation becomes active
              lastMessageTime: conv.last_message_time // Store the timestamp for potential use
            }))
            
            console.log("Mapped conversations:", loadedConversations);
            setConversations(loadedConversations)
            
            // Check if a conversation ID is in the URL
            const urlConversationId = searchParams.get('conv')
            console.log("URL conversation ID:", urlConversationId);
            
            // Only load from URL if active conversation isn't already set to that ID
            if (urlConversationId && urlConversationId !== activeConversation) {
              console.log("Loading conversation from URL:", urlConversationId);
              // If URL has a conversation ID, load that specific one
              setActiveConversation(urlConversationId)
              loadConversationMessages(urlConversationId)
            } else if (loadedConversations.length > 0 && !activeConversation) {
              // Otherwise, load the first conversation if available
              const firstConversationId = loadedConversations[0].id
              console.log("Loading first conversation:", firstConversationId);
              setActiveConversation(firstConversationId)
              loadConversationMessages(firstConversationId)
              
              // Update URL to match
              if (searchParams.get('conv') !== firstConversationId) {
                router.push(`?conv=${firstConversationId}`, { scroll: false })
              }
            }
          } else {
            // No conversations on backend, or empty list.
            console.log("No conversations found, or empty data from API");
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
        setConversations((prev) => [...prev, { id: newId, title: "New Conversation", messages: [], lastMessageTime: undefined }])
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
    e.preventDefault(); // Prevent text selection
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !mainContentRef.current) return;
    
    const containerRect = mainContentRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const newWidthPercent = (relativeX / containerRect.width) * 100;
    
    // Apply constraints (min 30%, max 90%)
    if (newWidthPercent >= 30 && newWidthPercent <= 90) {
      setChatPanelWidth(newWidthPercent);
    }
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
  }, []);

  // Set up and clean up resize event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleResizeMove(e);
    const handleMouseUp = () => handleResizeEnd();
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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

  // New Effect 1: Sync messages from useChat to our `conversations` state
  useEffect(() => {
    // This function ensures that the messages from useChat (for the active conversation)
    // are reflected in our main `conversations` array.
    // It also handles updating the title based on these messages if the title is a placeholder
    // (The title logic inside updateConversationMessages was made smarter by a previous fix)
    if (activeConversation) { // Only update if there's an active conversation context
      updateConversationMessages(messages);
    }
  }, [messages, updateConversationMessages, activeConversation]); // updateConversationMessages depends on activeConversation & getConversationTitle

  // New Effect 2: AI-driven Title Generation (if placeholder title exists after messages update)
  useEffect(() => {
    if (activeConversation && messages.length >= 3) {
      const conversation = conversations.find(c => c.id === activeConversation);
      if (conversation) {
        const { title: currentTitle, id: conversationId } = conversation;
        
        // Check if the current title is a placeholder (e.g., "New Conversation" or UUID-based)
        const isDefaultPlaceholderTitle = currentTitle === "New Conversation" || currentTitle === conversationId.substring(0, 8);

        if (isDefaultPlaceholderTitle) {
          console.log(`Conversation ${conversationId} has a default placeholder title '${currentTitle}'. Attempting to generate a better one.`);
          
          fetch(`/api/conversations/${activeConversation}/config`)
            .then(response => response.json())
            .then(data => {
              const configTitle = data.title;
              const configTitleIsEffectivelyPlaceholder = !configTitle || 
                                                        configTitle === "New Conversation" || 
                                                        configTitle.startsWith("Chat ") || 
                                                        configTitle === conversationId.substring(0,8);

              if (configTitleIsEffectivelyPlaceholder) {
                console.log(`Config title for ${conversationId} is also placeholder ('${configTitle}'). Generating new title with AI.`);
                generateConversationTitle(activeConversation); // AI generation
              } else if (configTitle && configTitle !== currentTitle) {
                console.log(`Using config title '${configTitle}' for conversation ${conversationId} (current was '${currentTitle}').`);
                setConversations(prev => 
                  prev.map(conv => 
                    conv.id === activeConversation ? { ...conv, title: configTitle } : conv
                  )
                );
              }
            })
            .catch(error => {
              console.error(`Error fetching config for title generation (convId: ${activeConversation}). Falling back to AI generation.`, error);
              generateConversationTitle(activeConversation);
            });
        }
      }
    }
  }, [activeConversation, messages, conversations, generateConversationTitle, setConversations, getConversationTitle]); // getConversationTitle for completeness if used in deeper checks not shown, setConversations for direct use

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full max-w-full bg-background overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          onCreateNewConversation={createNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onSaveSettings={handleSaveSettings}
        />

        {/* Main container - using ref instead of id */}
        <div ref={mainContentRef} className="flex flex-1 h-full overflow-hidden max-w-full">
          {/* Chat area wrapper */}
          <div 
            className="flex flex-col h-full relative"
            style={{ width: `${chatPanelWidth}%` }}
          >
            <header className="border-b p-4 flex items-center justify-between">
              <div className="flex items-center">
                <SidebarTrigger className="mr-2 md:hidden" />
                <h1 className="text-xl font-bold">{conversations.find((c) => c.id === activeConversation)?.title || "Chat"}</h1>
              </div>
            </header>

            <ChatDisplay messages={messages} isLoading={isLoading} />

            <ChatInput
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={onSubmit}
              isLoading={isLoading}
              isConversationActive={!!activeConversation}
            />
            
            {/* Resize handle - with improved styling for better usability */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 z-50 flex items-center justify-center"
              onMouseDown={handleResizeStart}
            >
              <div className="h-12 w-[3px] bg-border rounded-full"></div>
            </div>
          </div>

          <div 
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