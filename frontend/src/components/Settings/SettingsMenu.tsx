import * as React from "react"
import { useState, useEffect } from "react"
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

interface SettingsMenuProps {
  onSaveSettings: (settings: {
    backendModel: string;
    apiKey: string;
  }) => void;
}

export function SettingsMenu({ onSaveSettings }: SettingsMenuProps) {
  const [backendModel, setBackendModel] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  // Load settings from localStorage when component mounts
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
          if (data.backend_model) setBackendModel(data.backend_model);
          setApiKeyConfigured(data.api_key_configured || false);
        })
        .catch(err => {
          console.error("Error fetching settings:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleSaveSettings = () => {
    onSaveSettings({
      backendModel,
      apiKey,
    });
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
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
              <label htmlFor="backend-model" className="text-sm font-medium block">
                Backend Model
              </label>
              <select
                id="backend-model"
                value={backendModel}
                onChange={(e) => setBackendModel(e.target.value)}
                className="w-full p-2 border rounded bg-background"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI Direct</option>
                <option value="anthropic">Anthropic Direct</option>
                <option value="llama">Llama</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="api-key" className="text-sm font-medium block">
                API Key {apiKeyConfigured && <span className="text-xs text-green-500">(Configured)</span>}
              </label>
              <Input
                id="api-key"
                type="password"
                placeholder={apiKeyConfigured ? "API key is configured" : "Enter your API key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely in your browser and sent only to the backend.
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