"use client"

import type { Message } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import React from "react";

// Helper function to format message content
const formatMessageContent = (content: string) => {
  const lines = content.split('\\n');
  return lines.map((line, index) => {
    let formattedLine: React.ReactNode | string = line;

    // Handle headings (e.g., # Heading)
    if (line.startsWith("# ")) {
      formattedLine = <h1 key={`h1-${index}`} className="text-2xl font-bold mt-2 mb-1">{line.substring(2)}</h1>;
    } else if (line.startsWith("## ")) {
      formattedLine = <h2 key={`h2-${index}`} className="text-xl font-semibold mt-1 mb-0.5">{line.substring(3)}</h2>;
    } else if (line.startsWith("### ")) {
      formattedLine = <h3 key={`h3-${index}`} className="text-lg font-medium">{line.substring(4)}</h3>;
    } else {
      // Handle bold text (e.g., **bold text**)
      const parts = line.split(/(\*\*[^\*]+\*\*)/g);
      formattedLine = <>{parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={`strong-${index}-${i}`}>{part.substring(2, part.length - 2)}</strong>;
        }
        return part;
      })}</>;
    }

    if (index < lines.length - 1) {
      return <React.Fragment key={index}>{formattedLine}<br /></React.Fragment>;
    }
    return <React.Fragment key={index}>{formattedLine}</React.Fragment>;
  });
};

interface ChatDisplayProps {
  messages: Message[];
  isLoading: boolean;
  // Potentially add other props like a ref for scrolling, etc.
}

export function ChatDisplay({ messages, isLoading }: ChatDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && !isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <h3 className="text-lg font-medium">Start a new conversation</h3>
            <p className="text-sm mt-1">Ask me anything!</p>
            {/* Or, if this is part of a page that requires a selection first: */}
            {/* <p className="text-sm mt-1">Select a conversation or start a new one.</p> */}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="message-content-display">{formatMessageContent(message.content)}</div>
              </div>
            </div>
          ))
        )}
        {/* Optional: Add a loading indicator specifically for new messages here if desired */}
        {/* {isLoading && messages.length > 0 && <div className="text-center text-muted-foreground">Loading...</div>} */}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </main>
  );
} 