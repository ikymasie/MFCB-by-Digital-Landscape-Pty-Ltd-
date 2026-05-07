import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as crypto from 'crypto';
import { config } from './config';
import { getDb } from './db';
import { publishMessage } from './pubsub';
import type { BatchCompleteMessage, WebhookOutboundMessage } from './types';
import { sendMail } from './email.service';
import {
  buildBatchCompletedEmail,
  buildBatchValidationFailedEmail,
  buildBatchFailedEmail,
} from './email.templates';

export const fnNotifyCompletion = onMessagePublished(
  {
    topic: config.pubsub.batchCompleteTopic,
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 5,
  },
  async (event) => {
    const message: BatchCompleteMessage = JSON.parse(
      Buffer.from(event.data.message.data, 'base64').toString(),
    );

    const { batch_id, institution_id, status, accepted_count, rejected_count, warning_count } =
      message;
    const db = getDb();

    // 1. Write final audit log
    await db('audit_logs').insert({
      audit_id: crypto.randomUUID(),
      actor_id: institution_id, // system action
      actor_type: 'SYSTEM',
      institution_id,
      action: status === 'COMPLETED' ? 'BATCH_COMPLETED' : 'BATCH_FAILED',
      object_type: 'batch',
      object_id: batch_id,
      correlation_id: batch_id,
      ip_address: '0.0.0.0',
      result: status === 'COMPLETED' ? 'SUCCESS' : 'FAILURE',
      event_category: 'DATA',
      detail: { accepted_count, rejected_count, warning_count },
      timestamp: new Date(),
    });

    // 2. Check if institution has webhook configured
    const webhookConfig = await db('webhook_configs')
      .where({ institution_id, status: 'ACTIVE' })
      .first();

    if (!webhookConfig) return;

    // 3. Determine event type
    const eventType: WebhookOutboundMessage['event_type'] =
      status === 'COMPLETED'
        ? rejected_count > 0
          ? 'batch.validation_failed'
          : 'batch.completed'
        : 'batch.rejected';

    // 4. Check if institution subscribed to this event
    if (
      !Array.isArray(webhookConfig.events) ||
      !(webhookConfig.events as string[]).includes(eventType)
    ) {
      return;
    }

    // 5. Publish to webhook outbound topic
    const webhookMsg: WebhookOutboundMessage = {
      institution_id,
      event_type: eventType,
      payload: {
        batch_id,
        status,
        accepted_count,
        rejected_count,
        warning_count,
        event_time: new Date().toISOString(),
      },
      retry_count: 0,
    };
    await publishMessage(config.pubsub.webhookOutboundTopic, webhookMsg);

    // 6. Send Email Notifications
    try {
      const batch = await db('batches').where('batch_id', batch_id).first();
      const admins = await db('users')
        .join('roles', 'users.role_id', 'roles.role_id')
        .where('users.institution_id', institution_id)
        .where('roles.role_name', 'INSTITUTION_ADMIN')
        .where('users.status', 'ACTIVE')
        .select('users.email', 'users.full_name');

      if (admins.length > 0) {
        for (const admin of admins) {
          let emailData: { subject: string; html: string };

          if (status === 'COMPLETED') {
            if (rejected_count > 0) {
              emailData = buildBatchValidationFailedEmail({
                recipientName: admin.full_name,
                batchId: batch_id,
                reportingMonth: batch?.reporting_month ?? 'N/A',
                totalRecords: (batch?.accepted_count ?? 0) + (batch?.rejected_count ?? 0),
                acceptedCount: accepted_count,
                rejectedCount: rejected_count,
                warningCount: warning_count,
              });
            } else {
              emailData = buildBatchCompletedEmail({
                recipientName: admin.full_name,
                batchId: batch_id,
                reportingMonth: batch?.reporting_month ?? 'N/A',
                totalRecords: accepted_count,
                acceptedCount: accepted_count,
                warningCount: warning_count,
                submittedAt: batch?.created_at ?? new Date(),
                completedAt: new Date(),
              });
            }
          } else {
            emailData = buildBatchFailedEmail({
              recipientName: admin.full_name,
              batchId: batch_id,
              reportingMonth: batch?.reporting_month ?? 'N/A',
              submittedAt: batch?.created_at ?? new Date(),
              failureReason: 'The batch could not be processed due to a system error or invalid file format.',
            });
          }

          await sendMail({
            to: admin.email,
            subject: emailData.subject,
            html: emailData.html,
          });
        }
      }
    } catch (err) {
      console.error('[EMAIL] Failed to send batch completion notifications:', err);
    }
  },
);
