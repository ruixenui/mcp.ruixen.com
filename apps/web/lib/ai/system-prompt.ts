/**
 * Ruixen UI System Prompts
 *
 * V1: Full verbose prompt (~3000 tokens) - for complex generations
 * V2: Compressed prompt (~400 tokens) - for standard generations
 * V3: Minimal prompt (~150 tokens) - for simple modifications
 */

// ─── CORE RULES (Shared reference, not sent to AI) ──────────────────
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

// ─── V2: COMPRESSED PROMPT (~400 tokens) ─────────────────────────────
export const RUIXEN_SYSTEM_PROMPT = `RUIXEN UI GENERATOR

RULES:
1. MOTION: motion/react springs only. Default: {type:"spring",stiffness:400,damping:28}. Never CSS transition/duration/ease.
2. AUDIO: 3ms noise burst on interactions. Add sound:boolean prop.
3. STYLE: Tailwind CSS, cn() utility, dark mode support.
4. TYPES: TypeScript interface for props, all optional with defaults.
5. EXPORT: Single file, default export, self-contained.

AUDIO_HOOK:
const useSound=(e=true)=>{const p=()=>{if(!e)return;const c=new AudioContext(),l=c.sampleRate*.003|0,b=c.createBuffer(1,l,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<l;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/l,4);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=.06;s.connect(g).connect(c.destination);s.start()};return p};

CN_UTIL:
const cn=(...a)=>twMerge(clsx(a));

OUTPUT: TypeScript React code only. No markdown, no explanations, no code fences.`;

// ─── V3: MINIMAL PROMPT (~150 tokens) ────────────────────────────────
export const RUIXEN_PROMPT_MINIMAL = `RUIXEN: React+TypeScript, motion/react springs {stiffness:400,damping:28}, Tailwind, cn() utility, default export. Output code only.`;

// ─── V1: FULL PROMPT (for complex/new component types) ───────────────
export const RUIXEN_PROMPT_FULL = `You are the Ruixen UI Component Generator. Create React components with physics-based interactions.

CORE RULES:
1. SPRING PHYSICS: Use motion/react. Default: { type: "spring", stiffness: 400, damping: 28 }
   - Snappy (buttons): stiffness: 500, damping: 30, mass: 0.8
   - Smooth (modals): stiffness: 300, damping: 25
   - Bouncy (notifications): stiffness: 400, damping: 15
   - Never use CSS transition, duration, ease-in/out

2. AUDIO FEEDBACK: Play 3ms noise burst on interactions
   - Add sound?: boolean prop (default: true)
   - Use Web Audio API, not <audio> elements

3. CONVENTIONS:
   - TypeScript with interface Props
   - Default export, all props optional
   - cn() utility for className merging
   - Tailwind CSS, no external CSS files
   - Self-contained, no external UI deps

OUTPUT: Clean TypeScript React code only. No markdown, no explanations.`;

// ─── PROMPT SELECTOR ─────────────────────────────────────────────────
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

// ─── USER CONFIRMATION PROMPT ────────────────────────────────────────
export const CONFIRMATION_PROMPT = `Before generating, confirm the plan:

COMPONENT: {name}
TYPE: {category}
FEATURES:
{features}

Reply with:
- "proceed" to generate
- "adjust: [changes]" to modify the plan
- "cancel" to stop`;

// ─── GENERATION WITH CONFIRMATION ────────────────────────────────────
export interface GenerationPlan {
  componentName: string;
  category: string;
  features: string[];
  springPreset: keyof typeof RUIXEN_CORE.presets | "default";
  hasAudio: boolean;
  estimatedTokens: number;
}

export function createConfirmationMessage(plan: GenerationPlan): string {
  return `**Component Plan**

\`${plan.componentName}\` (${plan.category})

**Features:**
${plan.features.map(f => `- ${f}`).join("\n")}

**Config:**
- Spring: ${plan.springPreset}
- Audio: ${plan.hasAudio ? "Yes" : "No"}
- Est. tokens: ~${plan.estimatedTokens}

Reply **proceed** to generate, or describe adjustments.`;
}

// ─── TOKEN ESTIMATION ────────────────────────────────────────────────
export function estimateTokens(prompt: string, complexity: "simple" | "medium" | "complex"): number {
  const baseTokens = Math.ceil(prompt.length / 4);
  const multiplier = { simple: 1.5, medium: 2.5, complex: 4 };
  return Math.ceil(baseTokens * multiplier[complexity]);
}
