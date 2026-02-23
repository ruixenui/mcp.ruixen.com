/**
 * COMPONENT REPLAY
 *
 * Step-by-step explanation of every decision made during DNA enrichment.
 * Teaches users while generating - no other MCP does this.
 */

import { ComponentDNA } from "./schema";

// ─── REPLAY TYPES ────────────────────────────────────────────────

export interface ReplayStep {
  step: number;
  action: string;
  reason: string;
  category: "accessibility" | "animation" | "layout" | "interaction" | "safety";
}

export interface ReplayResult {
  input: string;
  parsedAs: string;
  steps: ReplayStep[];
  summary: string;
}

// ─── DECISION EXPLANATIONS ───────────────────────────────────────

const DECISION_EXPLANATIONS: Record<string, { action: string; reason: string; category: ReplayStep["category"] }> = {
  // Portal decisions
  "overlay-needs-portal": {
    action: "Added portal rendering",
    reason: "Dropdowns inside transformed parents break z-index without portals",
    category: "layout",
  },
  "transform-safe-portal": {
    action: "Marked as transform-safe",
    reason: "Portal positioning uses fixed strategy to escape stacking contexts",
    category: "safety",
  },
  "position-strategy-for-overlays": {
    action: "Added floating-ui positioning",
    reason: "Automatic position calculation prevents viewport overflow",
    category: "layout",
  },

  // Accessibility decisions
  "modal-needs-focus-trap": {
    action: "Added focus trap",
    reason: "WCAG 2.1 requires focus to stay within modal dialogs",
    category: "accessibility",
  },
  "interactive-needs-keyboard": {
    action: "Added keyboard navigation",
    reason: "All interactive elements must be keyboard accessible (WCAG 2.1)",
    category: "accessibility",
  },
  "keyboard-nav-for-interactive": {
    action: "Added keyboard-nav support",
    reason: "Arrow keys, Enter, and Escape must work for screen reader users",
    category: "accessibility",
  },
  "focus-visible-for-interactive": {
    action: "Added focus-visible styles",
    reason: "Keyboard users need visible focus indicators",
    category: "accessibility",
  },
  "expandable-needs-aria-expanded": {
    action: "Added aria-expanded attribute",
    reason: "Screen readers need to announce open/closed state",
    category: "accessibility",
  },
  "selectable-needs-aria-selected": {
    action: "Added aria-selected attribute",
    reason: "Screen readers must announce which option is selected",
    category: "accessibility",
  },
  "toggle-needs-aria-checked": {
    action: "Added aria-checked attribute",
    reason: "Toggle state must be announced to assistive technology",
    category: "accessibility",
  },
  "live-region-for-dynamic": {
    action: "Added aria-live region",
    reason: "Dynamic content changes must be announced to screen readers",
    category: "accessibility",
  },

  // Animation decisions
  "animation-needs-reduced-motion": {
    action: "Added reduced-motion fallback",
    reason: "Users with vestibular disorders need motion-safe alternatives",
    category: "animation",
  },
  "always-spring-animation": {
    action: "Using spring physics animation",
    reason: "Springs feel more natural than CSS easing - they respond to interrupts",
    category: "animation",
  },
  "snappy-for-buttons": {
    action: "Using snappy spring preset",
    reason: "Buttons need responsive feedback (stiffness: 500, damping: 30)",
    category: "animation",
  },
  "smooth-for-modals": {
    action: "Using smooth spring preset",
    reason: "Modals need elegant entrance (stiffness: 300, damping: 25)",
    category: "animation",
  },
  "bouncy-for-notifications": {
    action: "Using bouncy spring preset",
    reason: "Toasts need attention-grabbing entrance (stiffness: 400, damping: 15)",
    category: "animation",
  },
  "velocity-aware-for-gestures": {
    action: "Added velocity-aware animation",
    reason: "Gesture-driven animations must inherit drag velocity for natural feel",
    category: "animation",
  },
  "velocity-inherit-on-interrupt": {
    action: "Added velocity inheritance",
    reason: "When animation is interrupted mid-flight, new animation inherits velocity",
    category: "animation",
  },
  "interruptible-animations": {
    action: "Made animations interruptible",
    reason: "Rapid clicks shouldn't queue animations - latest state wins",
    category: "animation",
  },
  "stagger-for-lists": {
    action: "Added stagger animation",
    reason: "List items animate sequentially for visual hierarchy",
    category: "animation",
  },

  // Layout decisions
  "modal-needs-overlay": {
    action: "Added overlay backdrop",
    reason: "Modal backdrop indicates content underneath is inactive",
    category: "layout",
  },
  "toast-needs-fixed": {
    action: "Using fixed positioning",
    reason: "Toasts stay visible regardless of scroll position",
    category: "layout",
  },
  "dynamic-height-for-expandable": {
    action: "Using dynamic height",
    reason: "Fixed heights break when content changes - auto-height with measurement",
    category: "layout",
  },
  "max-height-with-scroll": {
    action: "Added max-height with scroll",
    reason: "Dropdowns with many items need scroll to prevent viewport overflow",
    category: "layout",
  },
  "measure-content-for-animation": {
    action: "Added content measurement",
    reason: "Animating height requires knowing content size (useMeasure)",
    category: "layout",
  },

  // Interaction decisions
  "interactive-needs-click": {
    action: "Added click handler",
    reason: "Primary interaction method for interactive components",
    category: "interaction",
  },
  "overlay-needs-outside-dismiss": {
    action: "Added click-outside dismiss",
    reason: "Clicking outside overlay should close it (standard UX pattern)",
    category: "interaction",
  },
  "modal-needs-escape-dismiss": {
    action: "Added Escape key dismiss",
    reason: "WCAG requires modal dialogs to close on Escape key",
    category: "interaction",
  },
  "modal-needs-scroll-lock": {
    action: "Added scroll lock",
    reason: "Background shouldn't scroll while modal is open",
    category: "interaction",
  },
  "hover-for-interactive": {
    action: "Added hover states",
    reason: "Visual feedback on hover improves discoverability",
    category: "interaction",
  },
};

