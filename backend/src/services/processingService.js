const DocumentModel = require('../models/Document');
const { EventHistoryModel, EventTypes } = require('../models/EventHistory');
const metrics = require('../utils/metrics');

const CLASSIFICATION_RULES = {
  invoice: ['invoice', 'bill', 'amount due', 'total', 'payment', 'tax', 'subtotal'],
  receipt: ['receipt', 'paid', 'transaction', 'purchase', 'order #'],
  report: ['report', 'summary', 'analysis', 'findings', 'conclusion', 'recommendation'],
  letter: ['dear', 'sincerely', 'regards', 'to whom it may concern'],
  contract: ['agreement', 'terms', 'conditions', 'party', 'clause', 'effective date'],
  resume: ['experience', 'education', 'skills', 'objective', 'references']
};

const processingService = {
  async processDocument(documentId, s3Key, fileType) {
    const startTime = Date.now();
    console.log(`[PROCESSING] Starting pipeline for document: ${documentId}`);

    try {
      await DocumentModel.updateStatus(documentId, 'VALIDATING');
      await EventHistoryModel.record(documentId, EventTypes.VALIDATION_STARTED);

      const validationResult = await this.validateDocument(documentId, s3Key, fileType);

      if (!validationResult.valid) {
        await DocumentModel.updateStatus(documentId, 'FAILED', {
          validationErrors: validationResult.errors,
          lastError: validationResult.errors.join('; ')
        });
        await EventHistoryModel.record(documentId, EventTypes.VALIDATION_FAILED, {
          errors: validationResult.errors
        });
        await metrics.recordError('VALIDATION_FAILED');
        return { success: false, stage: 'VALIDATION', errors: validationResult.errors };
      }

      await EventHistoryModel.record(documentId, EventTypes.VALIDATION_PASSED);

      await DocumentModel.updateStatus(documentId, 'PROCESSING');
      await EventHistoryModel.record(documentId, EventTypes.PROCESSING_STARTED);

      const extractedText = await this.extractText(s3Key, fileType);

      const classification = this.classifyDocument(extractedText);

      await DocumentModel.updateStatus(documentId, 'CLASSIFIED', {
        classification: classification,
        extractedText: extractedText.substring(0, 1000)
      });
      await EventHistoryModel.record(documentId, EventTypes.CLASSIFICATION_COMPLETE, {
        classification
      });

      await DocumentModel.updateStatus(documentId, 'COMPLETED', {
        processedAt: new Date().toISOString()
      });
      await EventHistoryModel.record(documentId, EventTypes.PROCESSING_COMPLETE, {
        classification,
        textLength: extractedText.length
      });

      const durationMs = Date.now() - startTime;
      await metrics.recordProcessingTime(documentId, durationMs);
      await metrics.recordClassification(classification);

      console.log(`[PROCESSING] ✅ Document ${documentId} completed in ${durationMs}ms. Class: ${classification}`);
      return { success: true, classification, durationMs };

    } catch (error) {
      console.error(`[PROCESSING] ❌ Failed for document ${documentId}:`, error.message);

      const document = await DocumentModel.getById(documentId);

      await DocumentModel.updateStatus(documentId, 'FAILED', {
        lastError: error.message,
        retryCount: (document?.retryCount || 0)
      });
      await EventHistoryModel.record(documentId, EventTypes.PROCESSING_FAILED, {
        error: error.message
      });

      await metrics.recordError('PROCESSING_EXCEPTION');
      throw error;
    }
  },

  async validateDocument(documentId, s3Key, fileType) {
    const errors = [];

    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!supportedTypes.includes(fileType)) {
      errors.push(`Unsupported file type: ${fileType}`);
    }

    if (!s3Key || !s3Key.startsWith('uploads/')) {
      errors.push('Invalid S3 key format');
    }

    // Controlled failure scenario: files named "corrupt" or random 5% trigger simulation
    if (s3Key.toLowerCase().includes('corrupt')) {
      errors.push('Controlled failure scenario: Document corrupted intentionally for testing resilience');
    }

    await new Promise(resolve => setTimeout(resolve, 400));

    return { valid: errors.length === 0, errors };
  },

  async extractText(s3Key, fileType) {
    const fileName = s3Key.split('/').pop().toLowerCase();

    if (fileName.includes('invoice')) {
      return 'Invoice #12345. Amount due: $500.00. Payment terms: Net 30. Tax: $45.00. Subtotal: $455.00';
    } else if (fileName.includes('receipt')) {
      return 'Receipt. Transaction ID: TXN-98765. Paid: $125.50. Purchase date: 2024-01-15.';
    } else if (fileName.includes('report')) {
      return 'Annual Report 2024. Summary of findings and analysis. Conclusion: Growth exceeded targets.';
    } else if (fileName.includes('resume') || fileName.includes('cv')) {
      return 'John Doe. Experience: 5 years software development. Education: B.Tech CS. Skills: JavaScript, Python.';
    } else if (fileName.includes('contract')) {
      return 'Service Agreement between Party A and Party B. Effective date: Jan 1, 2024. Terms and conditions apply.';
    } else {
      return `Document content extracted from ${fileName}. This is a general document with mixed content.`;
    }
  },

  classifyDocument(text) {
    const lowerText = text.toLowerCase();
    let bestMatch = 'general';
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CLASSIFICATION_RULES)) {
      const score = keywords.filter(kw => lowerText.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }

    return bestMatch.toUpperCase();
  }
};

module.exports = processingService;
