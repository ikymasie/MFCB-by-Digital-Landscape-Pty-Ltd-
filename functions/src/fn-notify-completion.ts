import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as crypto from 'crypto';
import { config } from './config';
import { getDb } from './db';
import { publishMessage } from './pubsub';
import type { BatchCompleteMessage, WebhookOutboundMessage } from './types';

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
  },
);
