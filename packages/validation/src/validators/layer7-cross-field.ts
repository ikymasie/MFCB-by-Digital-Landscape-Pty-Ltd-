import { FormGRecord, ValidationError, BatchContext } from '../types';
import { ErrorCodes } from '../error-codes';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function crossErr(
  rowNumber: number,
  field: string | null,
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
    error_category: 'CROSS_FIELD',
  };
}

function dupErr(
  rowNumber: number,
  field: string,
  code: string,
  message: string,
  raw_value: string,
): ValidationError {
  return {
    row_number: rowNumber,
    field,
    code,
    severity: 'REJECT',
    raw_value,
    message,
    error_category: 'DUPLICATE',
  };
}

function isZeroOrEmpty(val: string): boolean {
  const t = val.trim();
  return t === '' || /^0+$/.test(t);
}

// ---------------------------------------------------------------------------
// Account types that require a loan_term
// ---------------------------------------------------------------------------
const LOAN_TERM_REQUIRED_TYPES = new Set(['D','H','I','N','P','T','Y']);

// ---------------------------------------------------------------------------
// Layer 7 — cross-field dependency rules and duplicate detection
// ---------------------------------------------------------------------------

export function validateLayer7(
  record: FormGRecord,
  rowNumber: number,
  ctx: BatchContext,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const accountType       = record.account_type.trim();
  const loanTerm          = record.loan_term.trim();
  const statusCode        = record.status_code.trim();
  const thirdPartyName    = record.third_party_name.trim();
  const soldToThirdParty  = record.account_sold_to_third_party.trim();
  const ownershipType     = record.account_ownership_type.trim();
  const noOfParticipants  = record.no_of_participants.trim();
  const accountNumber     = record.account_number.trim();
  const subAccountNumber  = record.sub_account_number.trim();
  const branchCode        = record.branch_code.trim();

  // ---- Loan term required ----

  if (accountType !== '' && LOAN_TERM_REQUIRED_TYPES.has(accountType)) {
    if (isZeroOrEmpty(loanTerm) || loanTerm === '0000' || loanTerm === '000') {
      errors.push(crossErr(
        rowNumber, 'loan_term', ErrorCodes.LOAN_TERM_REQUIRED,
        `loan_term is required for account_type '${accountType}'`,
        loanTerm || null,
      ));
    }
  }

  // ---- Third party (status A = Debt Assigned) ----
  // Note: status 'A' is not in the VALID_STATUS_CODES set defined in layer3, but the
  // cross-field check is defined for it regardless — we check it here so it fires
  // if a future status 'A' is ever accepted, or for records that pass layer3.

  if (statusCode === 'A') {
    if (thirdPartyName === '') {
      errors.push(crossErr(
        rowNumber, 'third_party_name', ErrorCodes.THIRD_PARTY_NAME_REQUIRED,
        `third_party_name is required when status_code is 'A' (Debt Assigned)`,
        null,
      ));
    }

    if (soldToThirdParty !== '01') {
      errors.push(crossErr(
        rowNumber, 'account_sold_to_third_party', ErrorCodes.THIRD_PARTY_ACCOUNT_REQUIRED,
        `account_sold_to_third_party must be '01' when status_code is 'A' (Debt Assigned), got '${soldToThirdParty}'`,
        soldToThirdParty || null,
      ));
    }
  }

  // ---- Joint loan participants ----
  // account_ownership_type '02' = Joint

  if (ownershipType === '02') {
    const participantsInt = noOfParticipants === '' ? 0 : parseInt(noOfParticipants, 10);
    if (isZeroOrEmpty(noOfParticipants) || isNaN(participantsInt) || participantsInt === 0) {
      errors.push(crossErr(
        rowNumber, 'no_of_participants', ErrorCodes.JOINT_PARTICIPANTS_REQUIRED,
        `no_of_participants must be present and greater than zero for joint account (account_ownership_type '02')`,
        noOfParticipants || null,
      ));
    }
  }

  // ---- Duplicate account key detection ----

  const key = `${ctx.institution_supplier_ref}:${accountNumber}:${subAccountNumber}:${branchCode}`;

  if (ctx.account_keys_seen.has(key)) {
    errors.push(dupErr(
      rowNumber, 'account_number', ErrorCodes.DUPLICATE_ACCOUNT_KEY,
      `Duplicate account key detected: supplier='${ctx.institution_supplier_ref}', account='${accountNumber}', sub='${subAccountNumber}', branch='${branchCode}'`,
      key,
    ));
  } else {
    ctx.account_keys_seen.add(key);
  }

  return errors;
}
