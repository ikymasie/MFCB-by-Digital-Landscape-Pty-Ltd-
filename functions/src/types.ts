export interface ChunkValidateMessage {
  batch_id: string;
  institution_id: string;
  supplier_reference_number: string;
  reporting_month: string;
  file_type: 'TEST' | 'LIVE';
  chunk_index: number;
  total_chunks: number;
  rows: string[]; // raw fixed-length lines OR JSON-stringified FormGRecord[]
  is_json: boolean; // true for API submissions, false for file uploads
}

export interface MasterRecordsMessage {
  batch_id: string;
  institution_id: string;
  reporting_month: string;
  accepted_raw_record_ids: string[]; // UUIDs of raw_submission_records to master
  chunk_index: number;
  total_mastering_chunks: number;
}

export interface BatchCompleteMessage {
  batch_id: string;
  institution_id: string;
  status: 'COMPLETED' | 'FAILED';
  accepted_count: number;
  rejected_count: number;
  warning_count: number;
}

export interface WebhookOutboundMessage {
  institution_id: string;
  event_type: 'batch.completed' | 'batch.validation_failed' | 'batch.rejected';
  payload: object;
  retry_count: number;
}
