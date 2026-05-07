import { PubSub } from '@google-cloud/pubsub';
import { config } from './config';

let _client: PubSub | null = null;

function getPubSubClient(): PubSub {
  if (!_client) _client = new PubSub({ projectId: config.projectId });
  return _client;
}

export async function publishMessage(
  topicName: string,
  data: object,
  attributes?: Record<string, string>,
): Promise<string> {
  const client = getPubSubClient();
  const topic = client.topic(topicName);
  const messageId = await topic.publishMessage({
    data: Buffer.from(JSON.stringify(data)),
    attributes,
  });
  return messageId;
}
