import { randomUUID } from 'crypto';
import { db } from '../db/client';

interface Institution {
  institution_id: string;
  name: string;
  supplier_reference_number: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  integration_channel: 'REST_API' | 'PORTAL_UPLOAD' | 'SFTP';
  enabled_products: string[];
  allowed_ip_ranges: Record<string, unknown> | null;
  mtls_cert_fingerprint: string | null;
  onboarded_at: Date | null;
  onboarded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InstitutionCreateInput {
  name: string;
  supplier_reference_number: string;
  integration_channel: 'REST_API' | 'PORTAL_UPLOAD' | 'SFTP';
  enabled_products: string[];
  allowed_ip_ranges?: string[];
}

export interface InstitutionUpdateInput {
  name?: string;
  integration_channel?: 'REST_API' | 'PORTAL_UPLOAD' | 'SFTP';
  enabled_products?: string[];
  allowed_ip_ranges?: string[];
  mtls_cert_fingerprint?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export async function listInstitutions(
  filters: { status?: string; search?: string; institutionId?: string | null },
  pagination: PaginationParams
): Promise<{ data: Institution[]; total: number; page: number; limit: number }> {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  let query = db('institutions').select('*');
  let countQuery = db('institutions').count('institution_id as count');

  if (filters.institutionId) {
    query = query.where('institution_id', filters.institutionId);
    countQuery = countQuery.where('institution_id', filters.institutionId);
  }

  if (filters.status) {
    query = query.where('status', filters.status);
    countQuery = countQuery.where('status', filters.status);
  }

  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.where((builder: any) =>
      builder
        .whereILike('name', searchTerm)
        .orWhereILike('supplier_reference_number', searchTerm)
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countQuery = countQuery.where((builder: any) =>
      builder
        .whereILike('name', searchTerm)
        .orWhereILike('supplier_reference_number', searchTerm)
    );
  }

  const [data, countResult] = await Promise.all([
    query.orderBy('created_at', 'desc').limit(limit).offset(offset),
    countQuery.first(),
  ]);

  const total = parseInt(String((countResult as { count: string })?.count ?? '0'), 10);

  return { data, total, page, limit };
}

export async function getInstitutionById(institutionId: string): Promise<Institution | null> {
  const institution = await db('institutions').where('institution_id', institutionId).first();
  return institution ?? null;
}

export async function createInstitution(
  input: InstitutionCreateInput
): Promise<Institution> {
  const institutionId = randomUUID();
  const now = new Date();

  const [institution] = await db('institutions')
    .insert({
      institution_id: institutionId,
      name: input.name,
      supplier_reference_number: input.supplier_reference_number,
      integration_channel: input.integration_channel,
      enabled_products: input.enabled_products,
      allowed_ip_ranges: input.allowed_ip_ranges ?? null,
      status: 'PENDING',
      created_at: now,
      updated_at: now,
    })
    .returning('*');

  return institution;
}

export async function updateInstitution(
  institutionId: string,
  input: InstitutionUpdateInput
): Promise<Institution | null> {
  const updateData: Record<string, unknown> = { updated_at: new Date() };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.integration_channel !== undefined) updateData.integration_channel = input.integration_channel;
  if (input.enabled_products !== undefined) updateData.enabled_products = input.enabled_products;
  if (input.allowed_ip_ranges !== undefined) updateData.allowed_ip_ranges = input.allowed_ip_ranges;
  if (input.mtls_cert_fingerprint !== undefined) updateData.mtls_cert_fingerprint = input.mtls_cert_fingerprint;

  const [updated] = await db('institutions')
    .where('institution_id', institutionId)
    .update(updateData)
    .returning('*');

  return updated ?? null;
}

export async function activateInstitution(
  institutionId: string,
  onboardedBy: string
): Promise<Institution | null> {
  const [updated] = await db('institutions')
    .where('institution_id', institutionId)
    .update({
      status: 'ACTIVE',
      onboarded_at: new Date(),
      onboarded_by: onboardedBy,
      updated_at: new Date(),
    })
    .returning('*');

  return updated ?? null;
}

export async function suspendInstitution(institutionId: string): Promise<Institution | null> {
  const [updated] = await db('institutions')
    .where('institution_id', institutionId)
    .update({ status: 'SUSPENDED', updated_at: new Date() })
    .returning('*');

  return updated ?? null;
}
