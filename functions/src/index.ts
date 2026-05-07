import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin once — subsequent calls to getFirestore() / getStorage() etc.
// will reuse this initialized instance across warm invocations.
initializeApp();

export { fnParseBatch } from './fn-parse-batch';
export { fnValidateChunk } from './fn-validate-chunk';
export { fnAggregateBatch } from './fn-aggregate-batch';
export { fnMasterRecords } from './fn-master-records';
export { fnNotifyCompletion } from './fn-notify-completion';
export { fnDlqAlert } from './fn-dlq-alert';
