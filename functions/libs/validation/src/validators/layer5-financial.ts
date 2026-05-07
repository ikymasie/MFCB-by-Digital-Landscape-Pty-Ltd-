import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';
import { parseDate, monthsBetween } from './layer4-domain';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function finErr(
  rowNumber: number,
  field: string,
  code: string,
  message: string,
  raw_value: string | null,
  severity: ValidationError['severity'] = 'REJECT',
): ValidationError {
  return {
    row_number: rowNumber,
    field,
    code,
    severity,
    raw_value,
    message,
    error_category: 'FINANCIAL',
  };
}

function isZeroOrEmpty(val: string): boolean {
  const t = val.trim();
  return t === '' || /^0+$/.test(t);
}

function safeInt(val: string): number {
  const t = val.trim();
  if (t === '') return 0;
  const n = parseInt(t, 10);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Account type sets
// ---------------------------------------------------------------------------

/** Account types that REQUIRE a non-zero opening balance / credit limit */
const REQUIRES_NONZERO_OPENING_BALANCE = new Set(['B','D','H','I','M','N','P','T','Y']);

/** Account types that MUST have a zero opening balance */
const REQUIRES_ZERO_OPENING_BALANCE = new Set(['F','O','S','U','W','X']);

/** Status codes that must have zero instalment */
const ZERO_INSTALMENT_STATUSES = new Set(['C','P','V','T']);

/** Status codes that must have zero amount overdue */
const ZERO_OVERDUE_STATUSES = new Set(['C','P','T','V']);

// ---------------------------------------------------------------------------
// Layer 5 — financial logic rules
// ---------------------------------------------------------------------------

export function validateLayer5(
  record: FormGRecord,
  rowNumber: number,
  reportingMonthDate: Date,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const accountType  = record.account_type.trim();
  const statusCode   = record.status_code.trim();
  const openBal      = record.opening_balance_or_credit_limit.trim();
  const curBal       = record.current_balance.trim();
  const instalment   = record.instalment_amount.trim();
  const mia          = record.months_in_arrears.trim();
  const amtOverdue   = record.amount_overdue.trim();
  const cbi          = record.current_balance_indicator.trim();

  // ---- Opening balance / credit limit ----

  if (accountType !== '' && REQUIRES_NONZERO_OPENING_BALANCE.has(accountType)) {
    if (isZeroOrEmpty(openBal)) {
      errors.push(finErr(
        rowNumber, 'opening_balance_or_credit_limit', ErrorCodes.OPENING_BALANCE_REQUIRED,
        `Account type '${accountType}' requires a non-zero opening_balance_or_credit_limit`,
        openBal,
      ));
    }
  }

  if (accountType !== '' && REQUIRES_ZERO_OPENING_BALANCE.has(accountType)) {
    if (safeInt(openBal) > 0) {
      errors.push(finErr(
        rowNumber, 'opening_balance_or_credit_limit', ErrorCodes.OPENING_BALANCE_MUST_BE_ZERO,
        `Account type '${accountType}' must have a zero opening_balance_or_credit_limit`,
        openBal,
      ));
    }
  }

  // ---- Instalment amount ----

  if (safeInt(curBal) > 0 && isZeroOrEmpty(instalment)) {
    errors.push(finErr(
      rowNumber, 'instalment_amount', ErrorCodes.INSTALMENT_REQUIRED,
      `instalment_amount is required when current_balance is greater than zero`,
      instalment,
    ));
  }

  if (statusCode !== '' && ZERO_INSTALMENT_STATUSES.has(statusCode) && safeInt(instalment) > 0) {
    errors.push(finErr(
      rowNumber, 'instalment_amount', ErrorCodes.INSTALMENT_MUST_BE_ZERO,
      `instalment_amount must be zero for status_code '${statusCode}'`,
      instalment,
    ));
  }

  // ---- Amount overdue ----

  if (safeInt(mia) > 0 && isZeroOrEmpty(amtOverdue)) {
    errors.push(finErr(
      rowNumber, 'amount_overdue', ErrorCodes.AMOUNT_OVERDUE_REQUIRED,
      `amount_overdue is required when months_in_arrears is greater than zero`,
      amtOverdue,
    ));
  }

  if (statusCode !== '' && ZERO_OVERDUE_STATUSES.has(statusCode) && safeInt(amtOverdue) > 0) {
    errors.push(finErr(
      rowNumber, 'amount_overdue', ErrorCodes.AMOUNT_OVERDUE_MUST_BE_ZERO,
      `amount_overdue must be zero for status_code '${statusCode}'`,
      amtOverdue,
    ));
  }

  // ---- Months in arrears vs account age ----

  const miaInt = safeInt(mia);
  if (miaInt > 0) {
    const openedStr = record.date_account_opened.trim();
    // Derive reporting month as CCYYMMDD string for monthsBetween
    const rm = reportingMonthDate;
    const reportingMonthStr = `${rm.getFullYear()}${String(rm.getMonth() + 1).padStart(2, '0')}${String(rm.getDate()).padStart(2, '0')}`;

    const accountAgeMonths = monthsBetween(openedStr, reportingMonthStr);
    const openedDate = parseDate(openedStr);

    if (openedDate && miaInt > accountAgeMonths) {
      errors.push(finErr(
        rowNumber, 'months_in_arrears', ErrorCodes.MONTHS_ARREARS_EXCEEDS_OPEN_DURATION,
        `months_in_arrears (${miaInt}) exceeds account age in months (${accountAgeMonths}) since date_account_opened '${openedStr}'`,
        mia,
      ));
    }
  }

  // ---- Current balance indicator ----

  if (cbi !== '' && cbi !== 'D' && cbi !== 'C') {
    errors.push(finErr(
      rowNumber, 'current_balance_indicator', ErrorCodes.INVALID_CURRENT_BALANCE_INDICATOR,
      `current_balance_indicator must be 'D' or 'C', got '${cbi}'`,
      cbi,
    ));
  }

  return errors;
}
