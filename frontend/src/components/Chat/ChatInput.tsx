"use client"

import type React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isConversationActive: boolean; // To disable input if no conversation is active
}

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  isConversationActive,
}: ChatInputProps) {
  return (
    <footer className="border-t p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={isConversationActive ? "Type your message..." : "Please select or create a conversation"}
          className="flex-1"
          disabled={isLoading || !isConversationActive}
        />
        <Button type="submit" size="icon" disabled={isLoading || !isConversationActive}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </footer>
  );
} 