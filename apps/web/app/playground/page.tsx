"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, extractCodeFromResponse } from "@/lib/utils";
import { generatePreviewHtml, extractCodeProgressively } from "@/lib/preview-html";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
  Smartphone,
  Code2,
  Copy,
  Check,
  ArrowUp,
  Paperclip,
  X,
  Loader2,
  Sparkles,
  RotateCcw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────

interface PromptEntry {
  id: string;
  text: string;
}

interface Variant {
  id: string;
  label: string;
  code: string;
  prompt: string;
  promptId: string;
  generationId?: string;
  generatedAt?: number;
}

// ─── Session Storage Keys ───────────────────────────────────

const STORAGE_KEYS = {
  prompts: "ruixen_prompts",
  variants: "ruixen_variants",
  activeVariant: "ruixen_active",
} as const;

// ─── Easing ─────────────────────────────────────────────────

const ease: [number, number, number, number] = [0.32, 0.72, 0, 1];

// ─── Suggestions ────────────────────────────────────────────

const SUGGESTIONS = [
  "A spring-animated button with audio feedback",
  "Modal dialog with focus trap and backdrop blur",
  "Dropdown menu with keyboard navigation",
  "Sliding tabs with spring indicator",
  "Toast notification with bounce entry",
  "Accordion with smooth height animation",
];

