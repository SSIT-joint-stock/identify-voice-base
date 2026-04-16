export interface TruncTextOptions {
  maxLength: number;
  suffix?: string; // mặc định "..."
  breakWord?: boolean; // mặc định false (không cắt vỡ từ)
}

export function truncText(
  value: string | null | undefined,
  options: TruncTextOptions,
): string {
  if (!value) return "";

  const { maxLength, suffix = "...", breakWord = false } = options;

  if (value.length <= maxLength) return value;

  if (breakWord) {
    return value.slice(0, maxLength) + suffix;
  }

  // Không cắt giữa từ
  const trimmed = value.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(" ");

  if (lastSpace === -1) {
    return trimmed + suffix;
  }

  return trimmed.slice(0, lastSpace) + suffix;
}
