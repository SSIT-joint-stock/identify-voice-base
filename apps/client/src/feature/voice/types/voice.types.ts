export interface CriminalRecordItem {
  case: string;
  year: number;
}

export interface AudioSegment {
  start: number;
  end: number;
}

export interface VoiceTranscriptSegment extends AudioSegment {
  text: string;
}

export interface VoiceSpeakerTranscript {
  speaker_label?: string;
  title?: string;
  text: string;
  segments: VoiceTranscriptSegment[];
}

export type VoiceGender = "MALE" | "FEMALE" | "OTHER";

export interface UploadVoiceFormValues {
  name: string;
  citizenIdentification: string;
  phoneNumber: string;
  hometown: string;
  job: string;
  passport: string;
  age: string;
  gender: "" | VoiceGender;
  criminalRecord: string;
  audioFile: File | null;
  start?: number;
  end?: number;
}

export interface IdentifyVoiceFormValues {
  audioFile: File | null;
}

export interface IdentifyTwoVoiceFormValues {
  audioFile: File | null;
}

export interface UploadVoiceRequest {
  name: string;
  citizen_identification: string;
  phone_number: string;
  hometown: string;
  job: string;
  passport: string;
  age: string;
  gender: "" | VoiceGender;
  criminal_record: string;
  file: File;
}

export interface IdentifyVoiceRequest {
  file: File;
}

export interface IdentifyTwoVoiceRequest {
  file: File;
}

export type VoiceTruthSource = "BUSINESS" | "AI" | "NONE";

export interface VoiceIdentifyItem {
  user_id?: string;
  speaker_label?: string;
  message: string;
  matched_voice_id?: string;
  voice_id?: string; // Fallback or from registration
  score?: number;
  name?: string;
  citizen_identification?: string;
  phone_number?: string;
  hometown?: string;
  job?: string;
  passport?: string;
  age?: number;
  gender?: VoiceGender;
  criminal_record?: CriminalRecordItem[] | unknown[];
  audio_url?: string;
  enroll_audio_url?: string;
  truth_source?: VoiceTruthSource;
  can_modify?: boolean;
  access_source?: "ADMIN" | "OWNER" | "MATCHED_SESSION";
}

export interface VoiceIdentifyTwoItem extends VoiceIdentifyItem {
  audio_path?: string;
  audio_segment?: AudioSegment[];
  num_speakers?: number;
}

export interface UploadVoiceResponse {
  message: string;
  voice_id?: string;
  user_id?: string;
  audio_url?: string;
  age?: number;
  gender?: VoiceGender;
  enrolled_at?: string;
  raw: unknown;
}

export interface IdentifyVoiceResponse {
  items: VoiceIdentifyItem[];
  session_id?: string;
  audio_url?: string;
  identified_at?: string;
  type?: "SINGLE" | "MULTI";
  transcript?: string | null;
  detected_language?: string | null;
  speaker_transcripts?: VoiceSpeakerTranscript[];
  raw: unknown;
}

export interface IdentifyTwoVoiceResponse {
  items: VoiceIdentifyTwoItem[];
  session_id?: string;
  audio_url?: string;
  identified_at?: string;
  type?: "SINGLE" | "MULTI";
  transcript?: string | null;
  detected_language?: string | null;
  speaker_transcripts?: VoiceSpeakerTranscript[];
  raw: unknown;
}

export interface VoiceErrorDialogState {
  open: boolean;
  title: string;
  description: string;
}
