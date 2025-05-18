import * as React from "react"
import { useState, useEffect, ChangeEvent } from "react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface SettingsMenuProps {
  onSaveSettings: (settings: {
    centralModel: string;
    apiKey: string;
    titleGenerationPrompt?: string;
  }) => void;
}

export function SettingsMenu({ onSaveSettings }: SettingsMenuProps) {
  const [centralModel, setCentralModel] = useState("claude-3.7-sonnet");
  const [apiKey, setApiKey] = useState("");
  const [titleGenerationPrompt, setTitleGenerationPrompt] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  // Load settings from localStorage when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.centralModel) setCentralModel(settings.centralModel);
        if (settings.apiKey) setApiKey(settings.apiKey);
        if (settings.titleGenerationPrompt) setTitleGenerationPrompt(settings.titleGenerationPrompt);
      } catch (err) {
        console.error("Error loading settings from localStorage:", err);
      }
    }
  }, []);

  // Load settings from backend when sheet opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/settings')
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to fetch settings");
          }
          return response.json();
        })
        .then(data => {
          if (data.central_model && data.central_model !== centralModel) {
            setCentralModel(data.central_model);
          }
          const newApiKeyConfigured = !!data.api_key_configured;
          if (newApiKeyConfigured !== apiKeyConfigured) {
            setApiKeyConfigured(newApiKeyConfigured);
          }
          if (data.title_generation_prompt && data.title_generation_prompt !== titleGenerationPrompt) {
            setTitleGenerationPrompt(data.title_generation_prompt);
          }
        })
        .catch(err => {
          console.error("Error fetching settings:", err);
          // Optionally, reset states or show an error message in the UI
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]); // Reverted dependencies to just [isOpen]

  const handleSaveSettings = () => {
    onSaveSettings({
      centralModel,
      apiKey,
      titleGenerationPrompt
    });
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-6 w-6" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>App Settings</SheetTitle>
          <SheetDescription>
            Configure application-wide settings here.
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">Loading settings...</div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <label htmlFor="central-model" className="text-sm font-medium block">
                Central Model
              </label>
              <select
                id="central-model"
                value={centralModel}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCentralModel(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              >
                <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium block">
                OpenRouter API Key {apiKeyConfigured && <span className="text-xs text-green-500">(Configured)</span>}
              </label>
              <Input
                id="api-key"
                type="password"
                placeholder={apiKeyConfigured ? "API key is configured" : "Enter your OpenRouter API key"}
                value={apiKey}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely in your browser and sent only to the backend.
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="title-generation-prompt" className="text-sm font-medium block">
                Custom Title Generation Prompt
              </label>
              <Textarea
                id="title-generation-prompt"
                placeholder="Enter custom prompt for generating chat titles (leave empty for default)"
                value={titleGenerationPrompt}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTitleGenerationPrompt(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Customize how chat titles are generated. The conversation context will be appended to this prompt.
              </p>
            </div>
          </div>
        )}
        
        <SheetFooter>
          <Button className="w-full" onClick={handleSaveSettings} disabled={isLoading}>
            Save Settings
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 