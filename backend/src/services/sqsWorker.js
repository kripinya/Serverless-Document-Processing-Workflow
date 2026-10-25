const AWS = require('aws-sdk');
const sqsProcessor = require('../lambdas/sqsProcessor');

const sqs = new AWS.SQS({ region: process.env.AWS_REGION || 'ap-south-1' });
const queueUrl = process.env.SQS_QUEUE_URL;

let isPolling = false;

async function startWorker() {
  if (!queueUrl) {
    console.warn('[SQS_WORKER] SQS_QUEUE_URL not configured. Local worker disabled.');
    return;
  }

  isPolling = true;
  console.log(`[SQS_WORKER] 🔄 Local SQS worker listening on: ${queueUrl}`);

  while (isPolling) {
    try {
      const data = await sqs.receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 5,
        VisibilityTimeout: 60,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All']
      }).promise();

      if (data.Messages && data.Messages.length > 0) {
        console.log(`[SQS_WORKER] 📥 Received ${data.Messages.length} message(s)`);

        for (const msg of data.Messages) {
          try {
            await sqsProcessor.handler({
              Records: [{ body: msg.Body }]
            });

            // Delete message upon successful processing
            await sqs.deleteMessage({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle
            }).promise();

            console.log(`[SQS_WORKER] ✅ Processed & acknowledged message: ${msg.MessageId}`);
          } catch (procErr) {
            console.error(`[SQS_WORKER] ❌ Failed processing message ${msg.MessageId}:`, procErr.message);
            // SQS redrive policy will retry or send to DLQ based on visibility timeout
          }
        }
      }
    } catch (err) {
      if (isPolling) {
        console.error('[SQS_WORKER] Polling error:', err.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
}

function stopWorker() {
  isPolling = false;
  console.log('[SQS_WORKER] Worker stopped.');
}

module.exports = { startWorker, stopWorker };
