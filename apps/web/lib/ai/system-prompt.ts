/**
 * Ruixen UI System Prompts — Token-optimized
 *
 * V1 (full):     ~400 tokens — complex + data viz
 * V2 (standard): ~250 tokens — most generations
 * V3 (minimal):  ~60 tokens  — simple tweaks
 */

// ─── CORE DESIGN TOKENS (Reference, not sent to AI) ─────────────
export const RUIXEN_CORE = {
  spring: { type: "spring", stiffness: 400, damping: 28, mass: 1 },
  presets: {
    snappy: { s: 500, d: 30, m: 0.8 },
    smooth: { s: 300, d: 25, m: 1 },
    bouncy: { s: 400, d: 15, m: 1 },
    heavy: { s: 200, d: 20, m: 2 },
  },
  audio: {
    duration: 0.003,
    gain: 0.06,
    decay: 4,
  },
} as const;

// Backtick-free fence token (hex escapes avoid confusing IDE parsers)
const FENCE = "\x60\x60\x60";

// ─── Shared fragments ───────────────────────────────────────────

const DESIGN_CORE = [
  "RUIXEN. Craft React components like Rauno Frieberg: minimal, precise, intentional. Restraint over excess.",
  "",
  "STYLE:",
  "- Font: Inter. 11px labels(tracking-wide,text-muted-foreground) 13px body 20-28px heads(tracking-tight,font-semibold). font-mono+tabular-nums for data",
  "- Color: CSS vars only(text-foreground,bg-card,border-border). Hierarchy: /70 2nd /40 3rd. Semantic: emerald-400/70(+) rose-400/70(-). NEVER green-500/red-500/blue-600",
  "- Layout: rounded-xl border-border p-5. 4px grid. gap-3~6. White space is a feature",
  "- Cards: bg-card or bg-foreground/[0.03]. hover:bg-foreground/[0.06]. No drop shadows",
  "",
  "MOTION(motion/react):",
  "- Spring: {type:\"spring\",stiffness:400,damping:28}",
  "- Enter: {opacity:0,y:8}->{1,0} stagger i*0.05. Hover: bg shift or y:-1. Press: scale(0.98)",
  "- whileHover/whileTap on all clickables. layoutId for tab indicators",
  "",
  "AUDIO: sound?:boolean=true. Hook:",
  "const useSound=(e=true)=>{const p=()=>{if(!e)return;const c=new AudioContext(),l=c.sampleRate*.003|0,b=c.createBuffer(1,l,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<l;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/l,4);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=.06;s.connect(g).connect(c.destination);s.start()};return p};",
  "",
  "CODE: TS interface(optional props+defaults), cn() utility, Tailwind only, single-file default-export. Imports: react, motion/react, lucide-react ONLY. Realistic mock data.",
].join("\n");

const DATA_VIZ_RULES = [
  "",
  "DATA VIZ:",
  "- ALWAYS inline SVG+viewBox. NEVER div-based bars",
  "- Container: rounded-xl border-border bg-card p-6. Grid: horizontal lines stroke:foreground/[0.06] dasharray:4,4",
  "- Axis: text-[10px] font-mono text-muted-foreground. Bars: <rect rx=3> gap:6px animate scaleY:0->1 stagger",
  "- Lines: strokeWidth:2 linecap/linejoin:round. Area: linearGradient 25%->0% opacity",
  "- Hover: tooltip bg-popover/95 backdrop-blur-sm rounded-lg p-3 text-xs shadow-lg + vertical crosshair(foreground/10)",
  "- Legend: dot(w-2 h-2 rounded-full)+text-xs. Numbers: toLocaleString(), toFixed(2)",
  '- Palette: ["hsl(217 91% 65%)","hsl(160 60% 50%)","hsl(280 65% 65%)","hsl(30 80% 60%)","hsl(350 65% 60%)"]',
  "- Dashboard: grid-cols-2 lg:3 gap-4. Summary cards: icon+label(xs,uppercase)+value(xl,semibold,tabular-nums)+change(xs,semantic color)",
  "- Mock: real tickers(AAPL,NVDA,MSFT,GOOGL), realistic prices($140-500), changes(+/-0.5~5%)",
].join("\n");

