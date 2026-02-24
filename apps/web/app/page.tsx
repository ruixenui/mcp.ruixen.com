"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Terminal,
  Code2,
  Layers,
  Check,
  Copy,
  Zap,
  Volume2,
  Shield,
} from "lucide-react";

// ─── Easing ─────────────────────────────────────────────────
// Vercel curve. No springs. No bounce. No overshoot.

const ease: [number, number, number, number] = [0.32, 0.72, 0, 1];

// ─── Terminal Block ─────────────────────────────────────────

function TerminalBlock({
  command,
  label,
}: {
  command: string;
  label: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease }}
      className="mx-auto max-w-lg"
    >
      <div className="rounded-2xl border border-border bg-foreground/[0.04] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-foreground/[0.12]" />
            <div className="h-2.5 w-2.5 rounded-full bg-foreground/[0.12]" />
            <div className="h-2.5 w-2.5 rounded-full bg-foreground/[0.12]" />
          </div>
          <span className="ml-2 text-[11px] text-foreground/35 font-mono">
            {label}
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-foreground/35 font-mono text-sm">$</span>
            <code className="font-mono text-[14px] text-foreground/75">
              {command}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/35 transition-colors duration-150 hover:text-foreground/70 hover:bg-foreground/[0.08]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Feature Card ───────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  code,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  code: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease, delay }}
      className="rounded-2xl border border-border bg-foreground/[0.04] p-6 transition-colors duration-200 hover:border-foreground/20"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.06]">
        <Icon className="h-[18px] w-[18px] text-foreground/60" />
      </div>
      <h3 className="mb-1.5 text-[15px] font-medium tracking-[-0.01em]">
        {title}
      </h3>
      <p className="mb-4 text-[13px] text-muted-foreground leading-relaxed">
        {description}
      </p>
      <pre className="rounded-xl bg-foreground/[0.06] border border-foreground/[0.08] p-4 text-[12px] font-mono text-foreground/55 leading-relaxed overflow-x-auto">
        {code}
      </pre>
    </motion.div>
  );
}

// ─── Pattern Card ───────────────────────────────────────────

function PatternCard({
  name,
  description,
  delay = 0,
}: {
  name: string;
  description: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease, delay }}
      className="group rounded-2xl border border-border bg-foreground/[0.04] overflow-hidden transition-colors duration-200 hover:border-foreground/20 cursor-pointer"
    >
      <div className="aspect-[16/10] flex items-center justify-center bg-foreground/[0.03]">
        <div className="flex items-center gap-[3px] opacity-[0.15] group-hover:opacity-[0.3] transition-opacity duration-300">
          <div className="h-5 w-5 bg-foreground rounded-[4px]" />
          <div className="h-5 w-[7px] bg-foreground rounded-[3px]" />
        </div>
      </div>
      <div className="border-t border-border p-4">
        <h3 className="text-[13px] font-medium mb-0.5">{name}</h3>
        <p className="text-[12px] text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Data ───────────────────────────────────────────────────

const patterns = [
  { name: "Spring Button", description: "Physics-based press with audio" },
  { name: "Sliding Tabs", description: "Spring indicator that follows selection" },
  { name: "Toast Stack", description: "Bounce-in notifications with dismiss" },
  { name: "Accordion", description: "Smooth height animation with spring" },
  { name: "Modal Dialog", description: "Scale animation with focus trap" },
  { name: "Dropdown Menu", description: "Staggered items with portal rendering" },
];

