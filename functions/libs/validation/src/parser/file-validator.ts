import { ValidationError, BatchContext } from '../types';
import { ErrorCodes } from '../error-codes';
import { parseDate } from '../validators/layer4-domain';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function fileError(
  code: string,
  message: string,
  field: string | null = null,
  raw_value: string | null = null,
): ValidationError {
  return {
    row_number: 0,
    field,
    code,
    severity: 'REJECT',
    raw_value,
    message,
    error_category: 'FILE_LEVEL',
  };
}

// ---------------------------------------------------------------------------
// Header validation
// ---------------------------------------------------------------------------
// Header fixed-length format:
//   offset 1,  len 1  : record_type  must be 'H'
//   offset 2,  len 10 : supplier_reference_number
//   offset 12, len 8  : month_end date (CCYYMMDD)
//   offset 20, len 2  : file_version
//   offset 22, len 8  : file_creation_date (CCYYMMDD)

export function validateFileHeader(
  headerLine: string,
  ctx: BatchContext,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const padded = headerLine.length < 29
    ? headerLine + ' '.repeat(29 - headerLine.length)
    : headerLine;

  const recordType         = padded.substring(0, 1).trim();
  const supplierRef        = padded.substring(1, 11).trim();
  const monthEnd           = padded.substring(11, 19).trim();
  const fileVersion        = padded.substring(19, 21).trim();
  const fileCreationDate   = padded.substring(21, 29).trim();

  if (recordType !== 'H') {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `Header record_type must be 'H', got '${recordType}'`,
      'record_type',
      recordType,
    ));
  }

  if (supplierRef !== ctx.institution_supplier_ref) {
    errors.push(fileError(
      ErrorCodes.SUPPLIER_REF_MISMATCH,
      `Supplier reference '${supplierRef}' in header does not match expected '${ctx.institution_supplier_ref}'`,
      'supplier_reference_number',
      supplierRef,
    ));
  }

  if (monthEnd !== ctx.reporting_month) {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `Month-end date '${monthEnd}' in header does not match reporting month '${ctx.reporting_month}'`,
      'month_end',
      monthEnd,
    ));
  }

  if (!fileVersion || fileVersion.length === 0) {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      'File version is missing from header',
      'file_version',
      fileVersion,
    ));
  }

  if (fileCreationDate) {
    const parsed = parseDate(fileCreationDate);
    if (!parsed) {
      errors.push(fileError(
        ErrorCodes.INVALID_DATE_FORMAT,
        `File creation date '${fileCreationDate}' is not a valid CCYYMMDD date`,
        'file_creation_date',
        fileCreationDate,
      ));
    }
  } else {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      'File creation date is missing from header',
      'file_creation_date',
      null,
    ));
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Trailer validation
// ---------------------------------------------------------------------------
// Trailer fixed-length format:
//   offset 1, len 1 : record_type must be 'T'
//   offset 2, len 7 : record_count (numeric, right-zero-padded)

export function validateFileTrailer(
  trailerLine: string,
  dataRecordCount: number,
  _ctx: BatchContext,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const padded = trailerLine.length < 8
    ? trailerLine + ' '.repeat(8 - trailerLine.length)
    : trailerLine;

  const recordType   = padded.substring(0, 1).trim();
  const countRaw     = padded.substring(1, 8).trim();

  if (recordType !== 'T') {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `Trailer record_type must be 'T', got '${recordType}'`,
      'record_type',
      recordType,
    ));
  }

  const trailerCount = parseInt(countRaw, 10);
  if (isNaN(trailerCount)) {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `Trailer record count '${countRaw}' is not numeric`,
      'record_count',
      countRaw,
    ));
  } else if (trailerCount !== dataRecordCount) {
    errors.push(fileError(
      ErrorCodes.HEADER_RECORD_COUNT_MISMATCH,
      `Trailer record count ${trailerCount} does not match actual data record count ${dataRecordCount}`,
      'record_count',
      countRaw,
    ));
  }

  return errors;
}

// ---------------------------------------------------------------------------
// File name validation
// ---------------------------------------------------------------------------
// Pattern: {SRN}_ALL_{L|T}702_M_{CCYYMMDD}_{seq}_{seq}.txt

const FILE_NAME_RE = /^([A-Z0-9]+)_ALL_([LT])702_M_(\d{8})_(\d+)_(\d+)\.txt$/;

export function validateFileName(
  fileName: string,
  ctx: BatchContext,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const match = FILE_NAME_RE.exec(fileName);
  if (!match) {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `File name '${fileName}' does not match required pattern {SRN}_ALL_{L|T}702_M_{CCYYMMDD}_{seq}_{seq}.txt`,
      'file_name',
      fileName,
    ));
    return errors;
  }

  const [, srn, fileTypeChar, dateStr] = match;

  if (srn !== ctx.institution_supplier_ref) {
    errors.push(fileError(
      ErrorCodes.SUPPLIER_REF_MISMATCH,
      `SRN '${srn}' in file name does not match expected '${ctx.institution_supplier_ref}'`,
      'file_name',
      fileName,
    ));
  }

  const expectedFileTypeChar = ctx.file_type === 'LIVE' ? 'L' : 'T';
  if (fileTypeChar !== expectedFileTypeChar) {
    errors.push(fileError(
      ErrorCodes.INVALID_FILE_NAMING,
      `File type character '${fileTypeChar}' in file name does not match context file_type '${ctx.file_type}' (expected '${expectedFileTypeChar}')`,
      'file_name',
      fileName,
    ));
  }

  const parsedDate = parseDate(dateStr);
  if (!parsedDate) {
    errors.push(fileError(
      ErrorCodes.INVALID_DATE_FORMAT,
      `Date '${dateStr}' in file name is not a valid CCYYMMDD date`,
      'file_name',
      fileName,
    ));
  }

  return errors;
}
