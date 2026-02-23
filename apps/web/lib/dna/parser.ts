/**
 * DNA INTENT PARSER
 *
 * The ONLY step that uses AI tokens (~200 tokens).
 * Converts any natural language to structured DNA.
 *
 * "make me a dropdown" → ComponentDNA
 * "ड्रॉपडाउन बनाओ" → ComponentDNA
 * "select thing that closes when I click outside" → ComponentDNA
 */

import {
  ComponentDNA,
  ComponentType,
  createEmptyDNA,
} from "./schema";

// ─── MINIMAL AI PROMPT ───────────────────────────────────────────

/**
 * Ultra-minimal prompt for intent parsing.
 * Only ~100 tokens for system + ~50-100 for response.
 */
export const INTENT_PARSER_PROMPT = `Parse user intent into component DNA JSON.

TYPES: button,dropdown,select,modal,dialog,drawer,popover,tooltip,menu,tabs,accordion,card,input,textarea,checkbox,radio,switch,slider,toast,notification,avatar,badge,loader,pagination,navigation,table,calendar

OUTPUT JSON only:
{
  "type": "string",
  "interaction": ["click","hover","keyboard","outside-dismiss","escape-dismiss"],
  "a11y": ["focus-trap","aria-expanded","reduced-motion"],
  "layout": ["portal","overlay","fixed"],
  "animation": ["spring","fade","scale"],
  "variants": ["single-select","multi-select"]
}

Include ONLY features explicitly mentioned or strongly implied. Leave arrays empty if not mentioned.`;

// ─── LOCAL PARSER (Zero AI) ──────────────────────────────────────

/**
 * Attempts to parse intent locally without AI.
 * Falls back to AI only when local parsing fails.
 */
export function parseIntentLocally(input: string): ComponentDNA | null {
  const lower = input.toLowerCase();

  // Type detection patterns
  const typePatterns: [RegExp, ComponentType][] = [
    [/\b(dropdown|drop-down|drop down)\b/, "dropdown"],
    [/\b(select|selector|selection)\b/, "select"],
    [/\b(modal|popup|pop-up)\b/, "modal"],
    [/\b(dialog|dialogue)\b/, "dialog"],
    [/\b(drawer|slide-out|slideout|panel)\b/, "drawer"],
    [/\b(popover|pop-over)\b/, "popover"],
    [/\b(tooltip|tip|hint)\b/, "tooltip"],
    [/\b(menu|context-menu|contextmenu)\b/, "menu"],
    [/\b(tabs|tab-list|tabbed)\b/, "tabs"],
    [/\b(accordion|collapsible|expandable)\b/, "accordion"],
    [/\b(card|tile)\b/, "card"],
    [/\b(button|btn|cta)\b/, "button"],
    [/\b(input|text-field|textfield)\b/, "input"],
    [/\b(textarea|text-area|multiline)\b/, "textarea"],
    [/\b(checkbox|check-box)\b/, "checkbox"],
    [/\b(radio|radio-button)\b/, "radio"],
    [/\b(switch|toggle)\b/, "switch"],
    [/\b(slider|range)\b/, "slider"],
    [/\b(toast|snackbar)\b/, "toast"],
    [/\b(notification|alert|message)\b/, "notification"],
    [/\b(avatar|profile-pic|user-image)\b/, "avatar"],
    [/\b(badge|tag|chip)\b/, "badge"],
    [/\b(loader|loading|spinner)\b/, "loader"],
    [/\b(pagination|pager|pages)\b/, "pagination"],
    [/\b(navigation|nav|navbar|sidebar)\b/, "navigation"],
    [/\b(table|data-table|grid)\b/, "table"],
    [/\b(calendar|date-picker|datepicker)\b/, "calendar"],
    [/\b(hero|banner|header-section)\b/, "hero"],
    [/\b(pricing|price-table)\b/, "pricing"],
  ];

  // Find component type
  let detectedType: ComponentType | null = null;
  for (const [pattern, type] of typePatterns) {
    if (pattern.test(lower)) {
      detectedType = type;
      break;
    }
  }

  if (!detectedType) {
    return null; // Can't parse locally, need AI
  }

  // Start with empty DNA
  const dna = createEmptyDNA(detectedType);

  // Detect interaction features
  if (/click|press|tap/.test(lower)) dna.interaction.push("click");
  if (/hover|mouse-over|mouseover/.test(lower)) dna.interaction.push("hover");
  if (/keyboard|arrow|enter|escape/.test(lower)) dna.interaction.push("keyboard");
  if (/outside|click-away|dismiss/.test(lower)) dna.interaction.push("outside-dismiss");
  if (/escape|esc/.test(lower)) dna.interaction.push("escape-dismiss");
  if (/drag|draggable/.test(lower)) dna.interaction.push("drag");
  if (/swipe/.test(lower)) dna.interaction.push("swipe");

  // Detect a11y features
  if (/focus-trap|trap.*focus/.test(lower)) dna.a11y.push("focus-trap");
  if (/aria|accessible|a11y/.test(lower)) dna.a11y.push("screen-reader");
  if (/reduce.*motion|motion.*reduce/.test(lower)) dna.a11y.push("reduced-motion");

  // Detect layout features
  if (/portal|outside.*dom/.test(lower)) dna.layout.push("portal");
  if (/overlay|backdrop/.test(lower)) dna.layout.push("overlay");
  if (/fixed|sticky/.test(lower)) dna.layout.push("fixed");
  if (/fullscreen|full-screen/.test(lower)) dna.layout.push("fullscreen");

  // Detect animation features
  if (/spring|physics|bouncy/.test(lower)) dna.animation.push("spring");
  if (/fade|opacity/.test(lower)) dna.animation.push("fade");
  if (/scale|grow|shrink/.test(lower)) dna.animation.push("scale");
  if (/slide|slide-in|slideout/.test(lower)) dna.animation.push("slide");
  if (/no.*anim|static|instant/.test(lower)) dna.animation.push("none");

  // Detect variants
  if (/multi.*select|multiple/.test(lower)) dna.variants.push("multi-select");
  if (/single.*select|single/.test(lower)) dna.variants.push("single-select");
  if (/search|searchable|filter/.test(lower)) dna.variants.push("searchable");
  if (/async|lazy|load/.test(lower)) dna.variants.push("async");

  return dna;
}

