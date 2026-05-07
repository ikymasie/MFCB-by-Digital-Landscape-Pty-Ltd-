import { parseRecord } from './parser/fixed-length-parser';
import { validateFileHeader, validateFileTrailer } from './parser/file-validator';
import { validateLayer1 } from './validators/layer1-format';
import { validateLayer2 } from './validators/layer2-mandatory';
import { validateLayer3 } from './validators/layer3-reference';
import { validateLayer4, parseDate } from './validators/layer4-domain';
import { validateLayer5 } from './validators/layer5-financial';
import { validateLayer6 } from './validators/layer6-status';
import { validateLayer7 } from './validators/layer7-cross-field';
import {
  FormGRecord,
  ValidationError,
  ValidationResult,
  RecordValidationResult,
  BatchContext,
} from './types';

// ---------------------------------------------------------------------------
// Single-record validation (all 7 layers)
// ---------------------------------------------------------------------------

export function validateRecord(
  record: FormGRecord,
  rowNumber: number,
  ctx: BatchContext,
  reportingMonthDate: Date,
): RecordValidationResult {
  const errors: ValidationError[] = [
    ...validateLayer1(record, rowNumber),
    ...validateLayer2(record, rowNumber),
    ...validateLayer3(record, rowNumber),
    ...validateLayer4(record, rowNumber, reportingMonthDate),
    ...validateLayer5(record, rowNumber, reportingMonthDate),
    ...validateLayer6(record, rowNumber, reportingMonthDate),
    ...validateLayer7(record, rowNumber, ctx),
  ];

  const is_valid = !errors.some(e => e.severity === 'REJECT');

  return { row_number: rowNumber, is_valid, errors, parsed: record };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a Date from the reporting_month CCYYMMDD string.
 * Falls back to end-of-current-month if parsing fails.
 */
function reportingMonthToDate(reportingMonth: string): Date {
  const d = parseDate(reportingMonth);
  if (d) return d;
  // Fallback: last day of current month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

/**
 * Compile a ValidationResult from an array of RecordValidationResult and any
 * file-level errors.
 */
function compileResult(
  recordResults: RecordValidationResult[],
  fileLevelErrors: ValidationError[],
): ValidationResult {
  const allErrors = [
    ...fileLevelErrors,
    ...recordResults.flatMap(r => r.errors),
  ];

  const accepted = recordResults.filter(r => r.is_valid).length;
  const rejected = recordResults.filter(r => !r.is_valid).length;
  const warnings = allErrors.filter(e => e.severity === 'WARN').length;

  return {
    total_records:    recordResults.length,
    accepted_count:   accepted,
    rejected_count:   rejected,
    warning_count:    warnings,
    errors:           allErrors,
    record_results:   recordResults,
  };
}

// ---------------------------------------------------------------------------
// Batch validation from fixed-length file lines
// ---------------------------------------------------------------------------

/**
 * Validate a complete Form G submission from an array of raw text lines.
 *
 * Expects:
 *   - lines[0]              = header record (record_type 'H')
 *   - lines[1..n-2]         = data records  (record_type 'D')
 *   - lines[lines.length-1] = trailer record (record_type 'T')
 *
 * Lines that are entirely blank are skipped.
 */
export function validateBatch(
  lines: string[],
  ctx: BatchContext,
): ValidationResult {
  const reportingMonthDate = reportingMonthToDate(ctx.reporting_month);
  const fileLevelErrors: ValidationError[] = [];

  // Filter out purely blank lines
  const nonEmptyLines = lines.filter(l => l.trim() !== '');

  if (nonEmptyLines.length < 2) {
    fileLevelErrors.push({
      row_number:     0,
      field:          null,
      code:           'HEADER_RECORD_COUNT_MISMATCH',
      severity:       'REJECT',
      raw_value:      null,
      message:        'File must contain at least a header and trailer record',
      error_category: 'FILE_LEVEL',
    });
    return compileResult([], fileLevelErrors);
  }

  const headerLine  = nonEmptyLines[0];
  const trailerLine = nonEmptyLines[nonEmptyLines.length - 1];
  const dataLines   = nonEmptyLines.slice(1, nonEmptyLines.length - 1);

  // Validate file-level header
  fileLevelErrors.push(...validateFileHeader(headerLine, ctx));

  // Validate and parse data records
  const recordResults: RecordValidationResult[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNumber = i + 2; // row 1 = header, row 2+ = data
    const parsed    = parseRecord(dataLines[i], rowNumber);
    const result    = validateRecord(parsed, rowNumber, ctx, reportingMonthDate);
    recordResults.push(result);
  }

  // Validate file-level trailer
  fileLevelErrors.push(...validateFileTrailer(trailerLine, dataLines.length, ctx));

  return compileResult(recordResults, fileLevelErrors);
}

// ---------------------------------------------------------------------------
// JSON batch validation (pre-parsed records from API submission)
// ---------------------------------------------------------------------------

/**
 * Validate a batch of pre-parsed FormGRecord objects (from a JSON API submission).
 * No header/trailer processing is done — all records are treated as data records.
 */
export function validateJsonRecords(
  records: FormGRecord[],
  ctx: BatchContext,
): ValidationResult {
  const reportingMonthDate = reportingMonthToDate(ctx.reporting_month);

  const recordResults: RecordValidationResult[] = records.map((record, idx) => {
    const rowNumber = idx + 1;
    return validateRecord(record, rowNumber, ctx, reportingMonthDate);
  });

  return compileResult(recordResults, []);
}
