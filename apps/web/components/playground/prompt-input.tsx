"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Wand2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

const examplePrompts = [
  "A pricing toggle that switches between monthly and annual",
  "A notification toast with slide-in animation",
  "A circular progress button that fills on hold",
  "An avatar stack that expands on hover",
  "A tab component with sliding indicator",
];

export function PromptInput({
  onSubmit,
  isLoading = false,
  placeholder = "Describe the component you want to generate...",
  className,
}: PromptInputProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Main Input Area */}
      <div className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Input Container */}
          <div
            className={cn(
              "relative flex-1 rounded-2xl border bg-white/[0.02] transition-all duration-300",
              isFocused
                ? "border-white/20 shadow-lg shadow-white/5"
                : "border-white/5 hover:border-white/10"
            )}
          >
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <Wand2 className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-300">
                Describe your component
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full flex-1 resize-none bg-transparent px-4 py-4 text-base text-white placeholder-neutral-500 outline-none min-h-[120px]"
              disabled={isLoading}
            />

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="text-xs text-neutral-500">
                <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘
                </kbd>
                <span className="mx-1">+</span>
                <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
                <span className="ml-2">to generate</span>
              </p>
              <Button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Example Prompts */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Try an example
          </p>
          <div className="space-y-2">
            {examplePrompts.map((example, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={() => setPrompt(example)}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left text-sm text-neutral-400 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="flex-1">{example}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-sm font-medium text-white">What you get</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Spring physics with motion/react
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              3ms audio feedback on interactions
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Full TypeScript with props interface
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Tailwind CSS v4 styling
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