// ─── AI PARSER RESPONSE TYPE ─────────────────────────────────────

export interface ParsedIntent {
  dna: ComponentDNA;
  confidence: number;
  method: "local" | "ai";
  tokensUsed: number;
}

/**
 * Parse raw AI response into ComponentDNA
 */
export function parseAIResponse(response: string): ComponentDNA | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.type) return null;

    return {
      type: parsed.type,
      interaction: Array.isArray(parsed.interaction) ? parsed.interaction : [],
      a11y: Array.isArray(parsed.a11y) ? parsed.a11y : [],
      layout: Array.isArray(parsed.layout) ? parsed.layout : [],
      animation: Array.isArray(parsed.animation) ? parsed.animation : [],
      variants: Array.isArray(parsed.variants) ? parsed.variants : [],
      style: Array.isArray(parsed.style) ? parsed.style : undefined,
      size: Array.isArray(parsed.size) ? parsed.size : undefined,
      state: Array.isArray(parsed.state) ? parsed.state : undefined,
    };
  } catch {
    return null;
  }
}

// ─── INTENT COMPARISON ───────────────────────────────────────────

/**
 * Common intent variations mapped to canonical forms.
 * Used for quick intent normalization.
 */
export const INTENT_ALIASES: Record<string, ComponentType> = {
  // Dropdown variations
  "dropdown": "dropdown",
  "drop-down": "dropdown",
  "drop down": "dropdown",
  "select box": "dropdown",
  "combo box": "dropdown",
  "combobox": "dropdown",

  // Modal variations
  "modal": "modal",
  "popup": "modal",
  "pop-up": "modal",
  "lightbox": "modal",
  "overlay dialog": "modal",

  // Dialog variations
  "dialog": "dialog",
  "dialogue": "dialog",
  "alert dialog": "dialog",
  "confirm dialog": "dialog",

  // Button variations
  "button": "button",
  "btn": "button",
  "cta": "button",
  "action button": "button",
  "submit button": "button",

  // Input variations
  "input": "input",
  "text input": "input",
  "text field": "input",
  "textfield": "input",
  "text box": "input",

  // Toast variations
  "toast": "toast",
  "snackbar": "toast",
  "snack bar": "toast",
  "notification toast": "toast",

  // Card variations
  "card": "card",
  "tile": "card",
  "panel": "card",
  "content card": "card",
};

export function normalizeIntent(input: string): ComponentType | null {
  const lower = input.toLowerCase().trim();
  return INTENT_ALIASES[lower] || null;
}
