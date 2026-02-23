import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Terminal, Code, Layers, Download, Check, ExternalLink } from "lucide-react";

const patterns = [
  { name: "Spring Button", description: "Button with physics-based press animation" },
  { name: "Sliding Tabs", description: "Tab component with spring indicator" },
  { name: "Toast Notification", description: "Slide-in toast with bounce effect" },
  { name: "Accordion", description: "Collapsible content with smooth motion" },
  { name: "Modal Dialog", description: "Overlay with spring scale animation" },
  { name: "Dropdown Menu", description: "Menu with staggered item animation" },
];

const features = [
  {
    title: "Spring Physics",
    description: "Every component uses spring dynamics. No CSS transitions.",
    code: `transition: {
  type: "spring",
  stiffness: 400,
  damping: 28
}`,
  },
  {
    title: "Audio Feedback",
    description: "3ms noise burst on every interaction via Web Audio API.",
    code: `// Shaped noise
duration: 0.003
gain: 0.06
decay: quartic`,
  },
  {
    title: "Production Ready",
    description: "TypeScript, Tailwind CSS, motion/react. Copy and ship.",
    code: `// Dependencies
motion/react
tailwindcss
typescript`,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-foreground">
              <Layers className="h-4 w-4 text-background" />
            </div>
            <span className="font-semibold">Ruixen MCP</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/playground">
              <Button variant="ghost" size="sm">Playground</Button>
            </Link>
            <Link href="https://ruixen.com/docs" target="_blank">
              <Button variant="ghost" size="sm">Docs</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
            <span className="font-medium">Ruixen MCP</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">Copy & Paste Components</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Physics-Based UI Components
            <br />
            <span className="text-muted-foreground">for React & Next.js</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Spring animations, audio feedback, and Tailwind CSS. Generate components
            with AI or install via CLI. No subscriptions.
          </p>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-md border bg-muted px-3 py-1 text-sm font-mono">Next.js 16</span>
            <span className="rounded-md border bg-muted px-3 py-1 text-sm font-mono">motion/react</span>
            <span className="rounded-md border bg-muted px-3 py-1 text-sm font-mono">Tailwind v4</span>
            <span className="rounded-md border bg-muted px-3 py-1 text-sm font-mono">TypeScript</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/playground">
              <Button size="lg" className="gap-2">
                Open Playground
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg">
                View Pricing — $0
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pattern Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold">Component Patterns</h2>
            <p className="text-muted-foreground">Generate any of these with a single prompt</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patterns.map((pattern) => (
              <Card key={pattern.name} className="group cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{pattern.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{pattern.description}</CardDescription>
                  <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground group-hover:text-foreground">
                    <span>View pattern</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/playground">
              <Button variant="outline" className="gap-2">
                Explore all patterns
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold">The Ruixen Way</h2>
            <p className="text-muted-foreground">What makes these components different</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="rounded-md bg-muted p-4 text-xs font-mono">
                    {feature.code}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Distribution Methods */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold">Get Components</h2>
            <p className="text-muted-foreground">Multiple ways to use Ruixen components</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border">
                  <Terminal className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">MCP Server</CardTitle>
                <CardDescription>
                  Teach your AI the Ruixen design system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="rounded-md bg-muted p-3 text-xs font-mono">
                  npx @ruixenui/mcp
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border">
                  <Code className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">AI Playground</CardTitle>
                <CardDescription>
                  Describe what you want, get code instantly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/playground">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    Open Playground
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border">
                  <Download className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Direct Download</CardTitle>
                <CardDescription>
                  Copy generated code to your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All components are self-contained TSX files
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t py-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold">Pricing</h2>
            <p className="text-muted-foreground">Simple and transparent</p>
          </div>

          <Card className="mx-auto max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold">$0</CardTitle>
              <CardDescription className="text-lg">Free forever</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4" />
                  <span>50 free generations on signup</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4" />
                  <span>Use your own API key for unlimited</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4" />
                  <span>Full access to MCP server</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4" />
                  <span>All component patterns</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4" />
                  <span>Commercial use allowed</span>
                </li>
              </ul>

              <Link href="/signup" className="block">
                <Button className="w-full" size="lg">
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-2xl font-semibold">FAQ</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-medium">What is the MCP server?</h3>
              <p className="text-sm text-muted-foreground">
                MCP (Model Context Protocol) allows AI coding tools like Cursor, Claude Code,
                and Windsurf to understand the Ruixen design system. Install it and your AI
                will generate components following our conventions.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Can I use my own API key?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. Add your Anthropic API key in settings for unlimited generations.
                Your key is stored locally and never sent to our servers.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">What frameworks are supported?</h3>
              <p className="text-sm text-muted-foreground">
                Components are built for React and Next.js with motion/react for animations
                and Tailwind CSS for styling. They work in any React environment.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Can I use these commercially?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. All generated components are yours to use in personal and commercial
                projects without attribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded border bg-foreground">
              <Layers className="h-3 w-3 text-background" />
            </div>
            <span className="font-medium">Ruixen MCP</span>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="https://ruixen.com" target="_blank" className="hover:text-foreground">
              Ruixen UI
            </Link>
            <Link href="https://ruixen.com/docs" target="_blank" className="hover:text-foreground">
              Docs
            </Link>
            <Link href="https://github.com/ruixenui/mcp" target="_blank" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="https://twitter.com/ruixenui" target="_blank" className="hover:text-foreground">
              Twitter
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
