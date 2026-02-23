import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function extractCodeFromResponse(response: string): string {
  // Remove markdown code fences if present
  let code = response;

  // Handle ```typescript or ```tsx blocks
  const tsMatch = code.match(/```(?:typescript|tsx)?\s*([\s\S]*?)```/);
  if (tsMatch) {
    code = tsMatch[1].trim();
  }

  // Handle ``` blocks without language
  const plainMatch = code.match(/```\s*([\s\S]*?)```/);
  if (plainMatch && !tsMatch) {
    code = plainMatch[1].trim();
  }

  return code.trim();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
