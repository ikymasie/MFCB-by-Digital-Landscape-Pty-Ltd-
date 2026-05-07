import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { config } from './config';
import { getDb } from './db';
import { sendMail } from './email.service';
import { buildDlqAlertEmail } from './email.templates';

export const fnDlqAlert = onMessagePublished(
  {
    topic: config.pubsub.dlqTopic,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const db = getDb();
    
    // The DLQ message usually contains the original payload + some error context
    // from the failed Cloud Run service or Cloud Function.
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
    } catch (e) {
      payload = { raw: Buffer.from(event.data.message.data, 'base64').toString() };
    }

    const batchId = payload.batch_id ?? 'UNKNOWN';
    const chunkId = payload.chunk_index !== undefined ? `CHUNK-${payload.chunk_index}` : 'UNKNOWN';
    const institutionId = payload.institution_id;
    const lastError = event.data.message.attributes?.['x-error-message'] ?? 'Exhausted all retry attempts';

    let institutionName = 'Unknown Institution';
    let srn = 'N/A';

    if (institutionId) {
      const inst = await db('institutions').where('institution_id', institutionId).first();
      if (inst) {
        institutionName = inst.name;
        srn = inst.supplier_reference_number;
      }
    }

    const { subject, html } = buildDlqAlertEmail({
      batchId,
      chunkId,
      institutionName,
      srn,
      dlqTopicName: config.pubsub.dlqTopic,
      failedAt: new Date(),
      lastError,
    });

    await sendMail({
      to: config.email.opsEmail,
      subject,
      html,
    });

    console.warn(`[DLQ ALERT] Sent critical alert for Batch: ${batchId}, Chunk: ${chunkId}, Error: ${lastError}`);
  }
);
