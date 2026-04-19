export const APP_NAME = "Voice Identify";

export const QUERY_KEYS = {
  admin: {
    accounts: {
      base: ["admin", "accounts"] as const,
      list: (params: {
        search: string;
        page: number;
        pageSize: 10 | 20 | 50;
        role: "all" | "ADMIN" | "OPERATOR";
        status: "all" | "ACTIVE" | "INACTIVE";
        sortBy: "email" | "username" | "role" | "status";
        sortOrder: "asc" | "desc";
      }) => ["admin", "accounts", "list", params] as const,
      detail: (id: string) => ["admin", "accounts", "detail", id] as const,
    },
  },
  voice: {
    upload: ["voice", "upload"] as const,
    identify: ["voice", "identify"] as const,
    identifyTwo: ["voice", "identify-two"] as const,
    directory: {
      list: (params: {
        search: string;
        page: number;
        pageSize: 10 | 20 | 50;
        sortBy: "name" | "enrolled_at";
        sortOrder: "asc" | "desc";
      }) => ["voice", "directory", "list", params] as const,
      detail: (id: string) => ["voice", "directory", "detail", id] as const,
    },
    sessions: {
      list: (params: {
        page: number;
        pageSize: 10 | 25 | 50;
        fromDate: string;
        toDate: string;
      }) => ["voice", "sessions", "list", params] as const,
      detail: (id: string) => ["voice", "sessions", "detail", id] as const,
    },
    sessionAudio: (sessionId: string) =>
      ["voice", "directory", "session", sessionId] as const,
  },
} as const;

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  HOME: "/",
  ADMIN: "/admin",
  ADMIN_ACCOUNTS: "/admin/accounts",
  VOICE: "/voice",
  TRANSLATE: "/translate",
  TRANSLATE_LIVE: "/translate/live",
  TRANSLATE_FILE: "/translate/file",
  VOICE_ENROLL: "/voice/enroll",
  VOICE_SEARCH_SINGLE: "/voice/search-single",
  VOICE_SEARCH_MULTI: "/voice/search-multi",
  VOICE_GUIDE: "/voice/guide",
  VOICE_DIRECTORY: "/voice/directory",
  VOICE_HISTORY: "/voice/session-history",
  NOT_FOUND: "*",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
] as const;

export const MAX_AUDIO_FILE_SIZE_MB = 25;
export const MAX_AUDIO_FILE_SIZE_BYTES = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024;

export const VOICE_API_ENDPOINTS = {
  ENROLL: "/voices/enroll",
  IDENTIFY: "/identify",
  VOICES: "/voices",
  SESSIONS: "/sessions",
} as const;

export const VOICE_TABS = {
  ENROLL: "enroll",
  IDENTIFY: "identify",
  IDENTIFY_TWO: "identify-two",
} as const;
