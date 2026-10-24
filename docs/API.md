# REST API Documentation — Serverless Document Processing Workflow

## Overview
The Serverless Document Processing Workflow exposes a complete REST API for authenticating users, uploading files, monitoring asynchronous processing status, inspecting event audit history, and retrieving system health metrics.

### Base URLs
- **Local Development:** `http://localhost:5001/api`
- **AWS API Gateway:** `https://<api-id>.execute-api.<region>.amazonaws.com/dev/api`

### Authentication
Protected endpoints require a standard Bearer token in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "name": "Alex Doe",
  "email": "alex@example.com",
  "password": "Password123!"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "usr_9b1deb4d",
      "name": "Alex Doe",
      "email": "alex@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.2 Login User
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "alex@example.com",
  "password": "Password123!"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "usr_9b1deb4d",
      "name": "Alex Doe",
      "email": "alex@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.3 Get Current User Profile
- **Endpoint:** `GET /api/auth/me`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_9b1deb4d",
    "email": "alex@example.com",
    "name": "Alex Doe"
  }
}
```

---

## 2. Document Endpoints

### 2.1 Upload Document
- **Endpoint:** `POST /api/documents/upload`
- **Access:** Authenticated (`Bearer <token>`)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `document` (Binary file: PDF, JPG, PNG, TXT, DOCX; max 10MB)
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Document uploaded and queued for processing",
  "data": {
    "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
    "fileName": "invoice-2024.pdf",
    "status": "UPLOADED",
    "s3Key": "uploads/c8b4fa94-3286-4fc6-b8db-4e78a25c04b8-invoice-2024.pdf",
    "fileSize": 1048576,
    "createdAt": "2026-10-12T07:15:00.000Z"
  }
}
```

### 2.2 List Documents
- **Endpoint:** `GET /api/documents`
- **Access:** Authenticated (`Bearer <token>`)
- **Query Parameters:** `limit` (default: 50)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
      "originalName": "invoice-2024.pdf",
      "status": "COMPLETED",
      "classification": "INVOICE",
      "retryCount": 0,
      "createdAt": "2026-10-12T07:15:00.000Z"
    }
  ]
}
```

### 2.3 Get Document Details
- **Endpoint:** `GET /api/documents/:id`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
    "originalName": "invoice-2024.pdf",
    "status": "COMPLETED",
    "classification": "INVOICE",
    "s3Key": "uploads/c8b4fa94-3286-4fc6-b8db-4e78a25c04b8-invoice-2024.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "retryCount": 0,
    "extractedMetadata": {
      "confidence": 0.96,
      "totalAmount": "$500.00"
    },
    "createdAt": "2026-10-12T07:15:00.000Z",
    "updatedAt": "2026-10-12T07:15:01.200Z"
  }
}
```

### 2.4 Download Document Pre-Signed URL
- **Endpoint:** `GET /api/documents/:id/download`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "downloadUrl": "https://doc-processing-bucket.s3.ap-south-1.amazonaws.com/uploads/...?X-Amz-Signature=..."
}
```

### 2.5 Delete Document
- **Endpoint:** `DELETE /api/documents/:id`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## 3. Processing & Asynchronous Event Endpoints

### 3.1 Get Processing Status
- **Endpoint:** `GET /api/processing/status/:id`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
    "status": "COMPLETED",
    "stage": "PROCESSING_COMPLETE",
    "retryCount": 0
  }
}
```

### 3.2 Trigger Manual SQS Reprocess / Retry
- **Endpoint:** `POST /api/processing/retry/:id`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Retry queued successfully for document processing",
  "data": {
    "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
    "status": "RETRY_QUEUED"
  }
}
```

### 3.3 Get Document Event Audit History
- **Endpoint:** `GET /api/processing/events/:id`
- **Access:** Authenticated (`Bearer <token>`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ev_1",
      "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
      "eventType": "DOCUMENT_UPLOADED",
      "timestamp": "2026-10-12T07:15:00.000Z",
      "details": { "fileSize": 1048576 }
    },
    {
      "id": "ev_2",
      "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
      "eventType": "VALIDATION_PASSED",
      "timestamp": "2026-10-12T07:15:00.400Z"
    },
    {
      "id": "ev_3",
      "documentId": "c8b4fa94-3286-4fc6-b8db-4e78a25c04b8",
      "eventType": "PROCESSING_COMPLETE",
      "timestamp": "2026-10-12T07:15:01.100Z",
      "details": { "classification": "INVOICE" }
    }
  ]
}
```

---

## 4. Health & CloudWatch Telemetry Endpoints

### 4.1 Basic Health Check
- **Endpoint:** `GET /api/health`
- **Access:** Public
- **Success Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-10-12T07:15:00.000Z",
  "uptime": 234.5,
  "environment": "development"
}
```

### 4.2 Aggregated Telemetry Metrics
- **Endpoint:** `GET /api/health/metrics`
- **Access:** Public
- **Success Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "totalProcessed": 48,
    "successful": 47,
    "failed": 1,
    "successRate": 98,
    "avgProcessingDurationMs": 138.4,
    "classifications": {
      "INVOICE": 20,
      "RECEIPT": 14,
      "RESUME": 8,
      "REPORT": 5
    },
    "errors": {
      "VALIDATION_FAILED": 1
    },
    "uptime": 234.5
  }
}
```
