#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Bundled fallbacks (used when API unavailable)
import designSystemFallback from "./data/design-system.json" assert { type: "json" };
import patternsFallback from "./data/patterns.json" assert { type: "json" };
import componentsFallback from "./data/components.json" assert { type: "json" };

// ─── CONFIG ──────────────────────────────────────────────────────

const MCP_API_URL = process.env.RUIXEN_API_URL || "https://mcp.ruixen.com/api/mcp";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── CACHE ───────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: {
  patterns?: CacheEntry<any>;
  designSystem?: CacheEntry<any>;
} = {};

function isCacheValid<T>(entry?: CacheEntry<T>): entry is CacheEntry<T> {
  return !!entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS;
}

// ─── DYNAMIC DATA FETCHING ───────────────────────────────────────

async function fetchLearnedPatterns(category?: string): Promise<any> {
  // Check cache first
  const cacheKey = `patterns_${category || 'all'}`;
  if (isCacheValid(cache.patterns) && !category) {
    return cache.patterns.data;
  }

  try {
    const url = category
      ? `${MCP_API_URL}/patterns?category=${category}&detail=standard`
      : `${MCP_API_URL}/patterns?detail=standard`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();

    // Cache the response
    if (!category) {
      cache.patterns = { data, timestamp: Date.now() };
    }

    return data;
  } catch (error) {
    // Fallback to bundled patterns
    console.error("Failed to fetch patterns, using fallback:", error);
    return {
      source: "fallback",
      patterns: patternsFallback.categories,
    };
  }
}

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

// ─── SERVER SETUP ────────────────────────────────────────────────