// ─── Page ───────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ═══ Header ═════════════════════════════════════════════ */}
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center gap-[3px]">
              <div className="h-[14px] w-[14px] bg-foreground rounded-[3px]" />
              <div className="h-[14px] w-[5px] bg-foreground rounded-[2px]" />
            </div>
            <span className="text-[13px] font-medium text-foreground/70">
              ruixen
              <span className="text-foreground/40"> mcp</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/playground"
              className="rounded-lg px-3 py-1.5 text-[13px] text-foreground/55 transition-colors duration-150 hover:text-foreground/80"
            >
              Playground
            </Link>
            <Link
              href="https://ruixen.com/docs"
              target="_blank"
              className="rounded-lg px-3 py-1.5 text-[13px] text-foreground/55 transition-colors duration-150 hover:text-foreground/80"
            >
              Docs
            </Link>
            <Link
              href="/playground"
              className="ml-2 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            >
              Open Playground
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══ Hero ═══════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--foreground) / 0.04) 0%, transparent 50%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.1 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-foreground/[0.04] px-4 py-1.5"
          >
            <span className="text-[12px] font-medium text-foreground/60">
              Model Context Protocol
            </span>
            <span className="h-1 w-1 rounded-full bg-foreground/30" />
            <span className="text-[12px] text-foreground/40">
              for AI code generation
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.2 }}
            className="text-[clamp(32px,5vw,56px)] font-semibold leading-[1.08] tracking-[-0.035em] mb-5"
          >
            Generate UI Components
            <br />
            <span className="text-foreground/45">with Spring Physics</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.3 }}
            className="mx-auto mb-10 max-w-lg text-[15px] text-muted-foreground leading-relaxed"
          >
            Teach any AI IDE the Ruixen design system. Spring animations,
            audio feedback, and production-grade code. No API key required.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.4 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            >
              Open Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.04] px-6 py-2.5 text-[14px] font-medium text-foreground/65 transition-colors duration-150 hover:text-foreground/85 hover:border-foreground/25"
            >
              View Pricing — $0
            </Link>
          </motion.div>

          {/* Tech badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {["Next.js", "motion/react", "Tailwind v4", "TypeScript"].map(
              (tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-border bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-mono text-foreground/40"
                >
                  {tech}
                </span>
              )
            )}
          </motion.div>
        </div>
      </section>

      {/* ═══ Install Command ════════════════════════════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <TerminalBlock
            command="npx @ruixenui/mcp"
            label="Install MCP Server"
          />
        </div>
      </section>

      {/* ═══ Features ═══════════════════════════════════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-12 text-center"
          >
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] mb-2">
              The Ruixen Way
            </h2>
            <p className="text-[14px] text-muted-foreground">
              What makes these components different
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={Zap}
              title="Spring Physics"
              description="Every animation uses spring dynamics. No CSS transitions, no duration values."
              code={"transition: {\n  type: \"spring\",\n  stiffness: 400,\n  damping: 28\n}"}
              delay={0}
            />
            <FeatureCard
              icon={Volume2}
              title="Audio Feedback"
              description="3ms shaped noise burst on interactions via Web Audio API."
              code={"// Haptic-like feedback\nduration: 0.003s\ngain: 0.06\ndecay: quartic"}
              delay={0.08}
            />
            <FeatureCard
              icon={Shield}
              title="Production Ready"
              description="TypeScript, Tailwind CSS, accessible. Copy, paste, ship."
              code={"// Zero config needed\nmotion/react\ntailwindcss v4\ntypescript"}
              delay={0.16}
            />
          </div>
        </div>
      </section>

      {/* ═══ Patterns ═══════════════════════════════════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-12 text-center"
          >
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] mb-2">
              Component Patterns
            </h2>
            <p className="text-[14px] text-muted-foreground">
              Generate any of these with a single prompt
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patterns.map((pattern, i) => (
              <PatternCard
                key={pattern.name}
                name={pattern.name}
                description={pattern.description}
                delay={i * 0.06}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-8 text-center"
          >
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.04] px-5 py-2 text-[13px] text-foreground/55 transition-colors duration-150 hover:text-foreground/80 hover:border-foreground/20"
            >
              Explore all patterns
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ Distribution ═══════════════════════════════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-12 text-center"
          >
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] mb-2">
              Get Components
            </h2>
            <p className="text-[14px] text-muted-foreground">
              Three ways to use Ruixen
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Terminal,
                title: "MCP Server",
                description: "Teach your AI the design system",
                action: (
                  <code className="text-[12px] font-mono text-foreground/50">
                    npx @ruixenui/mcp
                  </code>
                ),
              },
              {
                icon: Code2,
                title: "AI Playground",
                description: "Describe what you want, get code",
                action: (
                  <Link
                    href="/playground"
                    className="inline-flex items-center gap-1.5 text-[12px] text-foreground/50 transition-colors duration-150 hover:text-foreground/75"
                  >
                    Open Playground{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ),
              },
              {
                icon: Layers,
                title: "Direct Download",
                description: "Self-contained TSX files",
                action: (
                  <span className="text-[12px] text-foreground/40">
                    Copy & paste ready
                  </span>
                ),
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-foreground/[0.04] p-6 transition-colors duration-200 hover:border-foreground/20"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.06]">
                  <item.icon className="h-[18px] w-[18px] text-foreground/55" />
                </div>
                <h3 className="mb-1 text-[14px] font-medium">{item.title}</h3>
                <p className="mb-4 text-[13px] text-muted-foreground">
                  {item.description}
                </p>
                {item.action}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ════════════════════════════════════════════ */}
      <section id="pricing" className="pb-24">
        <div className="mx-auto max-w-md px-6">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-12 text-center"
          >
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] mb-2">
              Pricing
            </h2>
            <p className="text-[14px] text-muted-foreground">
              Simple and transparent
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="rounded-2xl border border-border bg-foreground/[0.04] p-8 text-center"
          >
            <div className="text-[48px] font-semibold tracking-[-0.04em] mb-1">
              $0
            </div>
            <p className="text-[14px] text-muted-foreground mb-8">Free forever</p>

            <div className="space-y-3 text-left mb-8">
              {[
                "50 free generations on signup",
                "Use your own API key for unlimited",
                "Full access to MCP server",
                "All component patterns",
                "Commercial use allowed",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-foreground/40 shrink-0" />
                  <span className="text-[13px] text-foreground/60">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="block w-full rounded-xl bg-primary py-2.5 text-center text-[14px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ FAQ ═════════════════════════════════════════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="text-[24px] font-semibold tracking-[-0.03em]">
              FAQ
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                q: "What is the MCP server?",
                a: "MCP (Model Context Protocol) allows AI coding tools like Cursor, Claude Code, and Windsurf to understand the Ruixen design system. Install it and your AI will generate components following our conventions.",
              },
              {
                q: "Can I use my own API key?",
                a: "Yes. Add your Anthropic API key in settings for unlimited generations. Your key is stored locally and never sent to our servers.",
              },
              {
                q: "What frameworks are supported?",
                a: "Components are built for React and Next.js with motion/react for animations and Tailwind CSS for styling. They work in any React environment.",
              },
              {
                q: "Can I use these commercially?",
                a: "Yes. All generated components are yours to use in personal and commercial projects without attribution.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: i * 0.06 }}
              >
                <h3 className="mb-2 text-[14px] font-medium">{item.q}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Footer ═════════════════════════════════════════════ */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-[2px]">
              <div className="h-3 w-3 bg-foreground/40 rounded-[2px]" />
              <div className="h-3 w-[4px] bg-foreground/40 rounded-[1px]" />
            </div>
            <span className="text-[12px] text-foreground/35">ruixen mcp</span>
          </div>
          <nav className="flex items-center gap-6">
            {[
              { label: "Ruixen UI", href: "https://ruixen.com" },
              { label: "Docs", href: "https://ruixen.com/docs" },
              { label: "GitHub", href: "https://github.com/ruixenui/mcp" },
              { label: "Twitter", href: "https://twitter.com/ruixenui" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                className="text-[12px] text-foreground/35 transition-colors duration-150 hover:text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
