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

type DetailLevel = "minimal" | "standard" | "full";

// ─── COMPRESSED DATA HELPERS ─────────────────────────────────────

/**
 * Returns minimal design system (~200 tokens vs ~2000 for full)
 */
function getMinimalDesignSystem() {
  const ds = designSystem as any;
  return {
    spring: ds.motion.defaultConfig,
    presets: {
      snappy: "s:500,d:30,m:0.8",
      smooth: "s:300,d:25,m:1",
      bouncy: "s:400,d:15,m:1",
      heavy: "s:200,d:20,m:2",
    },
    audio: `useSound: 3ms noise, gain:${ds.audio.config.gain}`,
    import: ds.motion.importStatement,
    rules: [
      "Never CSS transition/duration/ease",
      "Always motion/react springs",
      "Audio on interactions",
    ],
  };
}

/**
 * Returns standard design system (~500 tokens)
 */
function getStandardDesignSystem() {
  const ds = designSystem as any;
  return {
    motion: {
      default: ds.motion.defaultConfig,
      presets: ds.motion.presets,
      import: ds.motion.importStatement,
    },
    audio: {
      config: ds.audio.config,
      hook: "const useSound=(e=true)=>{const p=()=>{if(!e)return;const c=new AudioContext(),l=c.sampleRate*.003|0,b=c.createBuffer(1,l,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<l;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/l,4);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=.06;s.connect(g).connect(c.destination);s.start()};return p};",
    },
    conventions: ds.conventions,
    cn: "const cn=(...a)=>twMerge(clsx(a));",
  };
}

