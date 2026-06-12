import { env } from "@/configs/env.config";

function getBrowserOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function getApiBaseUrl() {
  return new URL(env.API_BASE_URL, getBrowserOrigin());
}

function buildApiUrl(pathname: string, search = "", hash = "") {
  const apiBase = getApiBaseUrl();
  const apiPath = apiBase.pathname.replace(/\/$/, "");

  return `${apiBase.origin}${apiPath}${pathname}${search}${hash}`;
}

function buildSameApiOriginUrl(pathname: string, search = "", hash = "") {
  const apiBase = getApiBaseUrl();

  return `${apiBase.origin}${pathname}${search}${hash}`;
}

export function normalizeVoiceAudioUrl(audioUrl: string): string {
  const trimmed = audioUrl.trim().replace("/api/v1/api/v1/", "/api/v1/");

  try {
    const parsed = new URL(trimmed, getBrowserOrigin());

    if (parsed.pathname.includes("/sessions/")) {
      const sessionPathIndex = parsed.pathname.indexOf("/sessions/");
      const sessionPath = parsed.pathname.slice(sessionPathIndex);
      return buildApiUrl(sessionPath, parsed.search, parsed.hash);
    }

    if (parsed.pathname.includes("/cdn/")) {
      const cdnPathIndex = parsed.pathname.indexOf("/cdn/");
      const cdnPath = parsed.pathname.slice(cdnPathIndex);
      return buildSameApiOriginUrl(cdnPath, parsed.search, parsed.hash);
    }

    return parsed.toString();
  } catch {
    if (trimmed.startsWith("/sessions/")) {
      return buildApiUrl(trimmed);
    }

    if (trimmed.startsWith("/cdn/")) {
      return buildSameApiOriginUrl(trimmed);
    }

    return trimmed;
  }
}
