import { TRANSLATE_PROGRESS_STEP_DELAY_MS } from "@/utils/constant";
export type ProcessingStep = "idle" | "extracting" | "translating";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function animateProgressTo(
  fromProgress: number,
  toProgress: number,
  onProgress: (progress: number) => void,
  shouldContinue?: () => boolean,
) {
  const start = Math.max(0, Math.min(100, Math.round(fromProgress)));
  const end = Math.max(start, Math.min(100, Math.round(toProgress)));

  for (let progress = start + 1; progress <= end; progress += 1) {
    if (shouldContinue && !shouldContinue()) return;

    onProgress(progress);
    await wait(TRANSLATE_PROGRESS_STEP_DELAY_MS);
  }
}

function getDetectedLanguageCode(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim())?.trim() ?? null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return (
    value
      .split(",")
      .map((item) => item.trim())
      .find(Boolean) ?? null
  );
}

export { animateProgressTo, getDetectedLanguageCode, wait };
