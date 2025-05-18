"use client"

import type React from "react"
import { PlusCircle, Trash2, Home } from "lucide-react"
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar" // Assuming this path is correct
import type { Message } from "@ai-sdk/react"; // Added for Conversation interface
import { SettingsMenu } from "@/components/Settings/SettingsMenu"

// Re-defining Conversation interface locally for the component,
// or ideally, this would be imported from a shared types file.
export interface Conversation {
  id: string;
  title: string;
  messages: Message[]; // Assuming Message type is available or defined
  lastMessageTime?: number; // Add timestamp field
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onSaveSettings: (settings: { centralModel: string; apiKey: string; titleGenerationPrompt?: string }) => void;
  currentVersion?: string; // Optional prop for version display
}

export function ConversationSidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  onCreateNewConversation,
  onDeleteConversation,
  onSaveSettings,
  currentVersion = "v1.0" // Default version
}: ConversationSidebarProps) {
  const router = useRouter();
  console.log("[ConversationSidebar] Received conversations prop:", conversations);
  return (
    <Sidebar>
      {/* New Top Row for Home and Settings */}
      <div className="p-3 flex items-center justify-between border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/')}
          title="Home"
        >
          <Home className="h-6 w-6" />
        </Button>
        <SettingsMenu onSaveSettings={onSaveSettings} />
      </div>

      {/* Original Header, now just for Conversations title and New button */}
      <SidebarHeader className="flex items-center justify-between">
        {/* Center: Conversations title */}
        <h2 className="text-lg font-semibold">Conversations</h2> 

        {/* Right: New Conversation button */}
        <Button variant="ghost" size="icon" onClick={onCreateNewConversation} title="New Conversation">
          <PlusCircle className="h-6 w-6" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {conversations.map((conv) => (
            <SidebarMenuItem key={conv.id} className="flex items-center justify-between group">
              <SidebarMenuButton
                isActive={activeConversation === conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {conv.title}
              </SidebarMenuButton>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                title="Delete Conversation"
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">AI Chatbot {currentVersion}</div>
      </SidebarFooter>
    </Sidebar>
  );
} 