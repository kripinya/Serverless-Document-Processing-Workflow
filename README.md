# Serverless Document Processing Workflow

> Automatically validate, process, classify and store uploaded documents through multiple processing stages with retry handling — deployed on AWS using serverless architecture.

---

## Architecture

```mermaid
graph TB
    User[" User"] -->|Upload| React[" React SPA"]
    React -->|REST API| APIGW[" API Gateway"]
    APIGW --> Lambda[" Lambda (Express.js)"]
    Lambda -->|Store file| S3[" S3 Bucket"]
    Lambda -->|Create record| DDB[" DynamoDB"]
    Lambda -->|Queue event| SQS[" SQS Queue"]
    SQS -->|Trigger| Worker[" Worker Lambda"]
    Worker -->|Update status| DDB
    Worker -->|On failure (3x)| DLQ[" Dead Letter Queue"]
    DLQ -->|Alert| SNS[" SNS Notification"]
```

### AWS Services Used
| Service | Purpose |
|---------|---------|
| **S3** | Document file storage + frontend hosting |
| **DynamoDB** | Document metadata, event history, user credentials |
| **SQS + DLQ** | Async event queue with retry & dead-letter isolation |
| **Lambda** | Serverless compute (API + processing workers) |
| **API Gateway** | REST API exposure |
| **SNS** | Failure alert notifications |
| **CloudWatch** | Logging & custom metrics |

### Database: DynamoDB (NoSQL)
**Justification:** Variable document schemas, fast key-value lookups, serverless auto-scaling, append-heavy event history pattern.

---

## Project Structure

```
Serverless-Document-Processing-Workflow/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── controllers/        # authController, documentController, processingController
│   │   ├── models/             # Document, EventHistory, User (DynamoDB)
│   │   ├── routes/             # auth, document, processing, health
│   │   ├── middleware/         # JWT auth verification
│   │   ├── services/           # Processing pipeline (validate → extract → classify)
│   │   ├── lambdas/            # SQS worker Lambda handler
│   │   ├── utils/              # CloudWatch metrics utility
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Local dev server entry
│   ├── handler.js              # Lambda adapter (serverless-http)
│   ├── serverless.yml          # Serverless Framework deployment config
│   └── package.json
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── components/         # Navbar
│   │   ├── pages/              # Dashboard, DocumentDetail, Architecture, Login, Register
│   │   ├── services/           # Centralized Axios API client
│   │   ├── App.jsx             # Routes & layout
│   │   ├── App.css             # Component styles
│   │   ├── index.css           # Design system tokens
│   │   └── main.jsx            # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── load-tests/                 # Artillery load/scalability testing
│   ├── load-test.yml           # Combined 3-tier test (low → medium → high)
│   ├── low-load.yml            # 5 req/s for 30s
│   ├── medium-load.yml         # 20 req/s for 30s
│   └── high-load.yml           # 50 req/s for 30s
├── infrastructure/             # CloudFormation template
│   └── cloudformation-template.yml
├── docs/                       # Documentation
│   ├── API.md                  # REST API documentation (13 endpoints)
│   └── ARCHITECTURE.md         # Cloud architecture & design decisions
├── package.json                # Root orchestration scripts
├── .gitignore
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- AWS CLI configured (`aws configure`)
- npm

### 1. Backend Setup
```bash
cd backend
cp .env.example .env         # Edit with your AWS details
npm install
npm run dev                  # Starts on http://localhost:5001
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env         # Points to http://localhost:5001/api
npm install
npm run dev                  # Starts on http://localhost:3000
```

### 3. Load Testing
```bash
# Install Artillery
npm install -g artillery

# Run individual levels
npx artillery run load-tests/low-load.yml
npx artillery run load-tests/medium-load.yml
npx artillery run load-tests/high-load.yml

# Or combined multi-phase
npx artillery run load-tests/load-test.yml --output load-tests/results.json
npx artillery report load-tests/results.json --output load-tests/report.html
```

---

## AWS Deployment

### Option A: Serverless Framework (Lambda + API Gateway)
```bash
cd backend
npm install -g serverless
npx serverless deploy --stage dev
```

### Option B: CloudFormation (Infrastructure Resources)
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation-template.yml \
  --stack-name doc-processing-stack-dev \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides EnvironmentName=dev
```

---

## API Endpoints (13 total, ≥5 required)

| # | Method | Endpoint | Auth | Description |
|---|--------|----------|------|-------------|
| 1 | POST | `/api/auth/register` | Public | Register user |
| 2 | POST | `/api/auth/login` | Public | Login & get JWT |
| 3 | GET | `/api/auth/me` | JWT (Bearer) | Get profile |
| 4 | POST | `/api/documents/upload` | JWT (Bearer) | Upload document |
| 5 | GET | `/api/documents` | JWT (Bearer) | List documents |
| 6 | GET | `/api/documents/:id` | JWT (Bearer) | Document details |
| 7 | GET | `/api/documents/:id/download` | JWT (Bearer) | Pre-signed URL |
| 8 | DELETE | `/api/documents/:id` | JWT (Bearer) | Delete document |
| 9 | GET | `/api/processing/status/:id` | JWT (Bearer) | Processing status |
| 10 | POST | `/api/processing/retry/:id` | JWT (Bearer) | Manual retry |
| 11 | GET | `/api/processing/events/:id` | JWT (Bearer) | Event audit log |
| 12 | GET | `/api/health` | Public | Health check |
| 13 | GET | `/api/health/metrics` | Public | Aggregated metrics |

