export const APP_NAME = "Voice Identify";

export const QUERY_KEYS = {
  voice: {
    upload: ["voice", "upload"] as const,
    identify: ["voice", "identify"] as const,
    identifyTwo: ["voice", "identify-two"] as const,
    directory: {
      list: (params: { search: string }) =>
        ["voice", "directory", "list", params] as const,
      detail: (id: string) => ["voice", "directory", "detail", id] as const,
    },
    sessionAudio: (sessionId: string) =>
      ["voice", "directory", "session", sessionId] as const,
  },
} as const;

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  HOME: "/",
  VOICE: "/voice",
  VOICE_ENROLL: "/voice/enroll",
  VOICE_SEARCH_SINGLE: "/voice/search-single",
  VOICE_SEARCH_MULTI: "/voice/search-multi",
  VOICE_GUIDE: "/voice/guide",
  VOICE_DIRECTORY: "/voice/directory",
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
