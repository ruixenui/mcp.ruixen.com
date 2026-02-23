#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import designSystem from "./data/design-system.json" assert { type: "json" };
import patterns from "./data/patterns.json" assert { type: "json" };
import components from "./data/components.json" assert { type: "json" };

const server = new Server(
  {
    name: "@ruixenui/mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── TYPES ───────────────────────────────────────────────────────

interface Component {
  name: string;
  category: string;
  description: string;
  install: {
    tw4: string;
    tw3: string;
    baseui: string;
    "baseui-tw3": string;
  };
  dependencies: string[];
  tags: string[];
}

interface CategoryPattern {
  description: string;
  count: number;
  pattern: Record<string, string>;
  exampleNames: string[];
  doNot?: string[];
}

// ─── TOOL DEFINITIONS ────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "getDesignSystem",
      description:
        "Returns the complete Ruixen UI design system: spring physics configs, audio feedback patterns, design tokens, color system, typography, spacing, and component conventions. CALL THIS FIRST before generating any component — it contains the rules that make a component feel like Ruixen.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "getComponentPattern",
      description:
        "Returns the Ruixen pattern for building a specific type of component (e.g., 'buttons', 'cards', 'pagination', 'dialogs'). Includes spring configs, animation patterns, audio rules, do's and don'ts for that component type.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            description:
              "Component category: buttons, cards, inputs, pagination, tabs, dialogs, notifications, loaders, backgrounds, navigation, docks, calendars, tables, forms, heroSections, pricingSections, accordions, avatars, textEffects, steppers, drawers, menus, footers, clients, audio, chat, checkboxes, trees, banners, breadcrumbs, badges, images, video, selects, comments",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "getExamples",
      description:
        "Returns example component names and their key patterns for a given category. Use these as reference when generating new components. Also returns install commands.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            description: "Component category to get examples for",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "searchComponents",
      description:
        "Search across all 170+ Ruixen UI components by name or tag. Returns matching components with their install commands for all 4 registry variants (Tailwind v4, v3, Base UI, Base UI + Tailwind v3).",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search query (component name, tag, or description keyword)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "validateComponent",
      description:
        "Validates generated component code against the Ruixen design system rules. Returns a list of issues if the code doesn't follow Ruixen conventions (e.g., using CSS transitions instead of springs, missing audio feedback, wrong token usage).",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: {
            type: "string",
            description: "The React component code to validate",
          },
        },
        required: ["code"],
      },
    },
    {
      name: "getInstallCommand",
      description:
        "Returns the exact install command for any Ruixen UI component across all 4 registry variants.",
      inputSchema: {
        type: "object" as const,
        properties: {
          componentName: {
            type: "string",
            description: "The component name (e.g., 'gooey-pagination', 'spring-button')",
          },
        },
        required: ["componentName"],
      },
    },
  ],
}));

