import { getFirestore } from 'firebase-admin/firestore';

export function getDb() {
  return getFirestore();
}

// Firestore document structure for batch state:
// batches/{batchId}:
//   { status, total_chunks, completed_chunks, failed_chunks, total_records,
//     accepted_count, rejected_count, warning_count, updated_at }
// batches/{batchId}/chunks/{chunkIndex}:
//   { status: 'pending'|'completed'|'failed', error_count, accepted_count, processed_at }
// batches/{batchId}/mastering/progress:
//   { completed_chunks, total_chunks, updated_at }
