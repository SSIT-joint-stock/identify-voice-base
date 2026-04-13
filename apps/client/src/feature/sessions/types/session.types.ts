export interface SessionOperator {
  id: string;
  username: string;
}

export interface SessionPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface SessionListItem {
  id: string;
  audio_url: string;
  identified_at: string;
  operator: SessionOperator;
  result_count: number;
  top_score: number | null;
}

export interface SessionListResult {
  items: SessionListItem[];
  pagination: SessionPagination;
}

export interface SessionSegment {
  start: number;
  end: number;
}

export interface SessionSpeaker {
  speaker_label: string;
  matched_voice_id: string | null;
  score: number | null;
  segments?: SessionSegment[] | null;
  audio_url: string | null;
  name: string;
  citizen_identification?: string | null;
  phone_number?: string | null;
  hometown?: string | null;
  job?: string | null;
  passport?: string | null;
  criminal_record?: unknown;
  enroll_audio_url?: string | null;
  truth_source: "BUSINESS" | "AI" | "NONE";
}

export interface SessionDetail {
  id: string;
  audio_url: string;
  identified_at: string;
  operator: SessionOperator;
  speakers: SessionSpeaker[];
}
