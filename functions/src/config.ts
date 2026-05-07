export const config = {
  projectId: process.env.GCLOUD_PROJECT ?? 'mfcb-platform',
  gcsBucketBatches: process.env.GCS_BUCKET_BATCHES ?? 'mfcb-batches-dev',
  gcsBucketQuarantine: process.env.GCS_BUCKET_QUARANTINE ?? 'mfcb-batches-quarantine-dev',
  pubsub: {
    chunkValidateTopic: process.env.PUBSUB_CHUNK_VALIDATE_TOPIC ?? 'mfcb-chunk-validate',
    masterRecordsTopic: process.env.PUBSUB_MASTER_RECORDS_TOPIC ?? 'mfcb-master-records',
    batchCompleteTopic: process.env.PUBSUB_BATCH_COMPLETE_TOPIC ?? 'mfcb-batch-complete',
    webhookOutboundTopic: process.env.PUBSUB_WEBHOOK_OUTBOUND_TOPIC ?? 'mfcb-webhook-outbound',
  },
  chunkSize: parseInt(process.env.CHUNK_SIZE ?? '500', 10),
  masteringChunkSize: parseInt(process.env.MASTERING_CHUNK_SIZE ?? '200', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://neondb_owner:npg_Uhl4LoVnKZg8@ep-withered-glade-apsk712t-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
};
