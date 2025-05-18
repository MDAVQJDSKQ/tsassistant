"use client"

import type React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "0";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + "px";
    }
  }, [input]);

  // Handle key events for the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If shift+enter is pressed, allow the default behavior (new line)
    if (e.key === "Enter" && e.shiftKey) {
      return;
    }
    
    // If just enter is pressed (without shift), submit the form
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      // Create and dispatch a submit event on the form
      const form = e.currentTarget.form;
      if (form && !isLoading && isConversationActive) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }
  };

  return (
    <footer className="border-t p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConversationActive ? "Type your message..." : "Please select or create a conversation"}
          className={cn(
            "flex-1 min-h-[40px] max-h-[200px] overflow-y-auto resize-none",
            "border-input rounded-md border bg-transparent px-3 py-2",
            "placeholder:text-muted-foreground focus-visible:outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          disabled={isLoading || !isConversationActive}
          rows={1}
        />
        <Button type="submit" size="icon" disabled={isLoading || !isConversationActive}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </footer>
  );
} 