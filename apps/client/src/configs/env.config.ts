/**
 * Helper for safely reading Vite environment variables.
 * All variables must be prefixed with VITE_ to be exposed to the client.
 */

function getEnv(key: string, fallback = ""): string {
  const value = import.meta.env[key];
  if (value === undefined || value === "") {
    console.warn(`[env] Missing environment variable: ${key}`);
    return fallback;
  }
  return value as string;
}

export const env = {
  API_BASE_URL: getEnv("VITE_API_BASE_URL", "http://localhost:3000/api/v1"),
  MODE: import.meta.env.MODE,
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;

export type Env = typeof env;
