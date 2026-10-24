// ============================================================
// Document.js — DynamoDB Document Model
// ============================================================
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || 'ap-south-1'
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_DOCUMENTS || 'DocumentsTable';


const DocumentModel = {
    /**
     * Create a new document record
     */
    async create(data) {
        const document = {
            documentId: uuidv4(),
            userId: data.userId,
            fileName: data.fileName,
            fileType: data.fileType,          // pdf, docx, jpg, png, etc.
            fileSize: data.fileSize,
            s3Key: data.s3Key,
            s3Url: data.s3Url,

            // Processing status: UPLOADED → VALIDATING → PROCESSING → CLASSIFIED → COMPLETED / FAILED
            status: 'UPLOADED',
            classification: null,             // invoice, receipt, report, letter, etc.
            extractedText: null,
            validationErrors: [],

            // Retry tracking
            retryCount: 0,
            maxRetries: 3,                    // 🎨 CUSTOMIZATION: Change max retry count
            lastError: null,

            // Timestamps
            uploadedAt: new Date().toISOString(),
            processedAt: null,
            updatedAt: new Date().toISOString()
        };

        await dynamoDB.put({
            TableName: TABLE_NAME,
            Item: document
        }).promise();

        return document;
    },

    /**
     * Get a document by ID
     */
    async getById(documentId) {
        const result = await dynamoDB.get({
            TableName: TABLE_NAME,
            Key: { documentId }
        }).promise();
        return result.Item || null;
    },

    /**
     * Get all documents for a user
     */
    async getByUserId(userId) {
        const result = await dynamoDB.scan({
            TableName: TABLE_NAME,
            FilterExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }).promise();
        return result.Items || [];
    },

    /**
     * Update document status (core state machine transition)
     */
    async updateStatus(documentId, status, extraFields = {}) {
        const updateExpression = ['#s = :status', 'updatedAt = :now'];
        const expressionValues = {
            ':status': status,
            ':now': new Date().toISOString()
        };
        const expressionNames = { '#s': 'status' };

        // Dynamically add extra fields
        Object.entries(extraFields).forEach(([key, value]) => {
            updateExpression.push(`${key} = :${key}`);
            expressionValues[`:${key}`] = value;
        });

        const result = await dynamoDB.update({
            TableName: TABLE_NAME,
            Key: { documentId },
            UpdateExpression: 'SET ' + updateExpression.join(', '),
            ExpressionAttributeValues: expressionValues,
            ExpressionAttributeNames: expressionNames,
            ReturnValues: 'ALL_NEW'
        }).promise();

        return result.Attributes;
    },

    /**
     * Delete a document
     */
    async delete(documentId) {
        await dynamoDB.delete({
            TableName: TABLE_NAME,
            Key: { documentId }
        }).promise();
        return true;
    },

    /**
     * Get all documents (admin)
     */
    async getAll() {
        const result = await dynamoDB.scan({
            TableName: TABLE_NAME
        }).promise();
        return result.Items || [];
    }
};

module.exports = DocumentModel;
