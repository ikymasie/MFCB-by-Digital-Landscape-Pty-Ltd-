import type { Knex } from 'knex';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

interface Rule {
  account_type: string;
  status_code: string;
  is_allowed_monthly: boolean;
  is_allowed_daily: boolean;
  updated_by: string;
}

function buildRules(
  account_types: string[],
  status_codes: string[],
): Rule[] {
  const rules: Rule[] = [];
  for (const account_type of account_types) {
    for (const status_code of status_codes) {
      rules.push({
        account_type,
        status_code,
        is_allowed_monthly: true,
        is_allowed_daily: false,
        updated_by: SYSTEM_USER_ID,
      });
    }
  }
  return rules;
}

export async function seed(knex: Knex): Promise<void> {
  // All standard status codes
  const allStatuses = ['B', 'C', 'D', 'E', 'I', 'J', 'L', 'P', 'T', 'U', 'V', 'W', 'Y', 'Z'];
  // Status codes without E (Early Settlement)
  const statusesNoE = ['B', 'C', 'D', 'I', 'J', 'L', 'P', 'T', 'U', 'V', 'W', 'Y', 'Z'];
  // Status codes without E and V (Voluntarily Surrendered)
  const statusesNoEV = ['B', 'C', 'D', 'I', 'J', 'L', 'P', 'T', 'U', 'W', 'Y', 'Z'];

  // Loan account types: allow all statuses
  const loanTypes = ['D', 'H', 'I', 'N', 'P', 'T', 'Y'];
  // Revolving credit types: allow all statuses
  const revolvingCreditTypes = ['C', 'R', 'S'];
  // Overdraft/revolving types: no E
  const overdraftTypes = ['F', 'O', 'X'];
  // Other types: no E, no V
  const otherTypes = ['B', 'G', 'M', 'U', 'V', 'W', 'Z'];

  const allRules: Rule[] = [
    ...buildRules(loanTypes, allStatuses),
    ...buildRules(revolvingCreditTypes, allStatuses),
    ...buildRules(overdraftTypes, statusesNoE),
    ...buildRules(otherTypes, statusesNoEV),
  ];

  await knex('status_account_type_rules')
    .insert(allRules)
    .onConflict(['account_type', 'status_code'])
    .ignore();
}
