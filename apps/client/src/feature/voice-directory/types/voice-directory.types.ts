export interface VoiceDirectoryPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface VoiceDirectoryListItem {
  id: string;
  voice_id: string;
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  passport?: string | null;
  hometown?: string | null;
  job?: string | null;
  criminal_record?: unknown;
  audio_url: string;
  enrolled_at: string;
}

export interface VoiceDirectoryListResult {
  items: VoiceDirectoryListItem[];
  pagination: VoiceDirectoryPagination;
}

export interface VoiceIdentifyHistoryItem {
  session_id: string;
  audio_file_id: string | null;
  identified_at: string;
  score: number | null;
}

export interface VoiceHistoryItem {
  audio_url: string;
  created_at: string;
}

export interface VoiceDirectoryDetail {
  id: string;
  voice_id: string | null;
  is_active: boolean;
  name: string;
  citizen_identification: string | null;
  phone_number: string | null;
  hometown: string | null;
  job: string | null;
  passport: string | null;
  criminal_record: Array<{ case: string; year: number }> | null;
  audio_url: string | null;
  audio_available: boolean;
  enrolled_at: string | null;
  voice_history: VoiceHistoryItem[];
  identify_history: VoiceIdentifyHistoryItem[];
}

export interface UpdateVoiceInfoPayload {
  name?: string;
  citizen_identification?: string;
  phone_number?: string;
  hometown?: string;
  job?: string;
  passport?: string;
  criminal_record?: Array<{ case: string; year: number }>;
}

export interface UpdateVoiceInfoResponse {
  id: string;
  name: string;
  phone_number?: string | null;
  job?: string | null;
  updated_at?: string;
}

export interface UpdateEmbeddingJobResponse {
  job_id: string;
  status: string;
  created_at: string;
}

export interface SessionDetailForAudio {
  id: string;
  audio_url: string;
  identified_at: string;
}
