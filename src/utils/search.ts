export type SearchStringSplit = {
  normalizedValue: string;
  rawTokens: string[];
};

export function formatSearchString(value: string): SearchStringSplit | undefined {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  const rawTokens = normalizedValue
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return { normalizedValue, rawTokens };
}
