# @ruixenui/mcp

Teach AI agents to generate physics-based UI components with the Ruixen design system.

> Spring physics. Audio feedback. No CSS transitions. Every component feels physical.

## Quick Install

Add to your IDE's MCP config:

```json
{
  "mcpServers": {
    "@ruixenui/mcp": {
      "command": "npx",
      "args": ["-y", "@ruixenui/mcp@latest"]
    }
  }
}
```

**Config file locations:**
- **Cursor:** `~/.cursor/mcp.json`
- **Windsurf:** `~/.codeium/windsurf/mcp_config.json`
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **VS Code:** Settings → MCP

## What It Does

This MCP server doesn't copy-paste components. It teaches your AI assistant the Ruixen design system — spring physics, audio feedback, design tokens — so it generates **new** components that feel physical and consistent.

## Available Tools

| Tool | Description |
|------|-------------|
| `getDesignSystem` | Full design system spec — spring configs, audio patterns, tokens, conventions |
| `getComponentPattern` | How to build a specific component type the Ruixen way |
| `getExamples` | Reference implementations for any category (170+ components) |
| `searchComponents` | Find components across the entire library |
| `validateComponent` | Check if generated code follows Ruixen conventions |
| `getInstallCommand` | Get install command for any component (all 4 variants) |

## Spring Physics

Ruixen uses spring physics instead of CSS transitions:

```typescript
// Default spring config
transition={{ type: "spring", stiffness: 400, damping: 28 }}

// Snappy (small UI elements)
transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}

// Bouncy (playful elements)
transition={{ type: "spring", stiffness: 400, damping: 15, mass: 1 }}
```

## Audio Feedback

Every interactive component plays a 3ms noise burst:

```typescript
const playClick = () => {
  const ctx = new AudioContext();
  const len = Math.floor(ctx.sampleRate * 0.003);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.06;
  src.connect(gain).connect(ctx.destination);
  src.start();
};
```

## Component Categories

- **Buttons** (13): slide-to-delete, glow-link, progress, confetti, etc.
- **Inputs** (15): circular-stepper, color-picker, time-picker, tag-input, etc.
- **Navigation** (15): floating-navbar, luma-bar, navbar variants
- **Hero Sections** (8): card-carousel, gradient, video, product
- **Pricing** (6): plans, comparison, subscription, flow
- **Calendars** (11): 3D-wall, planner, twin, range-picker
- **Pagination** (9): wheel, gooey, stack, morphing-dots
- **Accordions** (6): scroll, auto, chat, editorial
- **And 20+ more categories...**

## Example Usage

In Cursor or any MCP-enabled IDE:

```
"Build me a pricing toggle that switches between monthly and annual with spring animation"
```

The AI will:
1. Call `getDesignSystem()` to understand Ruixen conventions
2. Call `getComponentPattern("pricingSections")` for specific guidance
3. Generate a component with spring physics, audio feedback, and proper tokens
4. Optionally call `validateComponent()` to verify it follows the design system

## Install Commands

```bash
# Tailwind v4 (default)
npx shadcn@latest add "https://ruixen.com/r/{component-name}"

# Tailwind v3
npx shadcn@latest add "https://ruixen.com/r/tw3/{component-name}"

# Base UI primitives
npx shadcn@latest add "https://ruixen.com/r/baseui/{component-name}"

# Base UI + Tailwind v3
npx shadcn@latest add "https://ruixen.com/r/baseui/tw3/{component-name}"
```

## No API Key Required

This runs entirely on your machine. The AI is your IDE's built-in model (Cursor, Copilot, Claude). We just provide the design system context.

## Links

- [Ruixen UI](https://ruixen.com)
- [Component Library](https://ruixen.com/docs/components)
- [Playground](https://mcp.ruixen.com)
- [Discord](https://discord.gg/j9fVZm2D)
- [GitHub](https://github.com/ruixenui/mcp)

## License

MIT
