/**
 * DNA VALIDATION ENGINE
 *
 * Validates generated code against DNA requirements.
 * Scores across 5 dimensions:
 * 1. Accessibility (aria, keyboard, screen reader)
 * 2. Animation Physics (spring interrupts, velocity, reduced motion)
 * 3. Edge Case Handling (stacking context, height auto, resize)
 * 4. Token Efficiency (code size, no bloat)
 * 5. Production Safety (portals, scroll lock, focus management)
 */

import { ComponentDNA } from "./schema";

// ─── VALIDATION TYPES ────────────────────────────────────────────

export type ScoreDimension =
  | "accessibility"
  | "animation"
  | "edgeCases"
  | "tokenEfficiency"
  | "productionSafety";

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  fix?: string;
  dimension: ScoreDimension;
}

export interface DimensionScore {
  score: number;
  maxScore: number;
  percentage: number;
  issues: number;
  passed: number;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100 overall
  grade: string; // A+, A, B+, B, C+, C, D, F
  dimensions: Record<ScoreDimension, DimensionScore>;
  issues: ValidationIssue[];
  passed: string[];
}

// ─── VALIDATION RULES ────────────────────────────────────────────

interface ValidationRule {
  code: string;
  dimension: ScoreDimension;
  weight: number; // Points for this check
  dnaCondition: (dna: ComponentDNA) => boolean;
  codeCheck: (code: string) => boolean;
  severity: "error" | "warning" | "info";
  message: string;
  fix: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION SAFETY (portals, scroll lock, focus management)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_PORTAL",
    dimension: "productionSafety",
    weight: 15,
    dnaCondition: (dna) => dna.layout.includes("portal"),
    codeCheck: (code) =>
      /createPortal|Portal|FloatingPortal|@floating-ui/.test(code),
    severity: "error",
    message: "No portal — component will break inside transformed parents",
    fix: "Use createPortal from react-dom or FloatingPortal from @floating-ui/react",
  },
  {
    code: "NO_FLOATING_POSITION",
    dimension: "productionSafety",
    weight: 10,
    dnaCondition: (dna) => dna.layout.includes("floating-position"),
    codeCheck: (code) =>
      /useFloating|@floating-ui|computePosition|Popper/.test(code),
    severity: "error",
    message: "No position calculation — overlay will misposition in complex layouts",
    fix: "Use @floating-ui/react for automatic position calculation",
  },
  {
    code: "TRANSFORM_UNSAFE",
    dimension: "productionSafety",
    weight: 5,
    dnaCondition: (dna) => dna.layout.includes("transform-safe"),
    codeCheck: (code) =>
      /strategy:\s*['"]fixed['"]|position:\s*['"]fixed['"]|FloatingPortal/.test(code) ||
      !/transform:/.test(code),
    severity: "warning",
    message: "Transform may break positioning in nested contexts",
    fix: "Use position: fixed with @floating-ui or avoid transforms on positioned ancestors",
  },
  {
    code: "NO_SCROLL_LOCK",
    dimension: "productionSafety",
    weight: 8,
    dnaCondition: (dna) => dna.interaction.includes("scroll-lock"),
    codeCheck: (code) =>
      /useScrollLock|scrollLock|overflow.*hidden|body.*overflow|lockScroll/.test(code),
    severity: "warning",
    message: "No scroll lock — background scrolls while modal is open",
    fix: "Add useScrollLock hook or set body overflow hidden when open",
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY (aria, keyboard, screen reader)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_KEYBOARD_NAV",
    dimension: "accessibility",
    weight: 15,
    dnaCondition: (dna) => dna.a11y.includes("keyboard-nav"),
    codeCheck: (code) =>
      /onKeyDown|handleKeyDown|keydown|ArrowUp|ArrowDown|Enter|Escape/.test(code),
    severity: "error",
    message: "No keyboard navigation — fails WCAG 2.1 compliance",
    fix: "Add onKeyDown handler with Arrow keys, Enter, Escape support",
  },
  {
    code: "MISSING_TABINDEX",
    dimension: "accessibility",
    weight: 10,
    dnaCondition: (dna) =>
      dna.interaction.includes("keyboard") &&
      !["button", "input", "textarea", "select"].includes(dna.type),
    codeCheck: (code) =>
      /tabIndex|tabindex/.test(code),
    severity: "error",
    message: "Missing tabIndex — element not keyboard focusable",
    fix: "Add tabIndex={0} for interactive non-native elements",
  },
  {
    code: "NO_FOCUS_VISIBLE",
    dimension: "accessibility",
    weight: 8,
    dnaCondition: (dna) => dna.a11y.includes("focus-visible"),
    codeCheck: (code) =>
      /focus-visible|:focus-visible|focusVisible|outline/.test(code),
    severity: "warning",
    message: "No focus-visible styles — keyboard users can't see focus",
    fix: "Add focus-visible:ring-2 or similar focus indicator",
  },
  {
    code: "NO_FOCUS_TRAP",
    dimension: "accessibility",
    weight: 12,
    dnaCondition: (dna) => dna.a11y.includes("focus-trap"),
    codeCheck: (code) =>
      /FocusTrap|useFocusTrap|focus-trap|trapFocus|createFocusTrap/.test(code),
    severity: "error",
    message: "No focus trap — modal allows focus to escape",
    fix: "Use FocusTrap component or useFocusTrap hook",
  },
  {
    code: "NO_ARIA_EXPANDED",
    dimension: "accessibility",
    weight: 10,
    dnaCondition: (dna) => dna.a11y.includes("aria-expanded"),
    codeCheck: (code) =>
      /aria-expanded/.test(code),
    severity: "error",
    message: "Missing aria-expanded — screen readers can't detect state",
    fix: "Add aria-expanded={isOpen} to trigger element",
  },
  {
    code: "NO_ARIA_LIVE",
    dimension: "accessibility",
    weight: 10,
    dnaCondition: (dna) => dna.a11y.includes("aria-live"),
    codeCheck: (code) =>
      /aria-live|role=['"]alert['"]|role=['"]status['"]/.test(code),
    severity: "error",
    message: "No aria-live region — screen readers miss dynamic updates",
    fix: "Add aria-live='polite' or role='status' for dynamic content",
  },
  {
    code: "NO_ESCAPE_DISMISS",
    dimension: "accessibility",
    weight: 8,
    dnaCondition: (dna) => dna.interaction.includes("escape-dismiss"),
    codeCheck: (code) =>
      /Escape|escape|key.*27|keyCode.*27/.test(code),
    severity: "error",
    message: "No Escape key dismiss — WCAG modal pattern violation",
    fix: "Add onKeyDown handler that closes on Escape key",
  },
  {
    code: "NO_REDUCED_MOTION",
    dimension: "accessibility",
    weight: 12,
    dnaCondition: (dna) => dna.a11y.includes("reduced-motion"),
    codeCheck: (code) =>
      /prefers-reduced-motion|reducedMotion|useReducedMotion|motion-reduce/.test(code),
    severity: "error",
    message: "Animation ignores prefers-reduced-motion — accessibility violation",
    fix: "Add useReducedMotion hook or motion-reduce: CSS media query",
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION PHYSICS (spring interrupts, velocity, reduced motion)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "CSS_TRANSITION",
    dimension: "animation",
    weight: 15,
    dnaCondition: (dna) => dna.animation.some((a) => a.startsWith("spring")),
    codeCheck: (code) =>
      !/transition-duration|ease-in|ease-out|cubic-bezier|transition:/.test(code),
    severity: "error",
    message: "CSS transition found — should use spring physics",
    fix: "Replace CSS transitions with motion/react spring animations",
  },
  {
    code: "NO_VELOCITY_INHERIT",
    dimension: "animation",
    weight: 10,
    dnaCondition: (dna) => dna.animation.includes("velocity-inherit"),
    codeCheck: (code) =>
      /velocity|initialVelocity|from.*velocity|animate.*velocity/.test(code) ||
      /useSpring|useMotionValue/.test(code),
    severity: "warning",
    message: "Spring animation has no velocity inheritance on interrupt",
    fix: "Use useSpring or pass velocity from previous animation state",
  },
  {
    code: "NOT_INTERRUPTIBLE",
    dimension: "animation",
    weight: 8,
    dnaCondition: (dna) => dna.animation.includes("interruptible"),
    codeCheck: (code) =>
      /AnimatePresence|animate=|useSpring|motion\./.test(code),
    severity: "warning",
    message: "Animation may not be interruptible mid-flight",
    fix: "Use motion components or useSpring for interruptible animations",
  },
  {
    code: "WRONG_MOTION_IMPORT",
    dimension: "animation",
    weight: 5,
    dnaCondition: (dna) => dna.animation.length > 0,
    codeCheck: (code) =>
      /from ['"]motion\/react['"]/.test(code) ||
      /from ['"]motion['"]/.test(code) ||
      !/framer-motion/.test(code),
    severity: "warning",
    message: "Using framer-motion instead of motion/react",
    fix: "Import from 'motion/react' instead of 'framer-motion'",
  },

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASE HANDLING (stacking context, height auto, resize)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "FIXED_HEIGHT",
    dimension: "edgeCases",
    weight: 12,
    dnaCondition: (dna) => dna.layout.includes("dynamic-height"),
    codeCheck: (code) =>
      !/height:\s*\d+px/.test(code) ||
      /height:\s*['"]auto['"]|height.*content|max-content|fit-content/.test(code) ||
      /useMeasure|getBoundingClientRect|ResizeObserver|height.*auto/.test(code),
    severity: "error",
    message: "Uses fixed height — won't handle dynamic content",
    fix: "Use auto height with useMeasure hook for animated height changes",
  },
  {
    code: "NO_CONTENT_MEASURE",
    dimension: "edgeCases",
    weight: 8,
    dnaCondition: (dna) => dna.layout.includes("measure-content"),
    codeCheck: (code) =>
      /useMeasure|getBoundingClientRect|ResizeObserver|useElementSize/.test(code),
    severity: "warning",
    message: "No content measurement — animated height will jump",
    fix: "Use useMeasure from @react-hookz/web or react-use for smooth height animation",
  },
  {
    code: "NO_MAX_HEIGHT_SCROLL",
    dimension: "edgeCases",
    weight: 6,
    dnaCondition: (dna) => dna.layout.includes("max-height-scroll"),
    codeCheck: (code) =>
      /max-height|maxHeight|overflow.*auto|overflow.*scroll/.test(code),
    severity: "warning",
    message: "No max-height with scroll — dropdown may overflow viewport",
    fix: "Add max-h-[300px] overflow-auto or similar constraint",
  },
  {
    code: "NO_OUTSIDE_DISMISS",
    dimension: "edgeCases",
    weight: 6,
    dnaCondition: (dna) => dna.interaction.includes("outside-dismiss"),
    codeCheck: (code) =>
      /useClickOutside|onClickOutside|clickOutside|useOnClickOutside|click.*outside/.test(code) ||
      /FloatingOverlay|useFloating.*dismiss/.test(code),
    severity: "warning",
    message: "No click-outside dismiss — poor UX for overlays",
    fix: "Use useClickOutside hook or FloatingOverlay with dismiss",
  },

  // ═══════════════════════════════════════════════════════════════
  // TOKEN EFFICIENCY (code size, no bloat)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "INLINE_STYLES_BLOAT",
    dimension: "tokenEfficiency",
    weight: 5,
    dnaCondition: () => true, // Always check
    codeCheck: (code) => {
      // Count inline style objects (rough heuristic)
      const inlineStyles = (code.match(/style=\{\{/g) || []).length;
      return inlineStyles < 5; // Allow up to 4 inline styles
    },
    severity: "warning",
    message: "Excessive inline styles — extract to Tailwind classes",
    fix: "Convert inline styles to Tailwind utility classes",
  },
  {
    code: "DUPLICATE_LOGIC",
    dimension: "tokenEfficiency",
    weight: 6,
    dnaCondition: () => true,
    codeCheck: (code) => {
      // Check for repeated patterns (rough heuristic)
      const lines = code.split("\n");
      const uniqueLines = new Set(lines.filter(l => l.trim().length > 20));
      return uniqueLines.size / lines.length > 0.7; // 70%+ unique
    },
    severity: "info",
    message: "Potential duplicate logic detected",
    fix: "Extract repeated logic into helper functions",
  },
  {
    code: "UNNECESSARY_DEPS",
    dimension: "tokenEfficiency",
    weight: 4,
    dnaCondition: () => true,
    codeCheck: (code) => {
      // Check for unnecessary dependencies in useEffect
      const effectsWithManyDeps = (code.match(/useEffect\([^)]+,\s*\[[^\]]{100,}\]/g) || []).length;
      return effectsWithManyDeps === 0;
    },
    severity: "info",
    message: "useEffect has many dependencies — consider splitting",
    fix: "Split into multiple focused effects or use useCallback",
  },
  {
    code: "TYPE_EXPORT",
    dimension: "tokenEfficiency",
    weight: 5,
    dnaCondition: () => true,
    codeCheck: (code) =>
      /interface\s+\w+Props|type\s+\w+Props/.test(code),
    severity: "info",
    message: "No exported Props type — consumers can't extend",
    fix: "Export interface ComponentNameProps for type consumers",
  },
];

// ─── VALIDATION ENGINE ───────────────────────────────────────────

/**
 * Calculate grade from score.
 */
function scoreToGrade(score: number): string {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

/**
 * Validates generated code against DNA requirements.
 * Scores across 5 dimensions:
 * 1. Accessibility (aria, keyboard, screen reader)
 * 2. Animation Physics (spring interrupts, velocity, reduced motion)
 * 3. Edge Case Handling (stacking context, height auto, resize)
 * 4. Token Efficiency (code size, no bloat)
 * 5. Production Safety (portals, scroll lock, focus management)
 *
 * @param code - Generated component code
 * @param dna - Component DNA specification
 * @returns Validation result with dimension scores
 */
export function validateCode(code: string, dna: ComponentDNA): ValidationResult {
  const issues: ValidationIssue[] = [];
  const passed: string[] = [];

  // Track dimension scores
  const dimensionData: Record<ScoreDimension, { earned: number; max: number; issues: number; passed: number }> = {
    accessibility: { earned: 0, max: 0, issues: 0, passed: 0 },
    animation: { earned: 0, max: 0, issues: 0, passed: 0 },
    edgeCases: { earned: 0, max: 0, issues: 0, passed: 0 },
    tokenEfficiency: { earned: 0, max: 0, issues: 0, passed: 0 },
    productionSafety: { earned: 0, max: 0, issues: 0, passed: 0 },
  };

  for (const rule of VALIDATION_RULES) {
    // Check if this rule applies to this DNA
    if (!rule.dnaCondition(dna)) {
      continue;
    }

    // Track max score for this dimension
    dimensionData[rule.dimension].max += rule.weight;

    // Check if code satisfies the rule
    if (rule.codeCheck(code)) {
      passed.push(rule.code);
      dimensionData[rule.dimension].earned += rule.weight;
      dimensionData[rule.dimension].passed += 1;
    } else {
      issues.push({
        severity: rule.severity,
        code: rule.code,
        message: rule.message,
        fix: rule.fix,
        dimension: rule.dimension,
      });
      dimensionData[rule.dimension].issues += 1;
    }
  }

  // Calculate dimension scores
  const dimensions: Record<ScoreDimension, DimensionScore> = {} as any;
  for (const dim of Object.keys(dimensionData) as ScoreDimension[]) {
    const data = dimensionData[dim];
    dimensions[dim] = {
      score: data.earned,
      maxScore: data.max,
      percentage: data.max > 0 ? Math.round((data.earned / data.max) * 100) : 100,
      issues: data.issues,
      passed: data.passed,
    };
  }

  // Calculate overall score (weighted average of dimensions)
  const totalEarned = Object.values(dimensionData).reduce((sum, d) => sum + d.earned, 0);
  const totalMax = Object.values(dimensionData).reduce((sum, d) => sum + d.max, 0);
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 100;

  // Check for critical errors
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return {
    valid: errorCount === 0,
    score,
    grade: scoreToGrade(score),
    dimensions,
    issues,
    passed,
  };
}

/**
 * Quick validation check - returns true if critical issues present.
 */
export function hasValidationErrors(code: string, dna: ComponentDNA): boolean {
  const result = validateCode(code, dna);
  return result.issues.some((i) => i.severity === "error");
}

/**
 * Get validation summary as string (for prompts/feedback).
 */
export function getValidationSummary(result: ValidationResult): string {
  const lines: string[] = [];

  // Overall score
  lines.push(`Score: ${result.score}/100 (Grade: ${result.grade})`);
  lines.push("");

  // Dimension breakdown
  lines.push("Dimension Scores:");
  const dimNames: Record<ScoreDimension, string> = {
    accessibility: "Accessibility",
    animation: "Animation Physics",
    edgeCases: "Edge Cases",
    tokenEfficiency: "Token Efficiency",
    productionSafety: "Production Safety",
  };

  for (const [dim, name] of Object.entries(dimNames)) {
    const d = result.dimensions[dim as ScoreDimension];
    if (d.maxScore > 0) {
      const bar = "█".repeat(Math.floor(d.percentage / 10)) + "░".repeat(10 - Math.floor(d.percentage / 10));
      lines.push(`  ${name}: ${bar} ${d.percentage}%`);
    }
  }

  lines.push("");

  // Issues
  if (result.issues.length > 0) {
    lines.push("Issues:");
    for (const issue of result.issues) {
      const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`${icon} ${issue.message}`);
    }
  }

  // Passed
  if (result.passed.length > 0) {
    lines.push("");
    lines.push("Passed:");
    for (const code of result.passed) {
      lines.push(`✅ ${code.replace(/_/g, " ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format validation as autopsy report.
 */
export function formatAutopsyReport(result: ValidationResult, componentName?: string): string {
  const lines: string[] = [];

  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push(`  COMPONENT AUTOPSY${componentName ? `: ${componentName}` : ""}`);
  lines.push(`═══════════════════════════════════════════════════════`);
  lines.push("");

  // Issues first
  for (const issue of result.issues) {
    const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
    lines.push(`${icon} ${issue.message}`);
  }

  // Then passed
  for (const code of result.passed) {
    lines.push(`✅ ${code.replace(/_/g, " ")}`);
  }

  lines.push("");
  lines.push(`Score: ${result.score}/100 (Grade: ${result.grade})`);
  lines.push("");

  // Dimension breakdown
  const dimNames: Record<ScoreDimension, string> = {
    accessibility: "Accessibility",
    animation: "Animation",
    edgeCases: "Edge Cases",
    tokenEfficiency: "Efficiency",
    productionSafety: "Safety",
  };

  for (const [dim, name] of Object.entries(dimNames)) {
    const d = result.dimensions[dim as ScoreDimension];
    if (d.maxScore > 0) {
      lines.push(`  ${name.padEnd(14)} ${d.percentage}%`);
    }
  }

  return lines.join("\n");
}

// ─── GENERATION GUIDANCE ─────────────────────────────────────────

/**
 * Creates validation-aware generation hints from DNA.
 * These hints help the AI generate compliant code.
 */
export function getGenerationHints(dna: ComponentDNA): string[] {
  const hints: string[] = [];

  if (dna.layout.includes("portal")) {
    hints.push("MUST use createPortal or FloatingPortal for overlay rendering");
  }

  if (dna.layout.includes("floating-position")) {
    hints.push("MUST use @floating-ui/react for position calculation");
  }

  if (dna.a11y.includes("keyboard-nav")) {
    hints.push("MUST handle Arrow keys, Enter, Escape in onKeyDown");
  }

  if (dna.a11y.includes("reduced-motion")) {
    hints.push("MUST respect prefers-reduced-motion media query");
  }

  if (dna.a11y.includes("focus-trap")) {
    hints.push("MUST implement focus trap for modal dialogs");
  }

  if (dna.layout.includes("dynamic-height")) {
    hints.push("MUST NOT use fixed px height - use auto with useMeasure for animation");
  }

  if (dna.animation.includes("velocity-inherit")) {
    hints.push("MUST preserve velocity when animation is interrupted mid-flight");
  }

  if (dna.animation.some((a) => a.startsWith("spring"))) {
    hints.push("MUST use motion/react springs, NEVER CSS transitions");
  }

  return hints;
}
