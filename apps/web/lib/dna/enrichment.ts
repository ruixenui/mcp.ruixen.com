/**
 * DNA ENRICHMENT ENGINE
 *
 * Pure code rules engine - ZERO AI tokens.
 * Your entire design engineering blog post becomes deterministic if/else logic.
 *
 * This is where Ruixen's design wisdom lives as code, not prompts.
 */

import {
  ComponentDNA,
  ComponentType,
  InteractionType,
  A11yFeature,
  LayoutType,
  AnimationType,
} from "./schema";

// ─── ENRICHMENT RULES ────────────────────────────────────────────

interface EnrichmentRule {
  name: string;
  condition: (dna: ComponentDNA) => boolean;
  apply: (dna: ComponentDNA) => void;
}

const ENRICHMENT_RULES: EnrichmentRule[] = [
  // ═══════════════════════════════════════════════════════════════
  // LAYOUT RULES
  // ═══════════════════════════════════════════════════════════════

  {
    name: "overlay-needs-portal",
    condition: (dna) =>
      ["dropdown", "select", "modal", "dialog", "drawer", "popover", "tooltip", "menu", "toast"]
        .includes(dna.type),
    apply: (dna) => {
      if (!dna.layout.includes("portal")) {
        dna.layout.push("portal");
      }
    },
  },

  {
    name: "modal-needs-overlay",
    condition: (dna) => ["modal", "dialog", "drawer"].includes(dna.type),
    apply: (dna) => {
      if (!dna.layout.includes("overlay")) {
        dna.layout.push("overlay");
      }
    },
  },

  {
    name: "toast-needs-fixed",
    condition: (dna) => ["toast", "notification"].includes(dna.type),
    apply: (dna) => {
      if (!dna.layout.includes("fixed")) {
        dna.layout.push("fixed");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // INTERACTION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    name: "interactive-needs-click",
    condition: (dna) =>
      ["button", "checkbox", "radio", "switch", "dropdown", "select", "accordion"]
        .includes(dna.type),
    apply: (dna) => {
      if (!dna.interaction.includes("click")) {
        dna.interaction.push("click");
      }
    },
  },

  {
    name: "interactive-needs-keyboard",
    condition: (dna) =>
      ["button", "input", "textarea", "checkbox", "radio", "switch", "dropdown", "select", "tabs", "menu", "accordion"]
        .includes(dna.type),
    apply: (dna) => {
      if (!dna.interaction.includes("keyboard")) {
        dna.interaction.push("keyboard");
      }
    },
  },

  {
    name: "overlay-needs-outside-dismiss",
    condition: (dna) =>
      ["dropdown", "select", "popover", "menu"].includes(dna.type),
    apply: (dna) => {
      if (!dna.interaction.includes("outside-dismiss")) {
        dna.interaction.push("outside-dismiss");
      }
    },
  },

  {
    name: "modal-needs-escape-dismiss",
    condition: (dna) =>
      ["modal", "dialog", "drawer"].includes(dna.type),
    apply: (dna) => {
      if (!dna.interaction.includes("escape-dismiss")) {
        dna.interaction.push("escape-dismiss");
      }
    },
  },

  {
    name: "modal-needs-scroll-lock",
    condition: (dna) =>
      ["modal", "dialog", "drawer"].includes(dna.type) && dna.layout.includes("overlay"),
    apply: (dna) => {
      if (!dna.interaction.includes("scroll-lock")) {
        dna.interaction.push("scroll-lock");
      }
    },
  },

  {
    name: "hover-for-interactive",
    condition: (dna) =>
      ["button", "card", "dropdown", "menu"].includes(dna.type),
    apply: (dna) => {
      if (!dna.interaction.includes("hover")) {
        dna.interaction.push("hover");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY RULES
  // ═══════════════════════════════════════════════════════════════

  {
    name: "modal-needs-focus-trap",
    condition: (dna) =>
      ["modal", "dialog", "drawer"].includes(dna.type),
    apply: (dna) => {
      if (!dna.a11y.includes("focus-trap")) {
        dna.a11y.push("focus-trap");
      }
    },
  },

  {
    name: "expandable-needs-aria-expanded",
    condition: (dna) =>
      ["dropdown", "select", "accordion", "popover", "menu"].includes(dna.type),
    apply: (dna) => {
      if (!dna.a11y.includes("aria-expanded")) {
        dna.a11y.push("aria-expanded");
      }
    },
  },

  {
    name: "selectable-needs-aria-selected",
    condition: (dna) =>
      ["tabs", "select", "dropdown"].includes(dna.type) ||
      dna.variants.some(v => v.includes("select")),
    apply: (dna) => {
      if (!dna.a11y.includes("aria-selected")) {
        dna.a11y.push("aria-selected");
      }
    },
  },

  {
    name: "toggle-needs-aria-checked",
    condition: (dna) =>
      ["checkbox", "switch"].includes(dna.type),
    apply: (dna) => {
      if (!dna.a11y.includes("aria-checked")) {
        dna.a11y.push("aria-checked");
      }
    },
  },

  {
    name: "button-needs-aria-pressed",
    condition: (dna) =>
      dna.type === "button" && dna.variants.some(v => v.includes("toggle")),
    apply: (dna) => {
      if (!dna.a11y.includes("aria-pressed")) {
        dna.a11y.push("aria-pressed");
      }
    },
  },

  {
    name: "live-region-for-dynamic",
    condition: (dna) =>
      ["toast", "notification", "loader"].includes(dna.type),
    apply: (dna) => {
      if (!dna.a11y.includes("aria-live")) {
        dna.a11y.push("aria-live");
      }
    },
  },

  {
    name: "keyboard-nav-for-interactive",
    condition: (dna) =>
      dna.interaction.includes("keyboard"),
    apply: (dna) => {
      if (!dna.a11y.includes("keyboard-nav")) {
        dna.a11y.push("keyboard-nav");
      }
    },
  },

  {
    name: "focus-visible-for-interactive",
    condition: (dna) =>
      dna.interaction.includes("keyboard") || dna.interaction.includes("focus"),
    apply: (dna) => {
      if (!dna.a11y.includes("focus-visible")) {
        dna.a11y.push("focus-visible");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION RULES (Ruixen Spring System)
  // ═══════════════════════════════════════════════════════════════

  {
    name: "always-spring-animation",
    condition: (dna) =>
      dna.animation.length === 0 &&
      !["skeleton", "loader"].includes(dna.type),
    apply: (dna) => {
      // Default to spring animation for all interactive components
      if (["button", "card", "dropdown", "modal", "drawer", "tabs", "accordion"].includes(dna.type)) {
        dna.animation.push("spring");
      }
    },
  },

  {
    name: "snappy-for-buttons",
    condition: (dna) =>
      dna.type === "button" && dna.animation.includes("spring"),
    apply: (dna) => {
      // Replace generic spring with snappy for buttons
      const idx = dna.animation.indexOf("spring");
      if (idx !== -1 && !dna.animation.includes("spring-snappy")) {
        dna.animation[idx] = "spring-snappy";
      }
    },
  },

  {
    name: "smooth-for-modals",
    condition: (dna) =>
      ["modal", "dialog", "drawer"].includes(dna.type) && dna.animation.includes("spring"),
    apply: (dna) => {
      const idx = dna.animation.indexOf("spring");
      if (idx !== -1 && !dna.animation.includes("spring-smooth")) {
        dna.animation[idx] = "spring-smooth";
      }
    },
  },

  {
    name: "bouncy-for-notifications",
    condition: (dna) =>
      ["toast", "notification", "badge"].includes(dna.type) && dna.animation.includes("spring"),
    apply: (dna) => {
      const idx = dna.animation.indexOf("spring");
      if (idx !== -1 && !dna.animation.includes("spring-bouncy")) {
        dna.animation[idx] = "spring-bouncy";
      }
    },
  },

  {
    name: "animation-needs-reduced-motion",
    condition: (dna) =>
      dna.animation.length > 0 && !dna.animation.includes("none"),
    apply: (dna) => {
      if (!dna.a11y.includes("reduced-motion")) {
        dna.a11y.push("reduced-motion");
      }
    },
  },

  {
    name: "velocity-aware-for-gestures",
    condition: (dna) =>
      dna.interaction.includes("drag") || dna.interaction.includes("swipe"),
    apply: (dna) => {
      if (!dna.animation.includes("velocity-aware")) {
        dna.animation.push("velocity-aware");
      }
    },
  },

  {
    name: "stagger-for-lists",
    condition: (dna) =>
      ["list", "menu", "navigation"].includes(dna.type),
    apply: (dna) => {
      if (!dna.animation.includes("stagger")) {
        dna.animation.push("stagger");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC CONTENT RULES
  // ═══════════════════════════════════════════════════════════════

  {
    name: "dynamic-height-for-expandable",
    condition: (dna) =>
      ["accordion", "dropdown", "select", "popover", "menu"].includes(dna.type),
    apply: (dna) => {
      if (!dna.layout.includes("dynamic-height")) {
        dna.layout.push("dynamic-height");
      }
    },
  },

  {
    name: "max-height-with-scroll",
    condition: (dna) =>
      ["dropdown", "select", "menu"].includes(dna.type) &&
      dna.layout.includes("dynamic-height"),
    apply: (dna) => {
      if (!dna.layout.includes("max-height-scroll")) {
        dna.layout.push("max-height-scroll");
      }
    },
  },

  {
    name: "measure-content-for-animation",
    condition: (dna) =>
      dna.layout.includes("dynamic-height") && dna.animation.length > 0,
    apply: (dna) => {
      if (!dna.layout.includes("measure-content")) {
        dna.layout.push("measure-content");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // VELOCITY & INTERRUPTION RULES
  // ═══════════════════════════════════════════════════════════════

  {
    name: "velocity-inherit-on-interrupt",
    condition: (dna) =>
      dna.animation.some(a => a.startsWith("spring")) &&
      ["dropdown", "modal", "drawer", "accordion", "toast"].includes(dna.type),
    apply: (dna) => {
      if (!dna.animation.includes("velocity-inherit")) {
        dna.animation.push("velocity-inherit");
      }
    },
  },

  {
    name: "interruptible-animations",
    condition: (dna) =>
      dna.animation.some(a => a.startsWith("spring")) &&
      dna.interaction.includes("click"),
    apply: (dna) => {
      if (!dna.animation.includes("interruptible")) {
        dna.animation.push("interruptible");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORM-SAFE POSITIONING
  // ═══════════════════════════════════════════════════════════════

  {
    name: "transform-safe-portal",
    condition: (dna) =>
      dna.layout.includes("portal"),
    apply: (dna) => {
      // Portal components need transform-safe positioning
      if (!dna.layout.includes("transform-safe")) {
        dna.layout.push("transform-safe");
      }
    },
  },

  {
    name: "position-strategy-for-overlays",
    condition: (dna) =>
      ["dropdown", "popover", "tooltip", "menu"].includes(dna.type),
    apply: (dna) => {
      // Use floating-ui or similar for position calculation
      if (!dna.layout.includes("floating-position")) {
        dna.layout.push("floating-position");
      }
    },
  },
];

// ─── ENRICHMENT ENGINE ───────────────────────────────────────────

export interface EnrichmentResult {
  original: ComponentDNA;
  enriched: ComponentDNA;
  appliedRules: string[];
  stats: {
    rulesChecked: number;
    rulesApplied: number;
    featuresAdded: number;
  };
}

/**
 * Enriches DNA with design engineering rules.
 * PURE CODE - Zero AI tokens.
 *
 * @param dna - Raw DNA from intent parser
 * @returns Enriched DNA with all required features
 */
export function enrichDNA(dna: ComponentDNA): EnrichmentResult {
  // Deep clone to avoid mutation
  const enriched: ComponentDNA = {
    type: dna.type,
    interaction: [...dna.interaction],
    a11y: [...dna.a11y],
    layout: [...dna.layout],
    animation: [...dna.animation],
    variants: [...dna.variants],
    style: dna.style ? [...dna.style] : undefined,
    size: dna.size ? [...dna.size] : undefined,
    state: dna.state ? [...dna.state] : undefined,
  };

  const originalFeatureCount = countFeatures(dna);
  const appliedRules: string[] = [];

  // Apply all matching rules
  for (const rule of ENRICHMENT_RULES) {
    if (rule.condition(enriched)) {
      const beforeCount = countFeatures(enriched);
      rule.apply(enriched);
      const afterCount = countFeatures(enriched);

      if (afterCount > beforeCount) {
        appliedRules.push(rule.name);
      }
    }
  }

  const enrichedFeatureCount = countFeatures(enriched);

  return {
    original: dna,
    enriched,
    appliedRules,
    stats: {
      rulesChecked: ENRICHMENT_RULES.length,
      rulesApplied: appliedRules.length,
      featuresAdded: enrichedFeatureCount - originalFeatureCount,
    },
  };
}

function countFeatures(dna: ComponentDNA): number {
  return (
    dna.interaction.length +
    dna.a11y.length +
    dna.layout.length +
    dna.animation.length +
    dna.variants.length +
    (dna.style?.length || 0) +
    (dna.size?.length || 0) +
    (dna.state?.length || 0)
  );
}

// ─── SPRING CONFIG FROM DNA ──────────────────────────────────────

export interface SpringConfig {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
}

/**
 * Get spring configuration based on DNA animation type.
 * Deterministic mapping - no AI needed.
 */
export function getSpringFromDNA(dna: ComponentDNA): SpringConfig {
  // Check for specific spring types
  if (dna.animation.includes("spring-snappy")) {
    return { type: "spring", stiffness: 500, damping: 30, mass: 0.8 };
  }
  if (dna.animation.includes("spring-smooth")) {
    return { type: "spring", stiffness: 300, damping: 25, mass: 1 };
  }
  if (dna.animation.includes("spring-bouncy")) {
    return { type: "spring", stiffness: 400, damping: 15, mass: 1 };
  }
  if (dna.animation.includes("spring-heavy")) {
    return { type: "spring", stiffness: 200, damping: 20, mass: 2 };
  }

  // Default spring
  return { type: "spring", stiffness: 400, damping: 28, mass: 1 };
}
