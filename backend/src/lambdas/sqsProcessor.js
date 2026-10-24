const processingService = require('../services/processingService');
const { EventHistoryModel, EventTypes } = require('../models/EventHistory');

exports.handler = async (event) => {
  console.log(`[SQS_PROCESSOR] Received ${event.Records.length} messages`);

  const results = {
    successful: [],
    failed: []
  };

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { documentId, s3Key, fileType, isRetry, retryCount } = body;

      console.log(`[SQS_PROCESSOR] Processing document: ${documentId}` +
        (isRetry ? ` (retry #${retryCount})` : ''));

      const result = await processingService.processDocument(documentId, s3Key, fileType);

      results.successful.push(documentId);
    } catch (error) {
      console.error(`[SQS_PROCESSOR] ❌ Error:`, error.message);
      results.failed.push({
        documentId: JSON.parse(record.body).documentId,
        error: error.message
      });

      throw error;
    }
  }

  console.log(`[SQS_PROCESSOR] Results: ${results.successful.length} success, ${results.failed.length} failed`);
  return results;
};
