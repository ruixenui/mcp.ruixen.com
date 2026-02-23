"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Download,
  Code2,
  Eye,
  RotateCcw,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  className?: string;
  onReset?: () => void;
  onSave?: () => void;
}

type ViewMode = "code" | "preview";

export function CodePreview({
  code,
  className,
  onReset,
  onSave,
}: CodePreviewProps) {
  const [copied, setCopied] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("code");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "component.tsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    return code
      .replace(
        /(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|new|this|async|await|try|catch|throw|default|as)/g,
        '<span class="text-neutral-300 font-semibold">$1</span>'
      )
      .replace(
        /(".*?"|'.*?'|`.*?`)/g,
        '<span class="text-emerald-400">$1</span>'
      )
      .replace(
        /(\d+\.?\d*)/g,
        '<span class="text-amber-300">$1</span>'
      )
      .replace(
        /(\/\/.*$)/gm,
        '<span class="text-neutral-500 italic">$1</span>'
      )
      .replace(
        /(\{|\}|\(|\)|<|>|;|,|:)/g,
        '<span class="text-neutral-500">$1</span>'
      );
  };

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0c0c0c]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#0f0f0f] px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>

          {/* File Tab */}
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm">
            <Code2 className="h-3.5 w-3.5 text-neutral-400" />
            <span className="text-neutral-300">component.tsx</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
            <button
              onClick={() => setViewMode("code")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "code"
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "preview"
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 border-l border-white/5 pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Check className="h-4 w-4 text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Copy className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                className="h-8 w-8 p-0"
              >
                <Save className="h-4 w-4" />
              </Button>
            )}
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "code" ? (
          <motion.div
            key="code"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-auto"
          >
            <div className="flex min-h-full font-mono text-sm">
              {/* Line Numbers */}
              <div className="sticky left-0 flex flex-col border-r border-white/5 bg-[#0c0c0c] px-4 py-4 text-right text-neutral-600 select-none">
                {lines.map((_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code */}
              <div className="flex-1 p-4">
                <pre className="leading-6">
                  <code
                    className="text-neutral-100"
                    dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
                  />
                </pre>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 p-8"
          >
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <Eye className="mx-auto mb-3 h-8 w-8 text-neutral-500" />
              <p className="text-sm text-neutral-400">
                Live preview coming soon
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Copy the code and run it in your project
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
