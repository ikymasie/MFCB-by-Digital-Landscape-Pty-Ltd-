import { Router, IRouter, Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { db } from '../db/client';
import { authLimiter } from '../middleware/rateLimiter';
import { auditLog } from '../middleware/auditLog';
import { issueApiClientToken } from '../services/auth.service';

const router: IRouter = Router();

// ============================================================
// POST /oauth/token — client_credentials grant
// ============================================================

router.post(
  '/token',
  authLimiter,
  auditLog('API_TOKEN_ISSUED', 'AUTH'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Support both JSON and form-urlencoded
      const body = req.body as Record<string, string>;
      const grant_type = body.grant_type;
      const client_id = body.client_id;
      const client_secret = body.client_secret;

      if (grant_type !== 'client_credentials') {
        res.status(400).json({
          error: 'UNSUPPORTED_GRANT_TYPE',
          message: 'Only client_credentials grant type is supported',
          correlationId: req.correlationId,
        });
        return;
      }

      if (!client_id || !client_secret) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'client_id and client_secret are required',
          correlationId: req.correlationId,
        });
        return;
      }

      const client = await db('api_clients')
        .where('client_id', client_id)
        .first();

      if (!client || client.status === 'REVOKED') {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid client credentials',
          correlationId: req.correlationId,
        });
        return;
      }

      if (client.expires_at && new Date(client.expires_at) < new Date()) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Client credentials have expired',
          correlationId: req.correlationId,
        });
        return;
      }

      // Verify secret
      let secretValid = false;
      try {
        secretValid = await argon2.verify(client.client_secret_hash, client_secret);
      } catch {
        secretValid = false;
      }

      if (!secretValid) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid client credentials',
          correlationId: req.correlationId,
        });
        return;
      }

      // Check allowed IP ranges if set
      if (client.allowed_ip_ranges && Array.isArray(client.allowed_ip_ranges) && client.allowed_ip_ranges.length > 0) {
        const clientIp = req.ip ?? '0.0.0.0';
        const allowed = isIpAllowed(clientIp, client.allowed_ip_ranges as string[]);
        if (!allowed) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Request IP not in allowed ranges',
            correlationId: req.correlationId,
          });
          return;
        }
      }

      // Load role permissions for API_CLIENT role
      const rolePermissions = await db('role_permissions')
        .join('roles', 'role_permissions.role_id', 'roles.role_id')
        .where('roles.role_name', 'API_CLIENT')
        .select('role_permissions.permission_key');

      const allRolePermissions = rolePermissions.map((rp: { permission_key: string }) => rp.permission_key);

      // Intersect with client scopes
      const scopes = Array.isArray(client.scopes) ? client.scopes as string[] : [];
      const permissions = allRolePermissions.filter((p: string) => scopes.includes(p));

      const access_token = issueApiClientToken({ ...client, permissions });

      // Update last_used_at
      await db('api_clients')
        .where('client_id', client_id)
        .update({ last_used_at: new Date() });

      res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: client.token_ttl_seconds,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Simple CIDR check — handles exact IP and basic x.x.x.x/y notation
function isIpAllowed(ip: string, ranges: string[]): boolean {
  for (const range of ranges) {
    if (!range.includes('/')) {
      if (ip === range) return true;
      continue;
    }
    const [network, prefixStr] = range.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (ipToNumber(ip) === undefined || ipToNumber(network) === undefined) continue;
    const ipNum = ipToNumber(ip)!;
    const netNum = ipToNumber(network)!;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    if ((ipNum & mask) === (netNum & mask)) return true;
  }
  return false;
}

function ipToNumber(ip: string): number | undefined {
  const parts = ip.split('.');
  if (parts.length !== 4) return undefined;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return undefined;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

export default router;
