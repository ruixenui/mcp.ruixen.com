"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Menu,
  ChevronLeft,
  Monitor,
  Smartphone,
  ExternalLink,
  RotateCcw,
  Code,
  Copy,
  Check,
  Send,
  Paperclip,
  AtSign,
  Settings,
  X,
  Key,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  code?: string;
}

interface Variant {
  id: string;
  label: string;
  code: string;
  prompt: string;
}

export default function PlaygroundPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [prompt, setPrompt] = React.useState("");
  const [currentPrompt, setCurrentPrompt] = React.useState("");
  const [variants, setVariants] = React.useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const [apiProvider, setApiProvider] = React.useState<"anthropic" | "openai">("anthropic");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load API key from localStorage
  React.useEffect(() => {
    const savedKey = localStorage.getItem("ruixen_api_key");
    const savedProvider = localStorage.getItem("ruixen_api_provider");
    if (savedKey) setApiKey(savedKey);
    if (savedProvider) setApiProvider(savedProvider as "anthropic" | "openai");
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("ruixen_api_key", apiKey);
    localStorage.setItem("ruixen_api_provider", apiProvider);
    setShowSettings(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const currentInput = prompt.trim();
    setCurrentPrompt(currentInput);
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentInput,
          apiKey: apiKey || undefined,
          provider: apiProvider,
        }),
      });

      const data = await res.json();

      if (data.code) {
        const newVariant: Variant = {
          id: Date.now().toString(),
          label: `Variant ${variants.length + 1}`,
          code: data.code,
          prompt: currentInput,
        };
        setVariants((prev) => [...prev, newVariant]);
        setActiveVariant(newVariant.id);
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    const code = variants.find((v) => v.id === activeVariant)?.code;
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPrompt = async () => {
    if (currentPrompt) {
      await navigator.clipboard.writeText(currentPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const activeCode = variants.find((v) => v.id === activeVariant)?.code || "";

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r border-white/10 bg-black transition-all duration-200",
          sidebarOpen ? "w-[320px]" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-3">
          <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/5">
            <Menu className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Prompt Display */}
        <div className="flex-1 overflow-auto p-4">
          {currentPrompt && (
            <div>
              <h2 className="mb-1 text-sm font-medium leading-tight">
                {currentPrompt.length > 40
                  ? currentPrompt.slice(0, 40) + "..."
                  : currentPrompt}
              </h2>
              <p className="mb-4 text-xs text-white/50">
                Variant {variants.findIndex((v) => v.id === activeVariant) + 1 || 1}
              </p>
              <div className="rounded-lg bg-white/5 p-3">
                <p className="text-sm text-white/80">{currentPrompt}</p>
              </div>
            </div>
          )}

          {!currentPrompt && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10">
                <Code className="h-5 w-5 text-white/50" />
              </div>
              <p className="text-sm text-white/50">
                Describe a component to generate
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-3">
          <form onSubmit={handleSubmit}>
            <div className="rounded-lg border border-white/10 bg-white/5">
              <Input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask for changes you want to make..."
                className="border-0 bg-transparent px-3 py-2 text-sm placeholder:text-white/30 focus-visible:ring-0"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between border-t border-white/10 px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-7 items-center gap-1.5 rounded px-2 text-xs text-white/50 hover:bg-white/5 hover:text-white"
                  >
                    <AtSign className="h-3.5 w-3.5" />
                    Context
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded text-white/50 hover:bg-white/5 hover:text-white"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isLoading}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded",
                      prompt.trim()
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/30"
                    )}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-2 flex h-8 w-8 items-center justify-center rounded hover:bg-white/5"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}

            {/* Device Toggle */}
            <div className="flex items-center rounded-lg border border-white/10 p-0.5">
              <button
                onClick={() => setDevice("desktop")}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded",
                  device === "desktop" ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded",
                  device === "mobile" ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <span className="text-sm text-white/50">75%</span>

            <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/5">
              <ExternalLink className="h-4 w-4 text-white/50" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/5">
              <RotateCcw className="h-4 w-4 text-white/50" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded px-3 text-sm",
                showCode ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <Code className="h-4 w-4" />
              Code
            </button>
            <button
              onClick={handleCopyPrompt}
              disabled={!currentPrompt}
              className="flex h-8 items-center gap-1.5 rounded bg-blue-600 px-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {copiedPrompt ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Prompt
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-8 items-center gap-1.5 rounded border border-white/10 px-3 text-sm hover:bg-white/5"
            >
              <Key className="h-4 w-4" />
              API Key
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="relative flex-1 overflow-hidden bg-black">
          {showCode && activeCode ? (
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">component.tsx</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="font-mono text-sm text-white/80">
                  <code>{activeCode}</code>
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center">
              {activeCode ? (
                <div
                  className={cn(
                    "flex items-center justify-center bg-black",
                    device === "mobile" ? "h-[667px] w-[375px] rounded-3xl border border-white/10" : "h-full w-full"
                  )}
                >
                  {/* Ruixen logo as placeholder */}
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-white" />
                    <div className="h-3 w-1 bg-white" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 bg-white/20" />
                  <div className="h-3 w-1 bg-white/20" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Variants */}
      <div className="flex w-[180px] flex-col border-l border-white/10 bg-black">
        <div className="flex h-12 items-center border-b border-white/10 px-4">
          <span className="text-sm text-white/50">Variants</span>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {variants.length === 0 && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-lg border border-white/10 bg-white/5"
                  >
                    <div className="aspect-[4/3] rounded-t-lg bg-black" />
                    <div className="border-t border-white/10 px-3 py-2 text-center text-xs text-white/30">
                      Variant {i}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {variants.map((variant, index) => (
              <button
                key={variant.id}
                onClick={() => setActiveVariant(variant.id)}
                className={cn(
                  "flex w-full flex-col rounded-lg border transition-colors",
                  activeVariant === variant.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <div className="aspect-[4/3] rounded-t-lg bg-black">
                  {/* Thumbnail preview placeholder */}
                  <div className="flex h-full items-center justify-center">
                    <div className="flex items-center gap-0.5">
                      <div className="h-2 w-2 bg-white/30" />
                      <div className="h-2 w-0.5 bg-white/30" />
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/10 px-3 py-2 text-center text-xs">
                  Variant {index + 1}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-medium">API Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Provider
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setApiProvider("anthropic")}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2 text-sm",
                      apiProvider === "anthropic"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    Anthropic
                  </button>
                  <button
                    onClick={() => setApiProvider("openai")}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2 text-sm",
                      apiProvider === "openai"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  API Key
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    apiProvider === "anthropic"
                      ? "sk-ant-..."
                      : "sk-..."
                  }
                  className="border-white/10 bg-white/5"
                />
                <p className="mt-2 text-xs text-white/50">
                  Your API key is stored locally and never sent to our servers.
                  Use your own key for unlimited generations.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 border-white/10 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button onClick={saveApiKey} className="flex-1">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
