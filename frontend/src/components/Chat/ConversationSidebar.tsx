"use client"

import type React from "react"
import { PlusCircle, Trash2 } from "lucide-react"
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

// Re-defining Conversation interface locally for the component,
// or ideally, this would be imported from a shared types file.
export interface Conversation {
  id: string;
  title: string;
  messages: Message[]; // Assuming Message type is available or defined
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  currentVersion?: string; // Optional prop for version display
}

export function ConversationSidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  onCreateNewConversation,
  onDeleteConversation,
  currentVersion = "v1.0" // Default version
}: ConversationSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <Button variant="ghost" size="icon" onClick={onCreateNewConversation} title="New Conversation">
          <PlusCircle className="h-5 w-5" />
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