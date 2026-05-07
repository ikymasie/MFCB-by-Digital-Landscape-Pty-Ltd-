import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import type { Knex } from 'knex';
import { config } from './config';
import { getDb } from './db';
import { publishMessage } from './pubsub';
import type { MasterRecordsMessage, BatchCompleteMessage } from './types';

export const fnAggregateBatch = onDocumentUpdated(
  {
    document: 'batches/{batchId}',
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 10,
  },
  async (event) => {
    const batchId = event.params.batchId;
    const after = event.data?.after?.data();
    if (!after) return;

    const { total_chunks, completed_chunks, accepted_count, rejected_count, warning_count } = after;

    // Only proceed when all chunks are done
    if (completed_chunks < total_chunks) return;

    const db = getDb();

    // Update postgres batch with final counts
    await db('batch_uploads').where('batch_id', batchId).update({
      accepted_count,
      rejected_count,
      warning_count,
      stage: 'MASTERING',
    });

    // If there are accepted records, publish mastering messages in chunks
    if (accepted_count > 0) {
      // Get accepted raw_record_ids from postgres (those with no REJECT errors)
      const acceptedRecords = await db('raw_submission_records as rsr')
        .leftJoin('validation_errors as ve', function (this: Knex.JoinClause) {
          this.on('ve.raw_record_id', '=', 'rsr.raw_record_id').andOn(
            've.severity',
            '=',
            db.raw("'REJECT'"),
          );
        })
        .where('rsr.batch_id', batchId)
        .whereNull('ve.error_id') // no REJECT errors = accepted
        .select('rsr.raw_record_id');

      const acceptedIds: string[] = acceptedRecords.map(
        (r: { raw_record_id: string }) => r.raw_record_id,
      );

      // Get institution_id from batch
      const batch = await db('batch_uploads').where('batch_id', batchId).first();

      // Chunk into mastering messages
      const masteringChunkSize = config.masteringChunkSize;
      const totalMasteringChunks = Math.ceil(acceptedIds.length / masteringChunkSize);

      for (let i = 0; i < totalMasteringChunks; i++) {
        const chunkIds = acceptedIds.slice(i * masteringChunkSize, (i + 1) * masteringChunkSize);
        const msg: MasterRecordsMessage = {
          batch_id: batchId,
          institution_id: batch.institution_id,
          reporting_month: batch.reporting_month,
          accepted_raw_record_ids: chunkIds,
          chunk_index: i,
          total_mastering_chunks: totalMasteringChunks,
        };
        await publishMessage(config.pubsub.masterRecordsTopic, msg);
      }
    } else {
      // No accepted records — batch failed validation entirely
      await db('batch_uploads').where('batch_id', batchId).update({
        status: 'FAILED',
        stage: 'COMPLETED',
        completed_at: new Date(),
      });

      const batch = await db('batch_uploads').where('batch_id', batchId).first();
      const failMsg: BatchCompleteMessage = {
        batch_id: batchId,
        institution_id: batch.institution_id,
        status: 'FAILED',
        accepted_count: 0,
        rejected_count,
        warning_count,
      };
      await publishMessage(config.pubsub.batchCompleteTopic, failMsg);
    }
  },
);
