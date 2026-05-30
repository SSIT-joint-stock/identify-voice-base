export type BatchFileStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partial';

export type BatchFileItemStatus =
  | 'pending'
  | 'extracting'
  | 'transcribing'
  | 'translating'
  | 'completed'
  | 'failed';

export type BatchFileSourceType = 'audio' | 'document' | 'image';

export interface BatchFileItemState {
  item_id: string;
  filename: string;
  storage_key?: string;
  mime_type?: string;
  size?: number;
  status: BatchFileItemStatus;
  progress: number;
  target_lang: string;
  source_lang?: string;
  source_file_type?: BatchFileSourceType;
  return_timestamp?: boolean;
  denoise_audio?: boolean;
  transcript?: string;
  translated_text?: string;
  history_record_id?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchFileState {
  batch_id: string;
  status: BatchFileStatus;
  progress: number;
  total_items: number;
  completed_items: number;
  failed_items: number;
  items: BatchFileItemState[];
  created_at: string;
  updated_at: string;
}
