const DocumentModel = require('../models/Document');
const { EventHistoryModel, EventTypes } = require('../models/EventHistory');
const AWS = require('aws-sdk');

const sqs = new AWS.SQS({ region: process.env.AWS_REGION });
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const processingController = {
  async getStatus(req, res, next) {
    try {
      const document = await DocumentModel.getById(req.params.id);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const events = await EventHistoryModel.getByDocumentId(document.documentId);

      res.json({
        success: true,
        data: {
          documentId: document.documentId,
          fileName: document.fileName,
          status: document.status,
          classification: document.classification,
          retryCount: document.retryCount,
          maxRetries: document.maxRetries,
          lastError: document.lastError,
          uploadedAt: document.uploadedAt,
          processedAt: document.processedAt,
          eventCount: events.length,
          latestEvent: events[events.length - 1] || null
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async retryProcessing(req, res, next) {
    try {
      const document = await DocumentModel.getById(req.params.id);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      if (document.status !== 'FAILED') {
        return res.status(400).json({
          success: false,
          error: `Cannot retry. Current status: ${document.status}. Only FAILED documents can be retried.`
        });
      }

      if (document.retryCount >= document.maxRetries) {
        return res.status(400).json({
          success: false,
          error: `Max retries (${document.maxRetries}) exceeded. Document moved to dead letter.`
        });
      }

      await DocumentModel.updateStatus(document.documentId, 'UPLOADED', {
        retryCount: document.retryCount + 1,
        lastError: null
      });

      await EventHistoryModel.record(
        document.documentId,
        EventTypes.RETRY_ATTEMPTED,
        { retryCount: document.retryCount + 1, triggeredBy: 'manual' }
      );

      await sqs.sendMessage({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          documentId: document.documentId,
          s3Key: document.s3Key,
          fileType: document.fileType,
          action: 'PROCESS_DOCUMENT',
          isRetry: true,
          retryCount: document.retryCount + 1
        })
      }).promise();

      res.json({
        success: true,
        message: 'Document re-queued for processing',
        data: { retryCount: document.retryCount + 1 }
      });
    } catch (error) {
      next(error);
    }
  },

  async getEventHistory(req, res, next) {
    try {
      const events = await EventHistoryModel.getByDocumentId(req.params.id);

      res.json({
        success: true,
        count: events.length,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = processingController;
