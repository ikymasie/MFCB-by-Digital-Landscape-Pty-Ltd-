import { FormGRecord } from '../types';

/**
 * Fixed-length field layout for Form G monthly data record.
 * Total minimum record length: 779 chars.
 * Offsets are 1-based; extraction uses substring(offset-1, offset-1+len).
 */
const FIELD_LAYOUT: Array<{ field: keyof FormGRecord | '_income'; offset: number; len: number }> = [
  { field: 'record_type',                       offset: 1,   len: 1  },
  { field: 'omang_id_number',                   offset: 2,   len: 13 },
  { field: 'passport_number',                   offset: 15,  len: 16 },
  { field: 'gender',                            offset: 31,  len: 1  },
  { field: 'date_of_birth',                     offset: 32,  len: 8  },
  { field: 'branch_code',                       offset: 40,  len: 8  },
  { field: 'account_number',                    offset: 48,  len: 25 },
  { field: 'sub_account_number',                offset: 73,  len: 4  },
  { field: 'surname',                           offset: 77,  len: 25 },
  { field: 'title',                             offset: 102, len: 5  },
  { field: 'forename_1',                        offset: 107, len: 14 },
  { field: 'forename_2',                        offset: 121, len: 14 },
  { field: 'forename_3',                        offset: 135, len: 14 },
  { field: 'residential_address_line_1',        offset: 149, len: 25 },
  { field: 'residential_address_line_2',        offset: 174, len: 25 },
  { field: 'residential_address_line_3',        offset: 199, len: 25 },
  { field: 'residential_address_line_4',        offset: 224, len: 25 },
  { field: 'residential_postal_code',           offset: 249, len: 6  },
  { field: 'owner_tenant',                      offset: 255, len: 1  },
  { field: 'postal_address_line_1',             offset: 256, len: 25 },
  { field: 'postal_address_line_2',             offset: 281, len: 25 },
  { field: 'postal_address_line_3',             offset: 306, len: 25 },
  { field: 'postal_address_line_4',             offset: 331, len: 25 },
  { field: 'postal_post_code',                  offset: 356, len: 6  },
  { field: 'account_ownership_type',            offset: 362, len: 2  },
  { field: 'loan_reason_code',                  offset: 364, len: 2  },
  { field: 'payment_type',                      offset: 366, len: 2  },
  { field: 'account_type',                      offset: 368, len: 2  },
  { field: 'date_account_opened',               offset: 370, len: 8  },
  { field: 'deferred_payment_start_date',       offset: 378, len: 8  },
  { field: 'last_payment_date',                 offset: 386, len: 8  },
  { field: 'opening_balance_or_credit_limit',   offset: 394, len: 9  },
  { field: 'current_balance',                   offset: 403, len: 9  },
  { field: 'current_balance_indicator',         offset: 412, len: 1  },
  { field: 'instalment_amount',                 offset: 413, len: 9  },
  { field: 'months_in_arrears',                 offset: 422, len: 2  },
  { field: 'amount_overdue',                    offset: 424, len: 8  },
  { field: 'status_code',                       offset: 432, len: 2  },
  { field: 'repayment_frequency',               offset: 434, len: 2  },
  { field: 'loan_term',                         offset: 436, len: 4  },
  { field: 'status_date',                       offset: 440, len: 8  },
  { field: 'old_supplier_branch_code',          offset: 448, len: 8  },
  { field: 'old_account_number',                offset: 456, len: 25 },
  { field: 'old_sub_account_number',            offset: 481, len: 4  },
  { field: 'old_supplier_reference_no',         offset: 485, len: 10 },
  { field: 'telephone_h',                       offset: 495, len: 10 },
  { field: 'cellular_telephone',                offset: 505, len: 10 },
  { field: 'telephone_w',                       offset: 515, len: 10 },
  { field: 'income_frequency',                  offset: 525, len: 1  },
  { field: 'third_party_name',                  offset: 526, len: 60 },
  { field: 'account_sold_to_third_party',       offset: 586, len: 2  },
  { field: 'no_of_participants',                offset: 588, len: 3  },
  { field: 'employer_name',                     offset: 591, len: 60 },
  { field: 'occupation',                        offset: 651, len: 20 },
  { field: '_income',                           offset: 671, len: 9  }, // intentionally not exposed
  { field: 'email_address',                     offset: 680, len: 100 },
];

const MIN_RECORD_LENGTH = 779;

/**
 * Parse a fixed-length Form G data record line into a FormGRecord.
 * If the line is shorter than 779 chars it is padded with spaces before parsing.
 * The income field (offset 671, len 9) is read but intentionally excluded from output.
 */
export function parseRecord(line: string, rowNumber: number): FormGRecord {
  // Pad to minimum length if necessary
  const paddedLine = line.length < MIN_RECORD_LENGTH
    ? line + ' '.repeat(MIN_RECORD_LENGTH - line.length)
    : line;

  // Suppress unused rowNumber warning — it is available for callers to use in error context
  void rowNumber;

  const record: Partial<FormGRecord> = {};

  for (const { field, offset, len } of FIELD_LAYOUT) {
    const raw = paddedLine.substring(offset - 1, offset - 1 + len);
    const trimmed = raw.trim();

    if (field === '_income') {
      // income is intentionally excluded from the returned FormGRecord (regulatory requirement)
      continue;
    }

    (record as Record<string, string>)[field as string] = trimmed;
  }

  return record as FormGRecord;
}
