// Engine — main entry points
export { validateRecord, validateBatch, validateJsonRecords } from './engine';

// Types
export type {
  FormGRecord,
  ValidationError,
  ValidationResult,
  RecordValidationResult,
  FileValidationResult,
  BatchContext,
} from './types';

// Error codes
export { ErrorCodes } from './error-codes';
export type { ErrorCode } from './error-codes';

// Parser
export { parseRecord } from './parser/fixed-length-parser';
export {
  validateFileHeader,
  validateFileTrailer,
  validateFileName,
} from './parser/file-validator';
