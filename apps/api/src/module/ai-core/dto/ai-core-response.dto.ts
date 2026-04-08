export interface AiCoreIdentifyResponse {
  message: string;
  matched_voice_id?: string;
  score?: number;
  name?: string;
  citizen_identification?: string;
  phone_number?: string;
  hometown?: string;
  job?: string;
  passport?: string;
  criminal_record?: any[];
}

export interface AiCoreMultiIdentifyResponse {
  num_speakers: number;
  speakers: {
    label: string;
    speaker_label?: string;
    matched_voice_id: string | null;
    score: number | null;
    name?: string;
    citizen_identification?: string;
    phone_number?: string;
    hometown?: string;
    job?: string;
    passport?: string;
    criminal_record?: any[];
    segments: Array<{
      start: number;
      end: number;
    }>;
  }[];
  error?: string;
}

export interface AiCoreUploadResponse {
  message: string;
  voice_id: string;
}