// ─── TOOL HANDLERS ───────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "getDesignSystem": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(designSystem, null, 2),
          },
        ],
      };
    }

    case "getComponentPattern": {
      const category = (args as { category: string }).category;
      const categoriesMap = patterns.categories as Record<string, CategoryPattern>;
      const pattern = categoriesMap[category];

      if (!pattern) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown category: ${category}. Available categories: ${Object.keys(patterns.categories).join(", ")}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                category,
                ...pattern,
                designSystemReminder: {
                  spring: (designSystem as any).motion.defaultConfig,
                  audioImplementation: (designSystem as any).audio.implementation,
                  conventions: (designSystem as any).conventions,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "getExamples": {
      const cat = (args as { category: string }).category;
      const categoriesMap = patterns.categories as Record<string, CategoryPattern>;
      const p = categoriesMap[cat];

      if (!p) {
        return {
          content: [{ type: "text", text: `Unknown category: ${cat}. Available: ${Object.keys(patterns.categories).join(", ")}` }],
        };
      }

      const componentsList = (components as { components: Component[] }).components;
      const examples = componentsList
        .filter((c: Component) => c.category === cat)
        .map((c: Component) => ({
          name: c.name,
          description: c.description,
          install: c.install,
          dependencies: c.dependencies,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: cat,
              patternGuidance: p.pattern,
              doNot: p.doNot || [],
              examples
            }, null, 2),
          },
        ],
      };
    }

    case "searchComponents": {
      const query = ((args as { query: string }).query || "").toLowerCase();
      const componentsList = (components as { components: Component[] }).components;

      const results = componentsList.filter(
        (c: Component) =>
          c.name.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.tags.some((t: string) => t.toLowerCase().includes(query)) ||
          c.category.toLowerCase().includes(query)
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                resultCount: results.length,
                results: results.slice(0, 25).map((c: Component) => ({
                  name: c.name,
                  category: c.category,
                  description: c.description,
                  install: c.install,
                  dependencies: c.dependencies,
                })),
                tip: results.length > 25 ? `Showing first 25 of ${results.length} results. Try a more specific query.` : undefined,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "validateComponent": {
      const code = (args as { code: string }).code;
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check for CSS transitions (anti-pattern in Ruixen)
      if (/transition\s*[:=]/.test(code) && !/transition\s*[:=]\s*\{.*type.*spring/s.test(code)) {
        issues.push(
          "MOTION: Using CSS transition instead of spring physics. Replace with motion/react spring: transition={{ type: 'spring', stiffness: 400, damping: 28 }}"
        );
      }

      if (/transition-duration|transition-all|ease-in|ease-out|ease-in-out|cubic-bezier/.test(code)) {
        issues.push(
          "MOTION: Found CSS timing function. Ruixen components use spring physics — duration and easing are determined by stiffness/damping/mass, not fixed timing."
        );
      }

      // Check for duration-based animations
      if (/duration:\s*\d|duration=|\d+ms|\d+s/.test(code) && !/duration.*0/.test(code)) {
        warnings.push(
          "MOTION: Found duration-based animation. Consider using spring physics instead for more natural motion."
        );
      }

      // Check for spring physics
      if (!/motion\.|framer-motion|motion\/react/.test(code)) {
        issues.push(
          "MOTION: No motion/react import found. Ruixen components require spring animations. Add: import { motion } from 'motion/react';"
        );
      }

      // Check for audio feedback
      if (/onClick|onPointerDown|onChange|onToggle/.test(code)) {
        if (!/AudioContext|playClick|useClickSound|sound/.test(code)) {
          warnings.push(
            "AUDIO: Interactive component detected but no audio feedback found. Ruixen components play a 3ms noise burst on state changes. Consider adding the audio feedback pattern from getDesignSystem()."
          );
        }
      }

      // Check for proper import structure
      if (/from\s+['"]framer-motion['"]/.test(code)) {
        warnings.push(
          "IMPORT: Using 'framer-motion' import. Ruixen prefers 'motion/react' (the new package name): import { motion } from 'motion/react';"
        );
      }

      // Check for cn utility usage
      if (/className=\{.*\+.*\}|className=\{`/.test(code) && !/cn\(/.test(code)) {
        warnings.push(
          "CONVENTION: Using string concatenation for className. Use cn() utility (clsx + tailwind-merge) for cleaner conditional classes."
        );
      }

      // Check for default export
      if (!/export\s+default/.test(code)) {
        warnings.push(
          "CONVENTION: Missing default export. Ruixen components use default export with no required props."
        );
      }

      // Check for TypeScript interface
      if (!/interface\s+\w+Props/.test(code)) {
        warnings.push(
          "TYPESCRIPT: No props interface found. Ruixen components use explicit TypeScript interfaces for props."
        );
      }

      // Check for AnimatePresence for conditional rendering
      if (/\{.*&&.*<motion\./.test(code) || /\{.*\?.*<motion\./.test(code)) {
        if (!/AnimatePresence/.test(code)) {
          warnings.push(
            "MOTION: Conditional motion component detected without AnimatePresence. Wrap conditional motion elements with AnimatePresence for proper exit animations."
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                valid: issues.length === 0,
                issueCount: issues.length,
                warningCount: warnings.length,
                issues,
                warnings,
                tip:
                  issues.length === 0 && warnings.length === 0
                    ? "Component follows the Ruixen design system."
                    : issues.length === 0
                    ? "Component is valid but has minor suggestions. The warnings above are optional improvements."
                    : "Fix the issues above to make this component feel like Ruixen. Call getDesignSystem() for the full spec.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "getInstallCommand": {
      const componentName = (args as { componentName: string }).componentName;
      const componentsList = (components as { components: Component[] }).components;

      const comp = componentsList.find(
        (c: Component) => c.name.toLowerCase() === componentName.toLowerCase()
      );

      if (!comp) {
        // Try fuzzy match
        const fuzzyMatches = componentsList.filter(
          (c: Component) => c.name.toLowerCase().includes(componentName.toLowerCase())
        );

        if (fuzzyMatches.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `Exact match for "${componentName}" not found.`,
                  didYouMean: fuzzyMatches.slice(0, 5).map((c: Component) => c.name),
                  suggestion: `Try one of the above component names, or use searchComponents to find what you're looking for.`,
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Component "${componentName}" not found. Use searchComponents to find available components.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                component: comp.name,
                category: comp.category,
                description: comp.description,
                install: comp.install,
                dependencies: comp.dependencies,
                note: "Default (tw4) is Tailwind v4. Use tw3 for Tailwind v3, baseui for Base UI primitives, baseui-tw3 for Base UI + Tailwind v3.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
  }
});

// ─── START SERVER ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ruixen UI MCP Server running...");
}

main().catch(console.error);
