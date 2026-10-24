// ============================================================
// EventHistory.js — Event sourcing / audit trail
// Records every state change for every document
// ============================================================
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-south-1'
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_EVENTS || 'EventHistoryTable';

const EventTypes = {
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    VALIDATION_STARTED: 'VALIDATION_STARTED',
    VALIDATION_PASSED: 'VALIDATION_PASSED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    PROCESSING_STARTED: 'PROCESSING_STARTED',
    CLASSIFICATION_COMPLETE: 'CLASSIFICATION_COMPLETE',
    PROCESSING_COMPLETE: 'PROCESSING_COMPLETE',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
    RETRY_ATTEMPTED: 'RETRY_ATTEMPTED',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DUPLICATE_DETECTED: 'DUPLICATE_DETECTED'
};

const EventHistoryModel = {
    /**
     * Record a new event
     */
    async record(documentId, eventType, details = {}) {
        const event = {
            eventId: uuidv4(),
            documentId,
            eventType,
            details,
            timestamp: new Date().toISOString()
        };

        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: event
        }).promise();

        console.log(`[EVENT] ${eventType} for document ${documentId}`);
        return event;
    },

    /**
     * Get all events for a document (history)
     */
    async getByDocumentId(documentId) {
        const result = await dynamoDB.scan({
            TableName: TABLE_NAME,
            FilterExpression: 'documentId = :docId',
            ExpressionAttributeValues: { ':docId': documentId }
        }).promise();

        // Sort by timestamp ascending
        return (result.Items || []).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
    },

    /**
     * Get recent events across all documents
     */
    async getRecent(limit = 50) {
        const result = await dynamoDB.scan({
            TableName: TABLE_NAME,
            Limit: limit
        }).promise();
        return (result.Items || []).sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
    }
};

module.exports = { EventHistoryModel, EventTypes };
