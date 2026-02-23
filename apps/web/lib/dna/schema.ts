/**
 * RUIXEN COMPONENT DNA
 *
 * A structured representation of component requirements.
 * This is NOT a prompt - it's a lookup key.
 *
 * DNA enables:
 * - Exact registry matching (no fuzzy search)
 * - Deterministic enrichment (pure code, no AI)
 * - Instant lookups (hash-based)
 * - Perfect consistency (same DNA = same component)
 */

// ─── DNA SCHEMA ──────────────────────────────────────────────────

export interface ComponentDNA {
  // Core identity
  type: ComponentType;

  // Interaction patterns
  interaction: InteractionType[];

  // Accessibility requirements
  a11y: A11yFeature[];

  // Layout behavior
  layout: LayoutType[];

  // Animation specifications
  animation: AnimationType[];

  // Component variants
  variants: string[];

  // Visual style
  style?: StyleType[];

  // Size variants
  size?: SizeType[];

  // State management
  state?: StateType[];
}

// ─── TYPE DEFINITIONS ────────────────────────────────────────────

export type ComponentType =
  | "button"
  | "dropdown"
  | "select"
  | "modal"
  | "dialog"
  | "drawer"
  | "popover"
  | "tooltip"
  | "menu"
  | "tabs"
  | "accordion"
  | "card"
  | "input"
  | "textarea"
  | "checkbox"
  | "radio"
  | "switch"
  | "slider"
  | "toast"
  | "notification"
  | "avatar"
  | "badge"
  | "loader"
  | "skeleton"
  | "pagination"
  | "breadcrumb"
  | "navigation"
  | "sidebar"
  | "header"
  | "footer"
  | "hero"
  | "pricing"
  | "calendar"
  | "datepicker"
  | "table"
  | "list"
  | "tree"
  | "custom";

export type InteractionType =
  | "click"
  | "hover"
  | "focus"
  | "keyboard"
  | "touch"
  | "drag"
  | "swipe"
  | "long-press"
  | "double-click"
  | "outside-dismiss"
  | "escape-dismiss"
  | "scroll-lock";

export type A11yFeature =
  | "focus-trap"
  | "focus-visible"
  | "aria-expanded"
  | "aria-selected"
  | "aria-checked"
  | "aria-pressed"
  | "aria-live"
  | "aria-label"
  | "reduced-motion"
  | "screen-reader"
  | "keyboard-nav"
  | "skip-link"
  | "high-contrast";

export type LayoutType =
  | "inline"
  | "block"
  | "portal"
  | "fixed"
  | "sticky"
  | "absolute"
  | "overlay"
  | "fullscreen"
  | "responsive"
  | "container"
  | "grid"
  | "flex";

export type AnimationType =
  | "spring"
  | "spring-snappy"
  | "spring-smooth"
  | "spring-bouncy"
  | "spring-heavy"
  | "velocity-aware"
  | "stagger"
  | "morph"
  | "flip"
  | "fade"
  | "scale"
  | "slide"
  | "none";

export type StyleType =
  | "minimal"
  | "bordered"
  | "filled"
  | "ghost"
  | "outline"
  | "gradient"
  | "glass"
  | "shadow"
  | "elevated"
  | "flat";

export type SizeType =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "auto"
  | "full";

export type StateType =
  | "controlled"
  | "uncontrolled"
  | "loading"
  | "disabled"
  | "error"
  | "success"
  | "warning";

// ─── DNA FINGERPRINT ─────────────────────────────────────────────

/**
 * Creates a deterministic hash from DNA
 * Same DNA always produces same hash
 */
export function createDNAFingerprint(dna: ComponentDNA): string {
  // Normalize: sort arrays, remove undefined
  const normalized = {
    type: dna.type,
    interaction: [...dna.interaction].sort(),
    a11y: [...dna.a11y].sort(),
    layout: [...dna.layout].sort(),
    animation: [...dna.animation].sort(),
    variants: [...dna.variants].sort(),
    style: dna.style ? [...dna.style].sort() : [],
    size: dna.size ? [...dna.size].sort() : [],
    state: dna.state ? [...dna.state].sort() : [],
  };

  // Create deterministic string
  const dnaString = JSON.stringify(normalized);

  // Simple hash (in production, use crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < dnaString.length; i++) {
    const char = dnaString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Return as hex with prefix
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `dna_${dna.type}_${hashHex}`;
}

// ─── DNA COMPARISON ──────────────────────────────────────────────

/**
 * Calculate similarity between two DNAs (0-1)
 * Used for fuzzy fallback when exact match fails
 */
export function calculateDNASimilarity(dna1: ComponentDNA, dna2: ComponentDNA): number {
  if (dna1.type !== dna2.type) return 0;

  const features = ['interaction', 'a11y', 'layout', 'animation', 'variants'] as const;
  let totalScore = 0;
  let maxScore = 0;

  for (const feature of features) {
    const set1 = new Set(dna1[feature]);
    const set2 = new Set(dna2[feature]);
    const union = new Set([...set1, ...set2]);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    if (union.size > 0) {
      totalScore += intersection.size / union.size;
      maxScore += 1;
    }
  }

  return maxScore > 0 ? totalScore / maxScore : 0;
}

// ─── EMPTY DNA TEMPLATE ──────────────────────────────────────────

export function createEmptyDNA(type: ComponentType): ComponentDNA {
  return {
    type,
    interaction: [],
    a11y: [],
    layout: [],
    animation: [],
    variants: [],
  };
}

// ─── DNA VALIDATION ──────────────────────────────────────────────

export interface DNAValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDNA(dna: ComponentDNA): DNAValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type is required
  if (!dna.type) {
    errors.push("Missing component type");
  }

  // Check for conflicting features
  if (dna.layout.includes("portal") && dna.layout.includes("inline")) {
    warnings.push("Portal and inline layouts are mutually exclusive");
  }

  // Animation requires reduced-motion support
  if (dna.animation.length > 0 && !dna.a11y.includes("reduced-motion")) {
    warnings.push("Animation present but reduced-motion not specified");
  }

  // Interactive components need keyboard support
  const isInteractive = ["button", "dropdown", "select", "input", "checkbox", "radio", "switch"].includes(dna.type);
  if (isInteractive && !dna.interaction.includes("keyboard")) {
    warnings.push("Interactive component should support keyboard navigation");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
