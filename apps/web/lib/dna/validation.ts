/**
 * DNA VALIDATION ENGINE
 *
 * Validates generated code against DNA requirements.
 * Catches issues like missing portal, keyboard nav, reduced-motion, etc.
 */

import { ComponentDNA } from "./schema";

// ─── VALIDATION TYPES ────────────────────────────────────────────

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  fix?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  passed: string[];
}

// ─── VALIDATION RULES ────────────────────────────────────────────

interface ValidationRule {
  code: string;
  dnaCondition: (dna: ComponentDNA) => boolean;
  codeCheck: (code: string) => boolean;
  severity: "error" | "warning" | "info";
  message: string;
  fix: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  // ═══════════════════════════════════════════════════════════════
  // PORTAL & POSITIONING
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_PORTAL",
    dnaCondition: (dna) => dna.layout.includes("portal"),
    codeCheck: (code) =>
      /createPortal|Portal|FloatingPortal|@floating-ui/.test(code),
    severity: "error",
    message: "No portal — component will break inside transformed parents",
    fix: "Use createPortal from react-dom or FloatingPortal from @floating-ui/react",
  },
  {
    code: "NO_FLOATING_POSITION",
    dnaCondition: (dna) => dna.layout.includes("floating-position"),
    codeCheck: (code) =>
      /useFloating|@floating-ui|computePosition|Popper/.test(code),
    severity: "error",
    message: "No position calculation — overlay will misposition in complex layouts",
    fix: "Use @floating-ui/react for automatic position calculation",
  },
  {
    code: "TRANSFORM_UNSAFE",
    dnaCondition: (dna) => dna.layout.includes("transform-safe"),
    codeCheck: (code) =>
      /strategy:\s*['"]fixed['"]|position:\s*['"]fixed['"]|FloatingPortal/.test(code) ||
      !/transform:/.test(code), // No transforms OR uses fixed positioning
    severity: "warning",
    message: "Transform may break positioning in nested contexts",
    fix: "Use position: fixed with @floating-ui or avoid transforms on positioned ancestors",
  },

  // ═══════════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION (WCAG 2.1)
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_KEYBOARD_NAV",
    dnaCondition: (dna) => dna.a11y.includes("keyboard-nav"),
    codeCheck: (code) =>
      /onKeyDown|handleKeyDown|keydown|ArrowUp|ArrowDown|Enter|Escape/.test(code),
    severity: "error",
    message: "No keyboard navigation — fails WCAG 2.1 compliance",
    fix: "Add onKeyDown handler with Arrow keys, Enter, Escape support",
  },
  {
    code: "MISSING_TABINDEX",
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
    dnaCondition: (dna) => dna.a11y.includes("focus-visible"),
    codeCheck: (code) =>
      /focus-visible|:focus-visible|focusVisible|outline/.test(code),
    severity: "warning",
    message: "No focus-visible styles — keyboard users can't see focus",
    fix: "Add focus-visible:ring-2 or similar focus indicator",
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION & REDUCED MOTION
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_REDUCED_MOTION",
    dnaCondition: (dna) => dna.a11y.includes("reduced-motion"),
    codeCheck: (code) =>
      /prefers-reduced-motion|reducedMotion|useReducedMotion|motion-reduce/.test(code),
    severity: "error",
    message: "Animation ignores prefers-reduced-motion — accessibility violation",
    fix: "Add useReducedMotion hook or motion-reduce: CSS media query",
  },
  {
    code: "CSS_TRANSITION",
    dnaCondition: (dna) => dna.animation.some((a) => a.startsWith("spring")),
    codeCheck: (code) =>
      !/transition-duration|ease-in|ease-out|cubic-bezier|transition:/.test(code),
    severity: "error",
    message: "CSS transition found — should use spring physics",
    fix: "Replace CSS transitions with motion/react spring animations",
  },
  {
    code: "NO_VELOCITY_INHERIT",
    dnaCondition: (dna) => dna.animation.includes("velocity-inherit"),
    codeCheck: (code) =>
      /velocity|initialVelocity|from.*velocity|animate.*velocity/.test(code) ||
      /useSpring|useMotionValue/.test(code), // These handle velocity automatically
    severity: "warning",
    message: "Spring animation has no velocity inheritance on interrupt",
    fix: "Use useSpring or pass velocity from previous animation state",
  },
  {
    code: "NOT_INTERRUPTIBLE",
    dnaCondition: (dna) => dna.animation.includes("interruptible"),
    codeCheck: (code) =>
      /AnimatePresence|animate=|useSpring|motion\./.test(code),
    severity: "warning",
    message: "Animation may not be interruptible mid-flight",
    fix: "Use motion components or useSpring for interruptible animations",
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC HEIGHT
  // ═══════════════════════════════════════════════════════════════
  {
    code: "FIXED_HEIGHT",
    dnaCondition: (dna) => dna.layout.includes("dynamic-height"),
    codeCheck: (code) =>
      !/height:\s*\d+px/.test(code) || // No fixed px height
      /height:\s*['"]auto['"]|height.*content|max-content|fit-content/.test(code) ||
      /useMeasure|getBoundingClientRect|ResizeObserver|height.*auto/.test(code),
    severity: "error",
    message: "Uses fixed height — won't handle dynamic content",
    fix: "Use auto height with useMeasure hook for animated height changes",
  },
  {
    code: "NO_CONTENT_MEASURE",
    dnaCondition: (dna) => dna.layout.includes("measure-content"),
    codeCheck: (code) =>
      /useMeasure|getBoundingClientRect|ResizeObserver|useElementSize/.test(code),
    severity: "warning",
    message: "No content measurement — animated height will jump",
    fix: "Use useMeasure from @react-hookz/web or react-use for smooth height animation",
  },
  {
    code: "NO_MAX_HEIGHT_SCROLL",
    dnaCondition: (dna) => dna.layout.includes("max-height-scroll"),
    codeCheck: (code) =>
      /max-height|maxHeight|overflow.*auto|overflow.*scroll/.test(code),
    severity: "warning",
    message: "No max-height with scroll — dropdown may overflow viewport",
    fix: "Add max-h-[300px] overflow-auto or similar constraint",
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════
  {
    code: "NO_FOCUS_TRAP",
    dnaCondition: (dna) => dna.a11y.includes("focus-trap"),
    codeCheck: (code) =>
      /FocusTrap|useFocusTrap|focus-trap|trapFocus|createFocusTrap/.test(code),
    severity: "error",
    message: "No focus trap — modal allows focus to escape",
    fix: "Use FocusTrap component or useFocusTrap hook",
  },
  {
    code: "NO_ARIA_EXPANDED",
    dnaCondition: (dna) => dna.a11y.includes("aria-expanded"),
    codeCheck: (code) =>
      /aria-expanded/.test(code),
    severity: "error",
    message: "Missing aria-expanded — screen readers can't detect state",
    fix: "Add aria-expanded={isOpen} to trigger element",
  },
  {
    code: "NO_ARIA_LIVE",
    dnaCondition: (dna) => dna.a11y.includes("aria-live"),
    codeCheck: (code) =>
      /aria-live|role=['"]alert['"]|role=['"]status['"]/.test(code),
    severity: "error",
    message: "No aria-live region — screen readers miss dynamic updates",
    fix: "Add aria-live='polite' or role='status' for dynamic content",
  },
  {
    code: "NO_ESCAPE_DISMISS",
    dnaCondition: (dna) => dna.interaction.includes("escape-dismiss"),
    codeCheck: (code) =>
      /Escape|escape|key.*27|keyCode.*27/.test(code),
    severity: "error",
    message: "No Escape key dismiss — WCAG modal pattern violation",
    fix: "Add onKeyDown handler that closes on Escape key",
  },
  {
    code: "NO_OUTSIDE_DISMISS",
    dnaCondition: (dna) => dna.interaction.includes("outside-dismiss"),
    codeCheck: (code) =>
      /useClickOutside|onClickOutside|clickOutside|useOnClickOutside|click.*outside/.test(code) ||
      /FloatingOverlay|useFloating.*dismiss/.test(code),
    severity: "warning",
    message: "No click-outside dismiss — poor UX for overlays",
    fix: "Use useClickOutside hook or FloatingOverlay with dismiss",
  },

  // ═══════════════════════════════════════════════════════════════
  // MOTION/REACT IMPORT
  // ═══════════════════════════════════════════════════════════════
  {
    code: "WRONG_MOTION_IMPORT",
    dnaCondition: (dna) => dna.animation.length > 0,
    codeCheck: (code) =>
      /from ['"]motion\/react['"]/.test(code) ||
      /from ['"]motion['"]/.test(code) ||
      !/framer-motion/.test(code), // Either motion/react OR no framer-motion
    severity: "warning",
    message: "Using framer-motion instead of motion/react",
    fix: "Import from 'motion/react' instead of 'framer-motion'",
  },
];

// ─── VALIDATION ENGINE ───────────────────────────────────────────

/**
 * Validates generated code against DNA requirements.
 *
 * @param code - Generated component code
 * @param dna - Component DNA specification
 * @returns Validation result with issues and score
 */
export function validateCode(code: string, dna: ComponentDNA): ValidationResult {
  const issues: ValidationIssue[] = [];
  const passed: string[] = [];

  for (const rule of VALIDATION_RULES) {
    // Check if this rule applies to this DNA
    if (!rule.dnaCondition(dna)) {
      continue;
    }

    // Check if code satisfies the rule
    if (rule.codeCheck(code)) {
      passed.push(rule.code);
    } else {
      issues.push({
        severity: rule.severity,
        code: rule.code,
        message: rule.message,
        fix: rule.fix,
      });
    }
  }

  // Calculate score
  const totalRules = passed.length + issues.length;
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  // Errors = -10 points, Warnings = -5 points
  const deductions = errorCount * 10 + warningCount * 5;
  const score = Math.max(0, 100 - deductions);

  return {
    valid: errorCount === 0,
    score,
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
  if (result.valid && result.score === 100) {
    return "✅ All validation checks passed";
  }

  const lines: string[] = [];

  for (const issue of result.issues) {
    const icon = issue.severity === "error" ? "❌" : "⚠️";
    lines.push(`${icon} ${issue.message}`);
  }

  for (const code of result.passed) {
    lines.push(`✅ ${code.replace(/_/g, " ").toLowerCase()}`);
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