// ─── TOOL DEFINITIONS ────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "getDesignSystem",
      description:
        "Returns Ruixen design system rules. Use detail='minimal' for token efficiency (~200 tokens), 'standard' for balanced (~500 tokens), 'full' for complete spec (~2000 tokens). Default: standard.",
      inputSchema: {
        type: "object" as const,
        properties: {
          detail: {
            type: "string",
            enum: ["minimal", "standard", "full"],
            description: "Level of detail: minimal (200 tokens), standard (500 tokens), full (2000 tokens)",
          },
        },
      },
    },
    {
      name: "getComponentPattern",
      description:
        "Returns pattern for a component category. Includes spring configs, animation rules, do's and don'ts.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            description: "Category: buttons, cards, inputs, pagination, tabs, dialogs, notifications, loaders, backgrounds, navigation, docks, calendars, tables, forms, heroSections, pricingSections",
          },
          includeExamples: {
            type: "boolean",
            description: "Include example component names (default: false to save tokens)",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "searchComponents",
      description:
        "Search components by name/tag. Returns matching components with install commands.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          limit: {
            type: "number",
            description: "Max results (default: 10)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "validateComponent",
      description:
        "Validates component code against Ruixen rules. Returns issues and warnings.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: {
            type: "string",
            description: "React component code to validate",
          },
        },
        required: ["code"],
      },
    },
    {
      name: "planComponent",
      description:
        "Creates a generation plan for user confirmation before generating. Returns structured plan with estimated tokens.",
      inputSchema: {
        type: "object" as const,
        properties: {
          description: {
            type: "string",
            description: "What component the user wants",
          },
          category: {
            type: "string",
            description: "Component category",
          },
        },
        required: ["description"],
      },
    },
    {
      name: "getInstallCommand",
      description:
        "Get install command for a Ruixen component.",
      inputSchema: {
        type: "object" as const,
        properties: {
          componentName: {
            type: "string",
            description: "Component name",
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
      const detail = ((args as { detail?: string }).detail || "standard") as DetailLevel;

      let data: any;
      switch (detail) {
        case "minimal":
          data = getMinimalDesignSystem();
          break;
        case "full":
          data = designSystem;
          break;
        default:
          data = getStandardDesignSystem();
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, detail === "full" ? 2 : 0),
          },
        ],
      };
    }

    case "getComponentPattern": {
      const { category, includeExamples } = args as { category: string; includeExamples?: boolean };
      const categoriesMap = patterns.categories as Record<string, CategoryPattern>;
      const pattern = categoriesMap[category];

      if (!pattern) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown: ${category}. Available: ${Object.keys(patterns.categories).join(",")}`,
            },
          ],
        };
      }

      const response: any = {
        category,
        pattern: pattern.pattern,
        doNot: pattern.doNot || [],
      };

      if (includeExamples) {
        response.examples = pattern.exampleNames;
      }

      // Add minimal spring reminder
      response.spring = (designSystem as any).motion.defaultConfig;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 0),
          },
        ],
      };
    }

    case "searchComponents": {
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const q = query.toLowerCase();
      const componentsList = (components as { components: Component[] }).components;

      const results = componentsList
        .filter(
          (c: Component) =>
            c.name.toLowerCase().includes(q) ||
            c.tags.some((t: string) => t.toLowerCase().includes(q)) ||
            c.category.toLowerCase().includes(q)
        )
        .slice(0, limit)
        .map((c: Component) => ({
          name: c.name,
          cat: c.category,
          cmd: c.install.tw4,
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ q: query, n: results.length, r: results }, null, 0),
          },
        ],
      };
    }

    case "validateComponent": {
      const code = (args as { code: string }).code;
      const issues: string[] = [];
      const ok: string[] = [];

      // Critical checks
      if (/transition-duration|ease-in|ease-out|cubic-bezier/.test(code)) {
        issues.push("CSS timing found - use spring");
      }
      if (!/motion|framer-motion/.test(code)) {
        issues.push("No motion/react import");
      }
      if (!/export\s+default/.test(code)) {
        issues.push("No default export");
      }

      // Positive checks
      if (/stiffness.*damping|type.*spring/.test(code)) ok.push("Spring OK");
      if (/AudioContext|useSound/.test(code)) ok.push("Audio OK");
      if (/interface.*Props/.test(code)) ok.push("Types OK");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              valid: issues.length === 0,
              issues,
              ok,
            }, null, 0),
          },
        ],
      };
    }

    case "planComponent": {
      const { description, category } = args as { description: string; category?: string };

      // Analyze the description to create a plan
      const hasAnimation = /animat|motion|spring|hover|click|press/i.test(description);
      const hasInteraction = /button|click|toggle|select|input|form/i.test(description);
      const isComplex = /dashboard|form|table|calendar|wizard/i.test(description);

      const features: string[] = [];
      if (hasAnimation) features.push("Spring animations");
      if (hasInteraction) features.push("Audio feedback");
      features.push("Dark mode support");
      features.push("TypeScript props");

      const complexity = isComplex ? "complex" : hasInteraction ? "medium" : "simple";
      const estimatedTokens = { simple: 800, medium: 1500, complex: 2500 }[complexity];

      const plan = {
        component: description.slice(0, 50),
        category: category || "custom",
        features,
        spring: hasAnimation ? "bouncy" : "default",
        audio: hasInteraction,
        tokens: estimatedTokens,
        prompt: complexity === "complex" ? "full" : "standard",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              plan,
              confirm: "Reply 'proceed' to generate, or describe adjustments",
            }, null, 2),
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
        const similar = componentsList
          .filter((c: Component) => c.name.toLowerCase().includes(componentName.toLowerCase()))
          .slice(0, 3)
          .map((c: Component) => c.name);

        return {
          content: [
            {
              type: "text",
              text: similar.length
                ? `Not found. Similar: ${similar.join(", ")}`
                : `Not found: ${componentName}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name: comp.name,
              cmd: comp.install.tw4,
              deps: comp.dependencies,
            }, null, 0),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown: ${name}` }],
      };
  }
});

// ─── START SERVER ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ruixen MCP running");
}

main().catch(console.error);