const OUTPUT_RULE = "\nOUTPUT: Single " + FENCE + "tsx fenced code block. No text outside the fence.";

// ─── V2: STANDARD (~250 tokens) ─────────────────────────────────
export const RUIXEN_SYSTEM_PROMPT = DESIGN_CORE + OUTPUT_RULE;

// ─── V3: MINIMAL (~60 tokens) ───────────────────────────────────
export const RUIXEN_PROMPT_MINIMAL =
  "RUIXEN: crafted React+TS like Rauno Frieberg. Minimal, intentional. " +
  "CSS vars, opacity hierarchy(/70,/40). emerald-400/70(+) rose-400/70(-). " +
  "NO saturated colors. rounded-xl, font-mono numbers, tabular-nums. " +
  "motion/react spring{stiffness:400,damping:28}. cn() utility, default-export. " +
  "Output: single " + FENCE + "tsx fence.";

// ─── V1: FULL (~400 tokens, includes data viz) ──────────────────
export const RUIXEN_PROMPT_FULL = DESIGN_CORE + DATA_VIZ_RULES + OUTPUT_RULE;

// ─── PROMPT SELECTOR ────────────────────────────────────────────
export type PromptLevel = "minimal" | "standard" | "full";

export function getSystemPrompt(level: PromptLevel = "standard"): string {
  switch (level) {
    case "minimal":
      return RUIXEN_PROMPT_MINIMAL;
    case "full":
      return RUIXEN_PROMPT_FULL;
    default:
      return RUIXEN_SYSTEM_PROMPT;
  }
}

// ─── USER CONFIRMATION PROMPT ───────────────────────────────────
export const CONFIRMATION_PROMPT = [
  "Before generating, confirm the plan:",
  "",
  "COMPONENT: {name}",
  "TYPE: {category}",
  "FEATURES:",
  "{features}",
  "",
  "Reply with:",
  "- \"proceed\" to generate",
  "- \"adjust: [changes]\" to modify the plan",
  "- \"cancel\" to stop",
].join("\n");

// ─── GENERATION WITH CONFIRMATION ───────────────────────────────
export interface GenerationPlan {
  componentName: string;
  category: string;
  features: string[];
  springPreset: keyof typeof RUIXEN_CORE.presets | "default";
  hasAudio: boolean;
  estimatedTokens: number;
}

export function createConfirmationMessage(plan: GenerationPlan): string {
  return [
    "**Component Plan**",
    "",
    '"' + plan.componentName + '" (' + plan.category + ")",
    "",
    "**Features:**",
    plan.features.map((f) => "- " + f).join("\n"),
    "",
    "**Config:**",
    "- Spring: " + plan.springPreset,
    "- Audio: " + (plan.hasAudio ? "Yes" : "No"),
    "- Est. tokens: ~" + plan.estimatedTokens,
    "",
    "Reply **proceed** to generate, or describe adjustments.",
  ].join("\n");
}

// ─── LEARNED PATTERN FORMATTER ──────────────────────────────────

export function formatLearnedPatterns(
  category: string,
  pattern: Record<string, string>,
  springPreset?: { stiffness: number; damping: number },
  successRate?: number
): string {
  if (!pattern || Object.keys(pattern).length === 0) return "";

  const entries = Object.entries(pattern)
    .map(function (e) { return e[0] + ":" + e[1]; })
    .join(", ");

  const parts = ["\nLEARNED(" + category + "): " + entries];

  if (springPreset) {
    parts.push("spring{s:" + springPreset.stiffness + ",d:" + springPreset.damping + "}");
  }

  if (successRate !== undefined) {
    parts.push("(" + Math.round(successRate * 100) + "% success)");
  }

  return parts.join(" ");
}

// ─── TOKEN ESTIMATION ───────────────────────────────────────────
export function estimateTokens(
  prompt: string,
  complexity: "simple" | "medium" | "complex"
): number {
  const baseTokens = Math.ceil(prompt.length / 4);
  const multiplier = { simple: 1.5, medium: 2.5, complex: 4 };
  return Math.ceil(baseTokens * multiplier[complexity]);
}