// ─── REPLAY ENGINE ───────────────────────────────────────────────

/**
 * Generates a step-by-step replay of DNA enrichment decisions.
 * Teaches users why each decision was made.
 */
export function generateReplay(
  input: string,
  originalDNA: ComponentDNA,
  enrichedDNA: ComponentDNA,
  appliedRules: string[]
): ReplayResult {
  const steps: ReplayStep[] = [];

  // Step 1: What was parsed
  steps.push({
    step: 1,
    action: `You asked for a ${originalDNA.type}`,
    reason: `Parsed "${input}" as ${originalDNA.type} component`,
    category: "interaction",
  });

  // Generate steps for each applied rule
  let stepNum = 2;
  for (const ruleName of appliedRules) {
    const explanation = DECISION_EXPLANATIONS[ruleName];
    if (explanation) {
      steps.push({
        step: stepNum++,
        action: explanation.action,
        reason: explanation.reason,
        category: explanation.category,
      });
    }
  }

  // Summary
  const accessibilitySteps = steps.filter(s => s.category === "accessibility").length;
  const animationSteps = steps.filter(s => s.category === "animation").length;
  const layoutSteps = steps.filter(s => s.category === "layout").length;
  const safetySteps = steps.filter(s => s.category === "safety").length;

  const summary = [
    `Generated production-grade ${originalDNA.type} with:`,
    accessibilitySteps > 0 ? `• ${accessibilitySteps} accessibility enhancements` : null,
    animationSteps > 0 ? `• ${animationSteps} animation optimizations` : null,
    layoutSteps > 0 ? `• ${layoutSteps} layout safety measures` : null,
    safetySteps > 0 ? `• ${safetySteps} production safety features` : null,
  ].filter(Boolean).join("\n");

  return {
    input,
    parsedAs: originalDNA.type,
    steps,
    summary,
  };
}

/**
 * Format replay as human-readable text.
 */
export function formatReplay(replay: ReplayResult): string {
  const lines: string[] = [];

  for (const step of replay.steps) {
    lines.push(`Step ${step.step}: ${step.action}`);
    lines.push(`         └─ ${step.reason}`);
  }

  lines.push("");
  lines.push(replay.summary);

  return lines.join("\n");
}

/**
 * Format replay as markdown for documentation.
 */
export function formatReplayMarkdown(replay: ReplayResult): string {
  const lines: string[] = [
    `## Component Replay: ${replay.parsedAs}`,
    "",
    `**Input:** \`${replay.input}\``,
    "",
    "### Decision Log",
    "",
  ];

  for (const step of replay.steps) {
    const icon = {
      accessibility: "♿",
      animation: "🎬",
      layout: "📐",
      interaction: "👆",
      safety: "🛡️",
    }[step.category];

    lines.push(`${step.step}. ${icon} **${step.action}**`);
    lines.push(`   > ${step.reason}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(replay.summary);

  return lines.join("\n");
}