const server = new Server(
  {
    name: "@ruixenui/mcp",
    version: "0.2.0", // Updated version with learning
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── COMPRESSED DATA HELPERS ─────────────────────────────────────

function getMinimalDesignSystem() {
  const ds = designSystemFallback as any;
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

function getStandardDesignSystem() {
  const ds = designSystemFallback as any;
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
        "Returns Ruixen design system rules. Use detail='minimal' (~200 tokens), 'standard' (~500), 'full' (~2000). Fetches learned optimizations when available.",
      inputSchema: {
        type: "object" as const,
        properties: {
          detail: {
            type: "string",
            enum: ["minimal", "standard", "full"],
            description: "Level of detail",
          },
        },
      },
    },
    {
      name: "getComponentPattern",
      description:
        "Returns LEARNED pattern for a category. Includes optimized spring values based on user feedback. Automatically improves over time.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            description: "Category: buttons, cards, inputs, pagination, tabs, dialogs, notifications, loaders, navigation",
          },
        },
        required: ["category"],
      },
    },
    {
      name: "searchComponents",
      description: "Search components by name/tag.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default: 10)" },
        },
        required: ["query"],
      },
    },
    {
      name: "validateComponent",
      description: "Validates component code against Ruixen rules.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: { type: "string", description: "React component code" },
        },
        required: ["code"],
      },
    },
    {
      name: "planComponent",
      description: "Creates generation plan for user confirmation. Returns estimated tokens and recommended settings.",
      inputSchema: {
        type: "object" as const,
        properties: {
          description: { type: "string", description: "What component the user wants" },
          category: { type: "string", description: "Component category" },
        },
        required: ["description"],
      },
    },
    {
      name: "getOptimalSpring",
      description: "Returns the BEST spring config for a category based on user feedback data. Uses learned values that have highest acceptance rate.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: { type: "string", description: "Component category" },
        },
        required: ["category"],
      },
    },
    {
      name: "getInstallCommand",
      description: "Get install command for a Ruixen component.",
      inputSchema: {
        type: "object" as const,
        properties: {
          componentName: { type: "string", description: "Component name" },
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
          data = designSystemFallback;
          break;
        default:
          data = getStandardDesignSystem();
      }

      // Try to enrich with learned data
      try {
        const learned = await fetchLearnedPatterns();
        if (learned.source === "learned") {
          data._learned = {
            source: "live",
            updated: learned.updated,
            stats: learned.stats,
          };
        }
      } catch {
        // Ignore, use fallback
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, detail === "full" ? 2 : 0),
        }],
      };
    }

    case "getComponentPattern": {
      const { category } = args as { category: string };

      // Fetch learned patterns for this category
      const learned = await fetchLearnedPatterns(category);

      if (learned.source === "learned" && learned.patterns[category]) {
        const catData = learned.patterns[category];
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              category,
              source: "learned",
              successRate: catData.successRate,
              sampleSize: catData.sampleSize,
              optimalSpring: catData.optimalSpring,
              patterns: catData.learnedPatterns,
              commonEdits: catData.commonEdits,
              tip: "These patterns are optimized based on user feedback",
            }, null, 0),
          }],
        };
      }

      // Fallback to bundled patterns
      const categoriesMap = patternsFallback.categories as Record<string, CategoryPattern>;
      const pattern = categoriesMap[category];

      if (!pattern) {
        return {
          content: [{
            type: "text",
            text: `Unknown: ${category}. Available: ${Object.keys(patternsFallback.categories).join(",")}`,
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            category,
            source: "default",
            pattern: pattern.pattern,
            doNot: pattern.doNot || [],
            spring: (designSystemFallback as any).motion.defaultConfig,
          }, null, 0),
        }],
      };
    }

    case "getOptimalSpring": {
      const { category } = args as { category: string };

      try {
        const learned = await fetchLearnedPatterns(category);
        if (learned.source === "learned" && learned.patterns[category]?.optimalSpring) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                category,
                spring: learned.patterns[category].optimalSpring,
                source: "learned",
                confidence: learned.patterns[category].optimalSpring.confidence || 0,
              }, null, 0),
            }],
          };
        }
      } catch {
        // Fallback below
      }

      // Return default spring
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            category,
            spring: { stiffness: 400, damping: 28, mass: 1 },
            source: "default",
          }, null, 0),
        }],
      };
    }

    case "searchComponents": {
      const { query, limit = 10 } = args as { query: string; limit?: number };
      const q = query.toLowerCase();
      const componentsList = (componentsFallback as { components: Component[] }).components;

      const results = componentsList
        .filter((c: Component) =>
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
        content: [{
          type: "text",
          text: JSON.stringify({ q: query, n: results.length, r: results }, null, 0),
        }],
      };
    }

    case "validateComponent": {
      const code = (args as { code: string }).code;
      const issues: string[] = [];
      const ok: string[] = [];

      if (/transition-duration|ease-in|ease-out|cubic-bezier/.test(code)) {
        issues.push("CSS timing found - use spring");
      }
      if (!/motion|framer-motion/.test(code)) {
        issues.push("No motion/react import");
      }
      if (!/export\s+default/.test(code)) {
        issues.push("No default export");
      }

      if (/stiffness.*damping|type.*spring/.test(code)) ok.push("Spring OK");
      if (/AudioContext|useSound/.test(code)) ok.push("Audio OK");
      if (/interface.*Props/.test(code)) ok.push("Types OK");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ valid: issues.length === 0, issues, ok }, null, 0),
        }],
      };
    }

    case "planComponent": {
      const { description, category } = args as { description: string; category?: string };

      const hasAnimation = /animat|motion|spring|hover|click|press/i.test(description);
      const hasInteraction = /button|click|toggle|select|input|form/i.test(description);
      const isComplex = /dashboard|form|table|calendar|wizard/i.test(description);

      const features: string[] = [];
      if (hasAnimation) features.push("Spring animations");
      if (hasInteraction) features.push("Audio feedback");
      features.push("Dark mode");
      features.push("TypeScript");

      const complexity = isComplex ? "complex" : hasInteraction ? "medium" : "simple";
      const estimatedTokens = { simple: 800, medium: 1500, complex: 2500 }[complexity];

      // Try to get optimal spring for detected category
      let optimalSpring = { stiffness: 400, damping: 28, mass: 1 };
      const detectedCat = category || (hasInteraction ? "buttons" : "custom");

      try {
        const learned = await fetchLearnedPatterns(detectedCat);
        if (learned.patterns?.[detectedCat]?.optimalSpring) {
          optimalSpring = learned.patterns[detectedCat].optimalSpring;
        }
      } catch {
        // Use default
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            plan: {
              component: description.slice(0, 50),
              category: detectedCat,
              features,
              spring: optimalSpring,
              audio: hasInteraction,
              tokens: estimatedTokens,
              prompt: complexity === "complex" ? "full" : "standard",
            },
            confirm: "Reply 'proceed' to generate",
          }, null, 2),
        }],
      };
    }

    case "getInstallCommand": {
      const componentName = (args as { componentName: string }).componentName;
      const componentsList = (componentsFallback as { components: Component[] }).components;

      const comp = componentsList.find(
        (c: Component) => c.name.toLowerCase() === componentName.toLowerCase()
      );

      if (!comp) {
        const similar = componentsList
          .filter((c: Component) => c.name.toLowerCase().includes(componentName.toLowerCase()))
          .slice(0, 3)
          .map((c: Component) => c.name);

        return {
          content: [{
            type: "text",
            text: similar.length
              ? `Not found. Similar: ${similar.join(", ")}`
              : `Not found: ${componentName}`,
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            name: comp.name,
            cmd: comp.install.tw4,
            deps: comp.dependencies,
          }, null, 0),
        }],
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
  console.error("Ruixen MCP v0.2.0 (Learning Enabled)");
}

main().catch(console.error);