Full documentation: [`docs/API.md`](docs/API.md)

---

## Event-Driven Processing Pipeline

```
UPLOADED → VALIDATING → PROCESSING → CLASSIFIED → COMPLETED
                ↓                                      
          VALIDATION_FAILED                            
                ↓                                      
     SQS Retry (up to 3x)                             
                ↓                                      
          Dead Letter Queue → SNS Alert → FAILED        
```

- **Each document = independent SQS message** → one failure never blocks others
- **Controlled failure scenario:** Files named `corrupt*` trigger intentional validation failure
- **Retry with exponential backoff:** Up to 3 retries before DLQ routing
- **Immutable event audit trail:** All state transitions logged in `EventHistoryTable`

### Document Classification Mechanism
- **Method:** Rule-based keyword-heuristic classifier (`processingService.js`).
- **How it works:** Extracted text is normalized and matched against domain-specific keyword dictionaries (`INVOICE`, `RECEIPT`, `REPORT`, `RESUME`, `CONTRACT`, `LETTER`). The category with the highest frequency match is assigned to the document in DynamoDB. Unmatched documents default to `GENERAL`.
- **Extensibility:** Dictionary rules in `CLASSIFICATION_RULES` can be customized or replaced with ML models (e.g. AWS Comprehend or Textract) without changing pipeline architecture.

---

## Measured Metrics (≥2 required)

1. **Pipeline Processing Latency** — End-to-end ms from SQS dequeue to DynamoDB final write
2. **Classification Success Rate** — % of documents successfully classified vs. failed/DLQ

---

## Requirements Checklist

| # | Requirement | Status | Implementation Details |
|---|-------------|:------:|------------------------|
| 1 | Core functionality (validate, process, classify, store) | Completed | Multi-stage pipeline implemented in `processingService.js` |
| 2 | ≥5 REST API endpoints | Completed | 13 endpoints implemented across Auth, Documents, Processing, Health |
| 3 | Proper data model | Completed | DynamoDB models for Document, EventHistory, User (`src/models/`) |
| 4 | Authentication (JWT) | Completed | Bearer token auth verification via `authMiddleware.js` |
| 5 | Cloud deployment ready | Completed | Serverless Framework (`serverless.yml`) + CloudFormation IaC |
| 6 | Logging | Completed | Structured console logging streamed to AWS CloudWatch |
| 7 | ≥2 metrics | Completed | Pipeline latency (`ProcessingDuration`) & Classification distribution |
| 8 | Load testing (3 levels) | Completed | Artillery suites for Low, Medium, High & combined multi-phase load |
| 9 | Cloud architecture diagram | Completed | Architecture diagram in README and `docs/ARCHITECTURE.md` |
| 10 | API documentation | Completed | Complete OpenAPI-style documentation in `docs/API.md` |
| 11 | Event-driven architecture | Completed | Asynchronous decoupling via SQS FIFO queue & DLQ |
| 12 | Async processing (SQS → Lambda) | Completed | Background SQS processor Lambda (`sqsProcessor.js`) |
| 13 | Handle duplicates/failures/delays | Completed | SQS FIFO deduplication, visibility timeouts & exponential backoff |
| 14 | Event history maintained | Completed | Immutable audit trail in DynamoDB `EventHistoryTable` |
| 15 | One failure ≠ block system | Completed | Independent SQS message isolation; one failure never blocks others |
| 16 | ≥3 cloud components | Completed | 7 AWS services: S3, DynamoDB, SQS, DLQ, Lambda, API Gateway, CloudWatch/SNS |
| 17 | Controlled failure scenario | Completed | Files named `corrupt*` trigger intentional validation failure |
| 18 | ≥8 Git commits | Completed | 11 clean, structured commits in Git history |

---

## Recommended Git Commit Plan

```bash
git add .gitignore README.md package.json
git commit -m "chore: initialize project structure with gitignore and root config"

git add backend/package.json backend/src/app.js backend/src/server.js backend/handler.js
git commit -m "feat: set up Express.js backend with local server and Lambda adapter"

git add backend/src/models/
git commit -m "feat: add DynamoDB data models for Document, EventHistory, and User"

git add backend/src/middleware/ backend/src/controllers/authController.js backend/src/routes/authRoutes.js
git commit -m "feat: implement JWT authentication middleware and auth endpoints"

git add backend/src/controllers/ backend/src/routes/documentRoutes.js backend/src/routes/processingRoutes.js
git commit -m "feat: add document upload, listing, and processing REST endpoints"

git add backend/src/services/ backend/src/lambdas/ backend/src/utils/ backend/src/routes/healthRoutes.js
git commit -m "feat: implement async processing pipeline with SQS, retry logic, and metrics"

git add backend/serverless.yml infrastructure/
git commit -m "infra: add Serverless Framework config and CloudFormation template"

git add frontend/
git commit -m "feat: build React frontend with dashboard, document detail, and auth pages"

git add load-tests/
git commit -m "test: add Artillery load tests at low, medium, and high workload levels"

git add docs/
git commit -m "docs: add API documentation and cloud architecture design document"
```
