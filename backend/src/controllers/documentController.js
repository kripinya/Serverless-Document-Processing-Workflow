const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const DocumentModel = require('../models/Document');
const { EventHistoryModel, EventTypes } = require('../models/EventHistory');

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const documentController = {
  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const file = req.file;

      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type '${file.mimetype}' not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }

      const s3Key = `uploads/${req.user.userId}/${Date.now()}-${file.originalname}`;

      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype
      }).promise();

      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

      const document = await DocumentModel.create({
        userId: req.user.userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        s3Key,
        s3Url
      });

      await EventHistoryModel.record(
        document.documentId,
        EventTypes.DOCUMENT_UPLOADED,
        { fileName: file.originalname, fileSize: file.size }
      );

      await sqs.sendMessage({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          documentId: document.documentId,
          s3Key,
          fileType: file.mimetype,
          action: 'PROCESS_DOCUMENT'
        }),
        MessageGroupId: document.documentId
      }).promise();

      console.log(`[UPLOAD] Document ${document.documentId} queued for processing`);

      res.status(201).json({
        success: true,
        message: 'Document uploaded and queued for processing',
        data: document
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const documents = await DocumentModel.getByUserId(req.user.userId);

      res.json({
        success: true,
        count: documents.length,
        data: documents
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const document = await DocumentModel.getById(req.params.id);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      if (document.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const events = await EventHistoryModel.getByDocumentId(document.documentId);

      res.json({
        success: true,
        data: { ...document, eventHistory: events }
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const document = await DocumentModel.getById(req.params.id);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      if (document.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      await s3.deleteObject({
        Bucket: BUCKET_NAME,
        Key: document.s3Key
      }).promise();

      await DocumentModel.delete(document.documentId);

      await EventHistoryModel.record(
        document.documentId,
        EventTypes.DOCUMENT_DELETED,
        { deletedBy: req.user.userId }
      );

      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async download(req, res, next) {
    try {
      const document = await DocumentModel.getById(req.params.id);

      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      if (document.userId !== req.user.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const url = s3.getSignedUrl('getObject', {
        Bucket: BUCKET_NAME,
        Key: document.s3Key,
        Expires: 900
      });

      res.json({
        success: true,
        data: { downloadUrl: url, expiresIn: '15 minutes' }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = documentController;
