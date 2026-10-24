# Infrastructure Provisioning — AWS CloudFormation & Serverless

This folder contains infrastructure-as-code definitions for provisioning all necessary AWS cloud components:
- **Amazon S3**: Object storage for uploaded documents with CORS enabled.
- **Amazon DynamoDB**: NoSQL database holding `DocumentsTable`, `EventHistoryTable`, and `UsersTable`.
- **Amazon SQS & DLQ**: Asynchronous message buffer with a 3-retry redrive policy routing poison pills to Dead Letter Queue.
- **Amazon SNS**: Notification topic for alerting on terminal document failures.

---

## Deploying via AWS CLI

To provision the infrastructure using AWS CloudFormation:

```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation-template.yml \
  --stack-name doc-processing-stack-dev \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides EnvironmentName=dev \
  --region ap-south-1
```

To view the generated output resource ARNs:

```bash
aws cloudformation describe-stacks \
  --stack-name doc-processing-stack-dev \
  --query "Stacks[0].Outputs" \
  --output table
```

---

## Deploying Serverless Functions

The backend compute functions (API Gateway + Express handler + SQS Worker Lambda) are deployed using the Serverless Framework in `backend/`:

```bash
cd backend
npx serverless deploy --stage dev
```
