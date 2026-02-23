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

// ─── DNA TYPES ───────────────────────────────────────────────────

interface ComponentDNA {
  type: string;
  interaction: string[];
  a11y: string[];
  layout: string[];
  animation: string[];
  variants: string[];
}

// ─── DNA ENRICHMENT RULES (Pure Code) ────────────────────────────

function enrichDNA(dna: ComponentDNA): ComponentDNA {
  const enriched = { ...dna };

  // Overlay components need portal
  if (["dropdown", "select", "modal", "dialog", "drawer", "popover", "tooltip", "menu"].includes(dna.type)) {
    if (!enriched.layout.includes("portal")) enriched.layout.push("portal");
  }

  // Interactive components need click + keyboard
  if (["button", "checkbox", "radio", "switch", "dropdown", "select"].includes(dna.type)) {
    if (!enriched.interaction.includes("click")) enriched.interaction.push("click");
    if (!enriched.interaction.includes("keyboard")) enriched.interaction.push("keyboard");
  }

  // Overlays need outside-dismiss
  if (["dropdown", "select", "popover", "menu"].includes(dna.type)) {
    if (!enriched.interaction.includes("outside-dismiss")) enriched.interaction.push("outside-dismiss");
  }

  // Modals need focus-trap + escape
  if (["modal", "dialog", "drawer"].includes(dna.type)) {
    if (!enriched.a11y.includes("focus-trap")) enriched.a11y.push("focus-trap");
    if (!enriched.interaction.includes("escape-dismiss")) enriched.interaction.push("escape-dismiss");
  }

  // Expandable needs aria-expanded
  if (["dropdown", "select", "accordion", "popover", "menu"].includes(dna.type)) {
    if (!enriched.a11y.includes("aria-expanded")) enriched.a11y.push("aria-expanded");
  }

  // Animation requires reduced-motion support
  if (enriched.animation.length > 0 && !enriched.a11y.includes("reduced-motion")) {
    enriched.a11y.push("reduced-motion");
  }

  // Default spring animation for interactive components
  if (enriched.animation.length === 0 && ["button", "card", "dropdown", "modal"].includes(dna.type)) {
    enriched.animation.push("spring");
  }

  return enriched;
}

// ─── DNA FINGERPRINT ─────────────────────────────────────────────

