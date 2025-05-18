"use client"

import type React from "react";
import { Button } from "@/components/ui/button";
// Input might be used if we add more config options later
// import { Input } from "@/components/ui/input"; 

interface ConfigPanelProps {
  modelName: string;
  setModelName: (value: string) => void;
  systemDirective: string;
  setSystemDirective: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  configChanged: boolean;
  applyConfiguration: () => void;
  isConversationActive: boolean;
}

export function ConfigPanel({
  modelName,
  setModelName,
  systemDirective,
  setSystemDirective,
  temperature,
  setTemperature,
  configChanged,
  applyConfiguration,
  isConversationActive,
}: ConfigPanelProps) {
  return (
    <div className="flex flex-col h-full w-full"> {/* Removed border-l and w-1/2, added w-full */}
      <header className="border-b p-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
      </header>
      <div className="flex-1 p-4 overflow-auto">
        <div className="space-y-6">
          <div>
            <label htmlFor="model-selection" className="text-sm font-medium mb-2 block">Model Selection</label>
            <select
              id="model-selection"
              className="w-full p-2 border rounded bg-background"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              disabled={!isConversationActive}
            >
              <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
              <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              <option value="openai/gpt-4.1-nano">GPT-4.1 Nano</option>
              <option value="openai/gpt-4.1-mini">GPT-4.1 Mini</option>
              <option value="openai/gpt-4.1">GPT-4.1</option>
              <option value="x-ai/grok-3-mini-beta">Grok 3 Mini Beta</option>
              <option value="google/gemma-3-12b-it:free">Gemma 3 12B</option>
              <option value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash Preview</option>
            </select>
          </div>

          <div>
            <label htmlFor="system-directive" className="text-sm font-medium mb-2 block">System Directive</label>
            <textarea
              id="system-directive"
              className="w-full h-40 p-2 border rounded bg-background resize-none"
              placeholder="Enter system instructions for the AI..."
              value={systemDirective}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemDirective(e.target.value)}
              disabled={!isConversationActive}
            />
          </div>

          <div>
            <label htmlFor="temperature" className="text-sm font-medium mb-2 block">Temperature: {temperature.toFixed(1)}</label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" // Example styling for range
              disabled={!isConversationActive}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={applyConfiguration}
            disabled={!configChanged || !isConversationActive}
          >
            Apply Configuration
          </Button>
        </div>
      </div>
    </div>
  );
} 