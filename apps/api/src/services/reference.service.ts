import { db } from '../db/client';

interface ReferenceCode {
  code_type: string;
  code: string;
  description: string;
  definition: string | null;
  effective_date: string;
  deprecated_at: string | null;
  display_order: number | null;
  created_by: string;
  approved_by: string | null;
  created_at: Date;
}

// Simple in-memory cache with 5-minute TTL
interface CacheEntry {
  data: ReferenceCode[];
  expiresAt: number;
}

const referenceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getReferenceCodesByType(codeType: string): Promise<ReferenceCode[]> {
  const cached = referenceCache.get(codeType);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const today = new Date().toISOString().split('T')[0];

  const data = await db('reference_codes')
    .where('code_type', codeType)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where((builder: any) =>
      builder.whereNull('deprecated_at').orWhere('deprecated_at', '>', today)
    )
    .orderBy([
      { column: 'display_order', order: 'asc', nulls: 'last' },
      { column: 'code', order: 'asc' },
    ]);

  referenceCache.set(codeType, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function invalidateReferenceCache(codeType: string): void {
  referenceCache.delete(codeType);
}

export async function createReferenceCode(
  codeType: string,
  input: {
    code: string;
    description: string;
    definition?: string;
    effective_date: string;
    display_order?: number;
  },
  createdBy: string
): Promise<ReferenceCode> {
  const [created] = await db('reference_codes')
    .insert({
      code_type: codeType,
      code: input.code,
      description: input.description,
      definition: input.definition ?? null,
      effective_date: input.effective_date,
      deprecated_at: null,
      display_order: input.display_order ?? null,
      created_by: createdBy,
      approved_by: null,
      created_at: new Date(),
    })
    .returning('*');

  // Invalidate cache for this type
  invalidateReferenceCache(codeType);

  return created;
}

export async function approveReferenceCode(
  codeType: string,
  code: string,
  approvedBy: string
): Promise<ReferenceCode | null> {
  const [updated] = await db('reference_codes')
    .where({ code_type: codeType, code })
    .update({ approved_by: approvedBy })
    .returning('*');

  if (updated) {
    invalidateReferenceCache(codeType);
  }

  return updated ?? null;
}
