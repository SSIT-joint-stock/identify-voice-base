/**
 * Runtime config takes precedence so the deployed frontend can be reconfigured
 * without rebuilding the image. Vite env remains the local dev fallback.
 */

declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

function getRuntimeEnv(key: keyof NonNullable<Window["__APP_CONFIG__"]>) {
  return window.__APP_CONFIG__?.[key];
}

function getEnv(key: string, fallback = ""): string {
  const runtimeValue =
    key === "VITE_API_BASE_URL" ? getRuntimeEnv("API_BASE_URL") : undefined;

  if (runtimeValue) {
    return runtimeValue;
  }

  const value = import.meta.env[key];
  if (value === undefined || value === "") {
    console.warn(`[env] Missing environment variable: ${key}`);
    return fallback;
  }
  return value as string;
}

export const env = {
  API_BASE_URL: getEnv("VITE_API_BASE_URL", "/api/v1"),
  MODE: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;

export type Env = typeof env;
