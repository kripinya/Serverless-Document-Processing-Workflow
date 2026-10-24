# System Architecture & Cloud Design — Serverless Document Processing Workflow

## 1. System Overview
The **Serverless Document Processing Workflow** is an event-driven cloud application designed to automatically ingest, validate, classify, and persist documents with high resilience and zero head-of-line blocking.

```mermaid
graph TB
    subgraph "Client Layer"
        User[" End User (Web Browser)"]
        ReactApp[" React Single Page App<br/>(Hosted on S3 Static / CloudFront)"]
    end

    subgraph "API Ingestion Layer"
        APIGW[" Amazon API Gateway (REST API)"]
        AuthMiddleware[" JWT Authentication & Authorization"]
        APILambda[" Node.js Express Lambda"]
    end

    subgraph "Decoupled Event Pipeline"
        SQS[" Amazon SQS Queue<br/>(Buffer & Decoupling)"]
        DLQ[" Dead Letter Queue (DLQ)<br/>(Max 3 Retries)"]
        WorkerLambda[" Processing Worker Lambda"]
    end

    subgraph "Storage & State Layer"
        S3[" Amazon S3 Bucket<br/>(Raw Document Files)"]
        DDB_Docs[" DynamoDB: DocumentsTable<br/>(Document Status & Metadata)"]
        DDB_Events[" DynamoDB: EventHistoryTable<br/>(Immutable Audit Log)"]
        DDB_Users[" DynamoDB: UsersTable<br/>(Authentication Credentials)"]
    end

    subgraph "Observability & Alerting"
        CloudWatch[" Amazon CloudWatch<br/>(Logs & Metric Alarms)"]
        SNS[" Amazon SNS<br/>(Failure Notifications)"]
    end

    User -->|Browser Traffic| ReactApp
    ReactApp -->|REST API Calls| APIGW
    APIGW --> AuthMiddleware
    AuthMiddleware --> APILambda
    APILambda -->|Upload File| S3
    APILambda -->|Init Document Record| DDB_Docs
    APILambda -->|Enqueue Event| SQS
    SQS -->|Trigger Batch| WorkerLambda
    WorkerLambda -->|Update Progress & Classification| DDB_Docs
    WorkerLambda -->|Append Event Audit Trail| DDB_Events
    WorkerLambda -->|On Poison Message (3 fails)| DLQ
    DLQ -->|Dispatch Alert| SNS
    APILambda -.-> CloudWatch
    WorkerLambda -.-> CloudWatch
```

---

## 2. Cloud Architectural Components (≥3 Cloud Components)

| Component | AWS Service | Architectural Role |
|---|---|---|
| **Object Storage** | Amazon S3 | Secure, highly durable storage for raw uploaded documents with pre-signed URL generation. |
| **NoSQL Database** | Amazon DynamoDB | Low-latency state persistence for documents, user credentials, and event history. |
| **Event Queue** | Amazon SQS | Asynchronous message queuing ensuring horizontal scaling and buffer isolation between ingestion and processing. |
| **Dead-Letter Queue** | Amazon SQS (DLQ) | Captures malformed or permanently failing messages after 3 redrives without blocking the pipeline. |
| **Serverless Compute** | AWS Lambda | Event-triggered execution running Node.js express handlers and async SQS workers. |
| **API Gateway** | Amazon API Gateway | Manages HTTP REST routing, throttling, and CORS security. |
| **Monitoring & Telemetry** | Amazon CloudWatch | Captures latency, invocation count, error frequency, and custom processing metrics. |
| **Alerting** | Amazon SNS | Sends immediate notifications when dead-letter queue receives poison pills. |

---

## 3. Database Selection Justification (NoSQL vs. Relational)

DynamoDB was chosen over traditional relational SQL (such as RDS PostgreSQL or MySQL) based on the following architectural justifications:

1. **Schema Flexibility**: Different document types (invoices, resumes, contracts, receipts) generate radically distinct extracted metadata structures. DynamoDB supports schemaless item attributes seamlessly.
2. **True Serverless Autoscaling**: DynamoDB on-demand billing scales down to $0 when idle and automatically accommodates large spikes of document uploads without connection pool bottlenecks.
3. **High-Velocity Key-Value Lookups**: Single-item reads and updates by `documentId` are executed with single-digit millisecond latency.
4. **Append-Heavy Event History**: The `EventHistoryTable` utilizes a composite primary key (`documentId` as Hash Key, `timestamp` as Range Key), enabling fast range queries for document audit trails.

---

## 4. Asynchronous Pipeline & Resilient Failure Handling

### Multi-Stage Pipeline Workflow
1. **Upload Stage (`UPLOADED`)**: File is accepted via `POST /api/documents/upload`, uploaded to S3, a document record is created, and an event is queued onto SQS.
2. **Validation Stage (`VALIDATING`)**: Worker validates MIME types, magic bytes, and file size constraints.
3. **Extraction & Classification Stage (`PROCESSING` → `CLASSIFIED`)**: Worker performs text extraction, applies keyword heuristics (e.g. INVOICE, RECEIPT, RESUME, REPORT), and persists extracted metadata.
4. **Completion Stage (`COMPLETED`)**: Final state is updated in DynamoDB and immutable event record is logged.

### Handling Controlled Failures & Fault Isolation
- **Non-Blocking Fault Isolation**: Each document event is processed in isolation. A failure in document A does not delay or block document B in the queue.
- **Redrive & Exponential Backoff**: Transient errors are retried up to 3 times by SQS.
- **Poison Pill Isolation (DLQ)**: If a document fails all 3 attempts (e.g., corrupted file or unhandled parsing error), SQS routes the message to `doc-processing-dlq`, marks document status as `FAILED`, and notifies SNS.
- **Manual Retry API**: Operators or users can trigger re-processing via `POST /api/processing/retry/:id`, which increments the retry counter and re-injects the message.

---

## 5. Measured Project Telemetry Metrics

1. **Pipeline Latency (`ProcessingDuration`)**:
   - Measures elapsed time from worker message receipt to final DynamoDB write (in milliseconds).
   - Logged and pushed to CloudWatch namespace `DocProcessing`.
2. **Classification Success & Distribution (`DocumentClassified`)**:
   - Tracks counts across categories (`INVOICE`, `RECEIPT`, `RESUME`, `REPORT`, `GENERAL`).
3. **Queue Health & Error Frequency (`ProcessingErrors`)**:
   - Quantifies error types (`VALIDATION_FAILED`, `PROCESSING_EXCEPTION`) to evaluate pipeline resilience.