function createDNAFingerprint(dna: ComponentDNA): string {
  const normalized = {
    type: dna.type,
    interaction: [...dna.interaction].sort(),
    a11y: [...dna.a11y].sort(),
    layout: [...dna.layout].sort(),
    animation: [...dna.animation].sort(),
    variants: [...dna.variants].sort(),
  };

  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }

  return `dna_${dna.type}_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// ─── DNA PARSER (Local, Zero Tokens) ─────────────────────────────

function parseDNALocally(input: string): ComponentDNA | null {
  const lower = input.toLowerCase();

  const typePatterns: [RegExp, string][] = [
    [/\b(dropdown|drop-down)\b/, "dropdown"],
    [/\b(select|selector)\b/, "select"],
    [/\b(modal|popup)\b/, "modal"],
    [/\b(dialog)\b/, "dialog"],
    [/\b(drawer|panel)\b/, "drawer"],
    [/\b(popover)\b/, "popover"],
    [/\b(tooltip)\b/, "tooltip"],
    [/\b(menu)\b/, "menu"],
    [/\b(tabs?)\b/, "tabs"],
    [/\b(accordion|collapsible)\b/, "accordion"],
    [/\b(card)\b/, "card"],
    [/\b(button|btn)\b/, "button"],
    [/\b(input|text-field)\b/, "input"],
    [/\b(checkbox)\b/, "checkbox"],
    [/\b(switch|toggle)\b/, "switch"],
    [/\b(toast|notification)\b/, "toast"],
    [/\b(avatar)\b/, "avatar"],
    [/\b(loader|spinner)\b/, "loader"],
    [/\b(pagination)\b/, "pagination"],
    [/\b(navigation|nav)\b/, "navigation"],
    [/\b(table)\b/, "table"],
    [/\b(calendar)\b/, "calendar"],
  ];

  let type: string | null = null;
  for (const [pattern, t] of typePatterns) {
    if (pattern.test(lower)) {
      type = t;
      break;
    }
  }

  if (!type) return null;

  const dna: ComponentDNA = {
    type,
    interaction: [],
    a11y: [],
    layout: [],
    animation: [],
    variants: [],
  };

  // Parse features
  if (/click|press/.test(lower)) dna.interaction.push("click");
  if (/hover/.test(lower)) dna.interaction.push("hover");
  if (/keyboard|arrow|enter/.test(lower)) dna.interaction.push("keyboard");
  if (/outside|dismiss/.test(lower)) dna.interaction.push("outside-dismiss");
  if (/escape/.test(lower)) dna.interaction.push("escape-dismiss");
  if (/focus-trap/.test(lower)) dna.a11y.push("focus-trap");
  if (/portal/.test(lower)) dna.layout.push("portal");
  if (/spring|bouncy/.test(lower)) dna.animation.push("spring");
  if (/multi/.test(lower)) dna.variants.push("multi-select");

  return dna;
}

// ─── SPRING FROM DNA ─────────────────────────────────────────────

function getSpringFromDNA(dna: ComponentDNA): { stiffness: number; damping: number; mass: number } {
  if (dna.animation.includes("spring-snappy") || dna.type === "button") {
    return { stiffness: 500, damping: 30, mass: 0.8 };
  }
  if (dna.animation.includes("spring-smooth") || ["modal", "dialog", "drawer"].includes(dna.type)) {
    return { stiffness: 300, damping: 25, mass: 1 };
  }
  if (dna.animation.includes("spring-bouncy") || ["toast", "notification"].includes(dna.type)) {
    return { stiffness: 400, damping: 15, mass: 1 };
  }
  return { stiffness: 400, damping: 28, mass: 1 };
}

// ─── CODE VALIDATION ──────────────────────────────────────────────

interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  fix: string;
}

function validateGeneratedCode(code: string, dna: ComponentDNA): { valid: boolean; score: number; issues: ValidationIssue[]; passed: string[] } {
  const issues: ValidationIssue[] = [];
  const passed: string[] = [];

  // Portal check
  if (["dropdown", "select", "modal", "dialog", "drawer", "popover", "tooltip", "menu"].includes(dna.type)) {
    if (/createPortal|Portal|FloatingPortal|@floating-ui/.test(code)) {
      passed.push("PORTAL");
    } else {
      issues.push({ severity: "error", code: "NO_PORTAL", message: "No portal — dropdown will break inside transformed parents", fix: "Use createPortal or FloatingPortal" });
    }
  }

  // Keyboard navigation check
  if (dna.interaction.includes("keyboard")) {
    if (/onKeyDown|handleKeyDown|ArrowUp|ArrowDown|Enter|Escape/.test(code)) {
      passed.push("KEYBOARD_NAV");
    } else {
      issues.push({ severity: "error", code: "NO_KEYBOARD_NAV", message: "No keyboard navigation — fails WCAG 2.1", fix: "Add onKeyDown with Arrow keys, Enter, Escape" });
    }
  }

  // Reduced motion check
  if (dna.animation.length > 0) {
    if (/prefers-reduced-motion|reducedMotion|useReducedMotion|motion-reduce/.test(code)) {
      passed.push("REDUCED_MOTION");
    } else {
      issues.push({ severity: "error", code: "NO_REDUCED_MOTION", message: "Animation ignores prefers-reduced-motion", fix: "Add useReducedMotion hook or motion-reduce CSS" });
    }
  }

  // Fixed height check for expandable components
  if (["accordion", "dropdown", "select", "popover", "menu"].includes(dna.type)) {
    if (!/height:\s*\d+px/.test(code) || /height.*auto|useMeasure|getBoundingClientRect/.test(code)) {
      passed.push("DYNAMIC_HEIGHT");
    } else {
      issues.push({ severity: "error", code: "FIXED_HEIGHT", message: "Uses fixed height — won't handle dynamic content", fix: "Use auto height with useMeasure for animation" });
    }
  }

  // Velocity inheritance check
  if (dna.animation.some(a => a.startsWith("spring")) && ["dropdown", "modal", "drawer", "accordion", "toast"].includes(dna.type)) {
    if (/velocity|useSpring|useMotionValue/.test(code)) {
      passed.push("VELOCITY_INHERIT");
    } else {
      issues.push({ severity: "warning", code: "NO_VELOCITY_INHERIT", message: "Spring animation has no velocity inheritance on interrupt", fix: "Use useSpring or pass velocity state" });
    }
  }

  // Focus trap check for modals
  if (["modal", "dialog", "drawer"].includes(dna.type)) {
    if (/FocusTrap|useFocusTrap|focus-trap/.test(code)) {
      passed.push("FOCUS_TRAP");
    } else {
      issues.push({ severity: "error", code: "NO_FOCUS_TRAP", message: "No focus trap — modal allows focus to escape", fix: "Use FocusTrap component or useFocusTrap hook" });
    }
  }

  // Aria attributes check
  if (["dropdown", "select", "accordion", "popover", "menu"].includes(dna.type)) {
    if (/aria-expanded/.test(code)) {
      passed.push("ARIA_EXPANDED");
    } else {
      issues.push({ severity: "error", code: "NO_ARIA_EXPANDED", message: "Missing aria-expanded", fix: "Add aria-expanded={isOpen}" });
    }
  }

  // CSS transition check (should use spring)
  if (dna.animation.some(a => a.startsWith("spring"))) {
    if (!/transition-duration|ease-in|ease-out|cubic-bezier/.test(code)) {
      passed.push("NO_CSS_TRANSITION");
    } else {
      issues.push({ severity: "error", code: "CSS_TRANSITION", message: "CSS transition found — should use spring physics", fix: "Replace with motion/react spring" });
    }
  }

  // Calculate score
  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const score = Math.max(0, 100 - errorCount * 10 - warningCount * 5);

  return { valid: errorCount === 0, score, issues, passed };
}

// ─── SERVER SETUP ────────────────────────────────────────────────

const server = new Server(
  {
    name: "@ruixenui/mcp",
    version: "0.3.1", // DNA validation added
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
    // ═══════════════════════════════════════════════════════════════
    // DNA TOOLS - Zero-token component generation
    // ═══════════════════════════════════════════════════════════════
    {
      name: "parseDNA",
      description:
        "Parse natural language into Component DNA. This is a ZERO-token operation - no AI needed. Returns structured DNA for registry lookup. Use this FIRST before any generation.",
      inputSchema: {
        type: "object" as const,
        properties: {
          input: {
            type: "string",
            description: "Natural language description (e.g., 'dropdown with portal and focus trap')",
          },
        },
        required: ["input"],
      },
    },
    {
      name: "enrichDNA",
      description:
        "Enrich DNA with Ruixen design rules. ZERO tokens - pure code. Adds required features automatically (e.g., dropdown gets portal, modal gets focus-trap). Always call after parseDNA.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dna: {
            type: "object",
            description: "ComponentDNA object from parseDNA",
          },
        },
        required: ["dna"],
      },
    },
    {
      name: "getDNAFingerprint",
      description:
        "Get unique fingerprint for DNA. Same DNA always returns same hash. Use for registry lookup.",
      inputSchema: {
        type: "object" as const,
        properties: {
          dna: {
            type: "object",
            description: "ComponentDNA object",
          },
        },
        required: ["dna"],
      },
    },
    {
      name: "lookupDNA",
      description:
        "MASTER TOOL: Parse input → Enrich DNA → Get fingerprint → Return component spec. One call, zero AI tokens. Use this for any component request.",
      inputSchema: {
        type: "object" as const,
        properties: {
          input: {
            type: "string",
            description: "Natural language component description",
          },
        },
        required: ["input"],
      },
    },
    {
      name: "validateGeneratedCode",
      description:
        "Validates generated code against DNA requirements. Checks for: portal usage, keyboard nav, reduced-motion, dynamic height, velocity inheritance, focus traps, aria attributes. Returns issues with fixes.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: {
            type: "string",
            description: "Generated React component code",
          },
          dna: {
            type: "object",
            description: "ComponentDNA object the code should implement",
          },
        },
        required: ["code", "dna"],
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

    // ═══════════════════════════════════════════════════════════════
    // DNA TOOL HANDLERS - Zero-token component generation
    // ═══════════════════════════════════════════════════════════════

    case "parseDNA": {
      const { input } = args as { input: string };

      const dna = parseDNALocally(input);

      if (!dna) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Could not parse component type from input",
              hint: "Try including a component type like: button, dropdown, modal, card, etc.",
            }, null, 0),
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            dna,
            tokens: 0,
            note: "Local parse - zero AI tokens used",
          }, null, 0),
        }],
      };
    }

    case "enrichDNA": {
      const { dna } = args as { dna: ComponentDNA };

      if (!dna || !dna.type) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Invalid DNA object - must have 'type' field",
            }, null, 0),
          }],
        };
      }

      // Ensure arrays exist
      const normalizedDNA: ComponentDNA = {
        type: dna.type,
        interaction: dna.interaction || [],
        a11y: dna.a11y || [],
        layout: dna.layout || [],
        animation: dna.animation || [],
        variants: dna.variants || [],
      };

      const enriched = enrichDNA(normalizedDNA);
      const spring = getSpringFromDNA(enriched);

      // Calculate what was added
      const added = {
        interaction: enriched.interaction.filter(i => !normalizedDNA.interaction.includes(i)),
        a11y: enriched.a11y.filter(a => !normalizedDNA.a11y.includes(a)),
        layout: enriched.layout.filter(l => !normalizedDNA.layout.includes(l)),
        animation: enriched.animation.filter(a => !normalizedDNA.animation.includes(a)),
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            enriched,
            spring,
            added,
            tokens: 0,
            note: "Pure code enrichment - zero AI tokens used",
          }, null, 0),
        }],
      };
    }

    case "getDNAFingerprint": {
      const { dna } = args as { dna: ComponentDNA };

      if (!dna || !dna.type) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Invalid DNA object",
            }, null, 0),
          }],
        };
      }

      const fingerprint = createDNAFingerprint(dna);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            fingerprint,
            dna,
            tokens: 0,
          }, null, 0),
        }],
      };
    }

    case "lookupDNA": {
      const { input } = args as { input: string };

      // Step 1: Parse
      const parsed = parseDNALocally(input);

      if (!parsed) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              stage: "parse",
              error: "Could not identify component type",
              hint: "Include a type: button, dropdown, modal, card, tabs, accordion, etc.",
              tokens: 0,
            }, null, 0),
          }],
        };
      }

      // Step 2: Enrich
      const enriched = enrichDNA(parsed);

      // Step 3: Get spring config
      const spring = getSpringFromDNA(enriched);

      // Step 4: Generate fingerprint
      const fingerprint = createDNAFingerprint(enriched);

      // Step 5: Build generation spec
      const spec = {
        type: enriched.type,
        features: [
          ...enriched.interaction.map(i => `interaction:${i}`),
          ...enriched.a11y.map(a => `a11y:${a}`),
          ...enriched.layout.map(l => `layout:${l}`),
          ...enriched.animation.map(a => `animation:${a}`),
          ...enriched.variants.map(v => `variant:${v}`),
        ],
        spring,
        imports: [
          "import { motion } from 'motion/react';",
          enriched.interaction.includes("click") ? "const useSound = (e=true) => { /* audio hook */ };" : null,
          enriched.layout.includes("portal") ? "import { createPortal } from 'react-dom';" : null,
        ].filter(Boolean),
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            fingerprint,
            pipeline: {
              input,
              parsed,
              enriched,
            },
            spec,
            tokens: {
              parse: 0,
              enrich: 0,
              lookup: 0,
              total: 0,
            },
            note: "Complete DNA pipeline - ZERO AI tokens. Use fingerprint for registry lookup.",
          }, null, 2),
        }],
      };
    }

    case "validateGeneratedCode": {
      const { code, dna } = args as { code: string; dna: ComponentDNA };

      if (!code || !dna || !dna.type) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Both code and dna are required",
            }, null, 0),
          }],
        };
      }

      // Normalize DNA
      const normalizedDNA: ComponentDNA = {
        type: dna.type,
        interaction: dna.interaction || [],
        a11y: dna.a11y || [],
        layout: dna.layout || [],
        animation: dna.animation || [],
        variants: dna.variants || [],
      };

      // Enrich first to get full requirements
      const enriched = enrichDNA(normalizedDNA);

      // Validate against enriched DNA
      const result = validateGeneratedCode(code, enriched);

      // Format output
      const summary: string[] = [];
      for (const issue of result.issues) {
        const icon = issue.severity === "error" ? "❌" : "⚠️";
        summary.push(`${icon} ${issue.message}`);
      }
      for (const p of result.passed) {
        summary.push(`✅ ${p.replace(/_/g, " ")}`);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            valid: result.valid,
            score: result.score,
            summary: summary.join("\n"),
            issues: result.issues,
            passed: result.passed,
            note: result.valid
              ? "All validation checks passed"
              : `${result.issues.filter(i => i.severity === "error").length} errors, ${result.issues.filter(i => i.severity === "warning").length} warnings`,
          }, null, 2),
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
  console.error("Ruixen MCP v0.3.1 (DNA + Validation)");
}

main().catch(console.error);