// ─── Page ───────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [prompt, setPrompt] = React.useState("");
  const [prompts, setPrompts] = React.useState<PromptEntry[]>([]);
  const [variants, setVariants] = React.useState<Variant[]>([]);
  const [activeVariant, setActiveVariant] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [showCode, setShowCode] = React.useState(false);
  const [generationStatus, setGenerationStatus] = React.useState<
    "idle" | "thinking" | "generating" | "complete"
  >("idle");
  const [previewKey, setPreviewKey] = React.useState(0);
  const [streamingCode, setStreamingCode] = React.useState("");
  const [generatingPromptId, setGeneratingPromptId] = React.useState<
    string | null
  >(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const sidebarScrollRef = React.useRef<HTMLDivElement>(null);

  // ─── Restore from sessionStorage ────────────────────────

  React.useEffect(() => {
    try {
      const sp = sessionStorage.getItem(STORAGE_KEYS.prompts);
      const sv = sessionStorage.getItem(STORAGE_KEYS.variants);
      const sa = sessionStorage.getItem(STORAGE_KEYS.activeVariant);
      if (sp) setPrompts(JSON.parse(sp));
      if (sv) setVariants(JSON.parse(sv));
      if (sa) setActiveVariant(sa);
    } catch {
      // Corrupted storage, ignore
    }
  }, []);

  // ─── Persist to sessionStorage ──────────────────────────

  React.useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.prompts, JSON.stringify(prompts));
  }, [prompts]);

  React.useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.variants, JSON.stringify(variants));
  }, [variants]);

  React.useEffect(() => {
    if (activeVariant) {
      sessionStorage.setItem(STORAGE_KEYS.activeVariant, activeVariant);
    }
  }, [activeVariant]);

  // ─── Auto-resize textarea ──────────────────────────────

  React.useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [prompt]);

  // ─── Auto-scroll sidebar to bottom ─────────────────────

  React.useEffect(() => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop =
        sidebarScrollRef.current.scrollHeight;
    }
  }, [prompts.length, generationStatus]);

  // ─── Handlers ──────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const currentInput = prompt.trim();
    const promptId = Date.now().toString();

    // Add to prompt history
    setPrompts((prev) => [...prev, { id: promptId, text: currentInput }]);
    setGeneratingPromptId(promptId);
    setPrompt("");
    setIsLoading(true);
    setError(null);
    setGenerationStatus("thinking");
    setStreamingCode("");

    try {
      // Brief thinking phase for visual feedback
      await new Promise((r) => setTimeout(r, 800));
      setGenerationStatus("generating");

      // Build conversation history from previous prompts + variants
      const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
      const recentPrompts = prompts.slice(-3);
      for (const p of recentPrompts) {
        const matchingVariant = variants.find((v) => v.promptId === p.id);
        if (matchingVariant) {
          conversationHistory.push({ role: "user", content: p.text });
          conversationHistory.push({ role: "assistant", content: matchingVariant.code });
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentInput,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        }),
      });

      if (!res.ok) {
        let errorMessage = "Request failed (" + res.status + ")";
        try {
          const data = await res.json();
          errorMessage = data.error || errorMessage;
        } catch {}
        setError(errorMessage);
        setGenerationStatus("idle");
        setGeneratingPromptId(null);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        setGenerationStatus("idle");
        setGeneratingPromptId(null);
        return;
      }

      const decoder = new TextDecoder();
      let rawText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "delta") {
              rawText += event.text;
              const code = extractCodeProgressively(rawText);
              if (code) setStreamingCode(code);
            } else if (event.type === "done") {
              const finalCode = extractCodeFromResponse(rawText);
              if (finalCode) {
                setGenerationStatus("complete");
                const newVariant: Variant = {
                  id: Date.now().toString(),
                  label: "v" + (variants.length + 1),
                  code: finalCode,
                  prompt: currentInput,
                  promptId,
                  generationId: event.generationId || undefined,
                  generatedAt: Date.now(),
                };
                setVariants((prev) => [...prev, newVariant]);
                setActiveVariant(newVariant.id);
                setStreamingCode("");
                setShowCode(false);
                setTimeout(() => {
                  setGenerationStatus("idle");
                  setGeneratingPromptId(null);
                }, 2500);
              } else {
                setError(
                  "No code was generated. Try a more specific prompt."
                );
                setGenerationStatus("idle");
                setGeneratingPromptId(null);
              }
            } else if (event.type === "error") {
              setError(event.error || "Generation failed");
              setGenerationStatus("idle");
              setGeneratingPromptId(null);
            }
          } catch {
            // Incomplete JSON line, skip
          }
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError("Network error. Check your connection and try again.");
      setGenerationStatus("idle");
      setGeneratingPromptId(null);
    } finally {
      setIsLoading(false);
      setStreamingCode("");
    }
  };

  const handleCopyCode = async () => {
    const variant = variants.find((v) => v.id === activeVariant);
    if (variant?.code) {
      await navigator.clipboard.writeText(variant.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Send "accepted" feedback (non-blocking)
      if (variant.generationId) {
        const timeToAction = variant.generatedAt
          ? Date.now() - variant.generatedAt
          : undefined;
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationId: variant.generationId,
            action: "accepted",
            originalCode: variant.code,
            timeToActionMs: timeToAction,
          }),
        }).catch(() => {});
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const activeCode =
    variants.find((v) => v.id === activeVariant)?.code || "";

  const previewHtml = React.useMemo(() => {
    if (!activeCode) return "";
    return generatePreviewHtml(activeCode);
  }, [activeCode]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ═══ Left Sidebar ═══════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="shrink-0 border-r border-border overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="flex flex-col h-full w-[300px]">
              {/* Header */}
              <div className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-[3px]">
                    <div className="h-[14px] w-[14px] bg-foreground rounded-[3px]" />
                    <div className="h-[14px] w-[5px] bg-foreground rounded-[2px]" />
                  </div>
                  <span className="text-[13px] font-medium text-muted-foreground">
                    ruixen
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/40 transition-colors duration-150 hover:text-foreground/70 hover:bg-foreground/[0.08]"
                >
                  <PanelLeftClose className="h-[15px] w-[15px]" />
                </button>
              </div>

              {/* Prompt History */}
              <div
                ref={sidebarScrollRef}
                className="flex-1 overflow-auto p-3"
              >
                {prompts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center px-4">
                    <div className="flex items-center gap-[3px] mb-4 animate-breathe">
                      <div className="h-5 w-5 bg-foreground/15 rounded-[4px]" />
                      <div className="h-5 w-[7px] bg-foreground/15 rounded-[3px]" />
                    </div>
                    <p className="text-[13px] text-foreground/35 leading-relaxed">
                      Describe a component
                      <br />
                      to generate
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prompts.map((p, index) => {
                      const promptVariants = variants.filter(
                        (v) => v.promptId === p.id
                      );
                      const isGenerating = generatingPromptId === p.id;
                      const hasActiveVariant = promptVariants.some(
                        (v) => v.id === activeVariant
                      );

                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            ease,
                            delay: index === prompts.length - 1 ? 0.05 : 0,
                          }}
                          className={cn(
                            "rounded-xl p-3 transition-colors duration-150",
                            hasActiveVariant
                              ? "bg-foreground/[0.06] border border-border"
                              : "bg-foreground/[0.03] border border-transparent"
                          )}
                        >
                          <p className="text-[12px] leading-relaxed text-foreground/60 line-clamp-2">
                            {p.text}
                          </p>

                          {/* Variant chips */}
                          {promptVariants.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {promptVariants.map((v) => (
                                <button
                                  key={v.id}
                                  onClick={() => setActiveVariant(v.id)}
                                  className={cn(
                                    "h-5 px-2 rounded-md text-[10px] font-mono transition-colors duration-150",
                                    v.id === activeVariant
                                      ? "bg-foreground/15 text-foreground/80"
                                      : "bg-foreground/[0.06] text-foreground/35 hover:text-foreground/60"
                                  )}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Generation status — only on the generating prompt */}
                          {isGenerating && (
                            <div className="mt-2 min-h-[16px]">
                              <AnimatePresence mode="wait">
                                {generationStatus === "thinking" && (
                                  <motion.div
                                    key="thinking"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2"
                                  >
                                    <div className="flex gap-[3px]">
                                      {[0, 1, 2].map((i) => (
                                        <motion.div
                                          key={i}
                                          className="h-[3px] w-[3px] rounded-full bg-foreground/40"
                                          animate={{
                                            opacity: [0.2, 0.8, 0.2],
                                            scale: [0.85, 1.15, 0.85],
                                          }}
                                          transition={{
                                            duration: 1.4,
                                            repeat: Infinity,
                                            delay: i * 0.18,
                                            ease: "easeInOut",
                                          }}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-foreground/30">
                                      Analyzing...
                                    </span>
                                  </motion.div>
                                )}
                                {generationStatus === "generating" && (
                                  <motion.div
                                    key="generating"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center gap-2">
                                      <motion.div
                                        className="h-[3px] w-[3px] rounded-full bg-primary/70"
                                        animate={{
                                          scale: [1, 1.5, 1],
                                          opacity: [0.4, 1, 0.4],
                                        }}
                                        transition={{
                                          duration: 1.5,
                                          repeat: Infinity,
                                          ease: "easeInOut",
                                        }}
                                      />
                                      <span className="text-[10px] text-foreground/35">
                                        Generating...
                                      </span>
                                    </div>
                                    <div className="h-[1px] w-full rounded-full bg-foreground/[0.08] overflow-hidden">
                                      <motion.div
                                        className="h-full bg-primary/30 rounded-full"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "85%" }}
                                        transition={{
                                          duration: 12,
                                          ease: [0.16, 1, 0.3, 1],
                                        }}
                                      />
                                    </div>
                                  </motion.div>
                                )}
                                {generationStatus === "complete" && (
                                  <motion.div
                                    key="complete"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: [0.34, 1.56, 0.64, 1],
                                      }}
                                    >
                                      <Check className="h-2.5 w-2.5 text-emerald-400/70" />
                                    </motion.div>
                                    <span className="text-[10px] text-emerald-400/70">
                                      Done
                                    </span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <form onSubmit={handleSubmit}>
                  <div className="rounded-xl border border-border bg-foreground/[0.04] glow-input">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe a component..."
                      disabled={isLoading}
                      rows={1}
                      className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-[13px] text-foreground/90 placeholder:text-foreground/35 focus:outline-none disabled:opacity-40"
                      style={{ maxHeight: 120 }}
                    />
                    <div className="flex items-center justify-between px-2 pb-2">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/30 transition-colors duration-150 hover:text-foreground/50 hover:bg-foreground/[0.08]"
                      >
                        <Paperclip className="h-[14px] w-[14px]" />
                      </button>
                      <button
                        type="submit"
                        disabled={!prompt.trim() || isLoading}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150",
                          prompt.trim()
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-foreground/10 text-foreground/30"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Main Canvas ════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-1.5">
            {!sidebarOpen && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                onClick={() => setSidebarOpen(true)}
                className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 transition-colors duration-150 hover:text-foreground/70 hover:bg-foreground/[0.08]"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </motion.button>
            )}

            {/* Device Toggle */}
            <div className="relative flex items-center rounded-lg border border-border bg-foreground/[0.04] p-[3px]">
              <button
                onClick={() => setDevice("desktop")}
                className={cn(
                  "relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-md transition-colors duration-150",
                  device === "desktop"
                    ? "text-foreground"
                    : "text-foreground/40 hover:text-foreground/60"
                )}
              >
                <Monitor className="h-[14px] w-[14px]" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn(
                  "relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-md transition-colors duration-150",
                  device === "mobile"
                    ? "text-foreground"
                    : "text-foreground/40 hover:text-foreground/60"
                )}
              >
                <Smartphone className="h-[14px] w-[14px]" />
              </button>
              <motion.div
                className="absolute top-[3px] h-[26px] w-[26px] rounded-md bg-foreground/15"
                animate={{ left: device === "desktop" ? 3 : 29 }}
                transition={{ duration: 0.2, ease }}
              />
            </div>

            <button
              onClick={() => {
                // Send "regenerated" feedback for current variant
                const variant = variants.find((v) => v.id === activeVariant);
                if (variant?.generationId) {
                  fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      generationId: variant.generationId,
                      action: "regenerated",
                      originalCode: variant.code,
                      timeToActionMs: variant.generatedAt
                        ? Date.now() - variant.generatedAt
                        : undefined,
                    }),
                  }).catch(() => {});
                }
                setPreviewKey((k) => k + 1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/30 transition-colors duration-150 hover:text-foreground/50 hover:bg-foreground/[0.08]"
            >
              <RotateCcw className="h-[14px] w-[14px]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCode(!showCode)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                showCode
                  ? "bg-foreground/15 text-foreground"
                  : streamingCode
                    ? "text-primary/70 bg-primary/[0.08] hover:bg-primary/[0.12]"
                    : "text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.08]"
              )}
            >
              <Code2 className="h-[14px] w-[14px]" />
              {streamingCode && !showCode ? "Watch Code" : "Code"}
            </button>

            <button
              onClick={handleCopyCode}
              disabled={!activeCode}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 text-[13px] font-medium transition-colors duration-150 hover:bg-primary/90 disabled:opacity-20"
            >
              {copied ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-[14px] w-[14px]" />
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Copy className="h-[14px] w-[14px]" />
                  Copy Code
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Canvas Content */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {showCode && (activeCode || streamingCode) ? (
              <motion.div
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[11px] font-medium text-foreground/40 font-mono tracking-wide">
                        component.tsx
                      </span>
                      {streamingCode && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-primary/50 font-mono"
                        >
                          streaming...
                        </motion.span>
                      )}
                    </div>
                    <pre className="font-mono text-[13px] leading-[1.7] text-foreground/70 whitespace-pre-wrap">
                      <code>{streamingCode || activeCode}</code>
                      {streamingCode && (
                        <motion.span
                          className="inline-block w-[2px] h-[15px] bg-primary/70 ml-0.5 align-middle"
                          animate={{ opacity: [1, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </pre>
                  </div>
                </ScrollArea>
              </motion.div>
            ) : activeCode ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full items-center justify-center p-4"
              >
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    device === "mobile"
                      ? "h-[667px] w-[375px] rounded-[40px] border border-border bg-background"
                      : "h-full w-full"
                  )}
                >
                  <iframe
                    key={activeVariant + "-" + previewKey}
                    srcDoc={previewHtml}
                    className="h-full w-full border-0"
                    sandbox="allow-scripts"
                    title="Component Preview"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex h-full flex-col items-center justify-center relative"
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 42%, hsl(var(--foreground) / 0.03) 0%, transparent 55%)",
                  }}
                />

                <div className="flex items-center gap-[4px] mb-6 animate-breathe">
                  <div className="h-8 w-8 bg-foreground/10 rounded-[6px]" />
                  <div className="h-8 w-[11px] bg-foreground/10 rounded-[4px]" />
                </div>

                <p className="text-[13px] text-muted-foreground mb-8">
                  What would you like to create?
                </p>

                <div className="flex flex-wrap justify-center gap-2 max-w-xl px-8">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        ease,
                        delay: 0.1 + i * 0.04,
                      }}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-3.5 py-1.5 text-[12px] text-foreground/45 transition-colors duration-150 hover:border-foreground/20 hover:text-foreground/65 hover:bg-foreground/[0.08]"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Overlay — hidden when streaming code is visible */}
          <AnimatePresence>
            {isLoading && !(showCode && streamingCode) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/70 backdrop-blur-sm"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="mb-4"
                >
                  <Sparkles className="h-5 w-5 text-foreground/50" />
                </motion.div>
                <p className="text-[13px] text-foreground/45 font-medium">
                  {generationStatus === "thinking"
                    ? "Analyzing prompt..."
                    : "Generating component..."}
                </p>
                {streamingCode && !showCode && (
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    onClick={() => setShowCode(true)}
                    className="mt-3 text-[11px] text-primary/60 hover:text-primary/80 transition-colors duration-150 underline underline-offset-4"
                  >
                    Watch code generation
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          <AnimatePresence>
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2, ease }}
                className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
              >
                <p className="text-[13px] text-red-400 flex-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400/60 hover:text-red-400 transition-colors duration-150"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ Right Sidebar — Versions ═══════════════════════════ */}
      <div className="flex w-[200px] flex-col border-l border-border">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.08em]">
            Versions
          </span>
        </div>
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2.5">
            {variants.length === 0 &&
              [1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border border-dashed border-foreground/10 overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-foreground/[0.03]" />
                  <div className="border-t border-dashed border-foreground/10 px-3 py-2 text-center">
                    <span className="text-[11px] text-foreground/20 font-mono">
                      v{i}
                    </span>
                  </div>
                </div>
              ))}

            {variants.map((variant, index) => (
              <motion.button
                key={variant.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease }}
                onClick={() => setActiveVariant(variant.id)}
                className={cn(
                  "flex w-full flex-col rounded-xl border overflow-hidden transition-colors duration-150",
                  activeVariant === variant.id
                    ? "border-foreground/30 bg-foreground/[0.08]"
                    : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/20"
                )}
              >
                <div className="aspect-[4/3] bg-background/50 flex items-center justify-center">
                  <div className="flex items-center gap-[2px]">
                    <div className="h-2.5 w-2.5 bg-foreground/25 rounded-[2px]" />
                    <div className="h-2.5 w-[4px] bg-foreground/25 rounded-[1px]" />
                  </div>
                </div>
                <div className="border-t border-foreground/10 px-3 py-2 text-center">
                  <span className="text-[11px] font-mono text-foreground/50">
                    v{index + 1}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </ScrollArea>
      </div>

    </div>
  );
}
