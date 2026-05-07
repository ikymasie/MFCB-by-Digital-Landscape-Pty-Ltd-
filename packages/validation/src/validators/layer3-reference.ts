import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';

// ---------------------------------------------------------------------------
// Reference tables (hardcoded — no DB access in this package)
// ---------------------------------------------------------------------------

const VALID_ACCOUNT_TYPES = new Set([
  'B','C','D','E','F','G','H','I','M','N','O','P','R','S','T','U','V','W','X','Y','Z',
]);

const VALID_STATUS_CODES = new Set([
  'B','C','D','E','I','J','L','P','T','U','V','W','Y','Z',
]);

const VALID_OWNERSHIP_TYPES = new Set(['00','01','02','03','04','05']);

const VALID_REPAYMENT_FREQUENCIES = new Set(['00','01','02','03','04','05','06']);

const VALID_PAYMENT_TYPES = new Set([
  '00','01','02','03','04','05','06','07','08','09','10',
]);

const VALID_LOAN_REASONS = new Set(['A','B','C','D','F','H','J','O','R','S']);

const VALID_TITLES = new Set([
  'ADV','CAPT','COL','DR','DS','JUDGE','KAPT','KOL','LADY','LORD','LT',
  'MAJ','ME','MEJ','MEV','MISS','MNR','MR','MRS','MS','PAST','PROF',
  'REV','SERS','SGT','SIR',
]);

const VALID_INCOME_FREQUENCIES = new Set(['M','W','F','Q','A']);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function refErr(
  rowNumber: number,
  field: string,
  code: string,
  message: string,
  raw_value: string | null,
): ValidationError {
  return {
    row_number: rowNumber,
    field,
    code,
    severity: 'REJECT',
    raw_value,
    message,
    error_category: 'REFERENCE',
  };
}

// ---------------------------------------------------------------------------
// Layer 3 — reference table lookups
// ---------------------------------------------------------------------------

export function validateLayer3(record: FormGRecord, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // account_type
  const accountType = record.account_type.trim();
  if (accountType !== '' && !VALID_ACCOUNT_TYPES.has(accountType)) {
    errors.push(refErr(
      rowNumber, 'account_type', ErrorCodes.INVALID_ACCOUNT_TYPE,
      `account_type '${accountType}' is not a recognised account type code`,
      accountType,
    ));
  }

  // status_code
  const statusCode = record.status_code.trim();
  if (statusCode !== '' && !VALID_STATUS_CODES.has(statusCode)) {
    errors.push(refErr(
      rowNumber, 'status_code', ErrorCodes.INVALID_REFERENCE_CODE,
      `status_code '${statusCode}' is not a recognised status code`,
      statusCode,
    ));
  }

  // account_ownership_type
  const ownershipType = record.account_ownership_type.trim();
  if (ownershipType !== '' && !VALID_OWNERSHIP_TYPES.has(ownershipType)) {
    errors.push(refErr(
      rowNumber, 'account_ownership_type', ErrorCodes.INVALID_OWNERSHIP_TYPE,
      `account_ownership_type '${ownershipType}' is not a recognised ownership type code`,
      ownershipType,
    ));
  }

  // repayment_frequency
  const repayFreq = record.repayment_frequency.trim();
  if (repayFreq !== '' && !VALID_REPAYMENT_FREQUENCIES.has(repayFreq)) {
    errors.push(refErr(
      rowNumber, 'repayment_frequency', ErrorCodes.INVALID_REPAYMENT_FREQUENCY,
      `repayment_frequency '${repayFreq}' is not a recognised repayment frequency code`,
      repayFreq,
    ));
  }

  // payment_type
  const paymentType = record.payment_type.trim();
  if (paymentType !== '' && !VALID_PAYMENT_TYPES.has(paymentType)) {
    errors.push(refErr(
      rowNumber, 'payment_type', ErrorCodes.INVALID_PAYMENT_TYPE,
      `payment_type '${paymentType}' is not a recognised payment type code`,
      paymentType,
    ));
  }

  // loan_reason_code
  const loanReason = record.loan_reason_code.trim();
  if (loanReason !== '' && !VALID_LOAN_REASONS.has(loanReason)) {
    errors.push(refErr(
      rowNumber, 'loan_reason_code', ErrorCodes.INVALID_REFERENCE_CODE,
      `loan_reason_code '${loanReason}' is not a recognised loan reason code`,
      loanReason,
    ));
  }

  // title (optional)
  const title = record.title.trim();
  if (title !== '' && !VALID_TITLES.has(title)) {
    errors.push(refErr(
      rowNumber, 'title', ErrorCodes.INVALID_REFERENCE_CODE,
      `title '${title}' is not a recognised title code`,
      title,
    ));
  }

  // income_frequency (optional)
  const incomeFreq = record.income_frequency.trim();
  if (incomeFreq !== '' && !VALID_INCOME_FREQUENCIES.has(incomeFreq)) {
    errors.push(refErr(
      rowNumber, 'income_frequency', ErrorCodes.INVALID_REFERENCE_CODE,
      `income_frequency '${incomeFreq}' is not a recognised income frequency code`,
      incomeFreq,
    ));
  }

  return errors;
}
