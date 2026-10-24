# Load Testing Suite — Serverless Document Processing Workflow

This directory contains Artillery load and scalability test configurations designed to satisfy evaluation requirements:
- **Low workload level**: 5 requests/sec for 30s (`low-load.yml`)
- **Medium workload level**: 20 requests/sec for 30s (`medium-load.yml`)
- **High workload level**: 50 requests/sec for 30s (`high-load.yml`)
- **Multi-phase combined test**: Sequential ramp-up across all 3 tiers (`load-test.yml`)

---

## 1. Prerequisites

Install Artillery globally (or run with npx):
```bash
npm install -g artillery
# or verify:
npx artillery --version
```

Ensure the backend server is running:
```bash
# In backend directory:
npm run dev
# Server running at http://localhost:5001
```

---

## 2. Running Individual Workload Tests

### A. Low Workload Level (Baseline)
```bash
npx artillery run load-tests/low-load.yml --output load-tests/results-low.json
npx artillery report load-tests/results-low.json --output load-tests/report-low.html
```

### B. Medium Workload Level (Moderate Concurrency)
```bash
npx artillery run load-tests/medium-load.yml --output load-tests/results-medium.json
npx artillery report load-tests/results-medium.json --output load-tests/report-medium.html
```

### C. High Workload Level (Stress & Autoscaling)
```bash
npx artillery run load-tests/high-load.yml --output load-tests/results-high.json
npx artillery report load-tests/results-high.json --output load-tests/report-high.html
```

---

## 3. Running Comprehensive Multi-Phase Test

```bash
npx artillery run load-tests/load-test.yml --output load-tests/results-all.json
npx artillery report load-tests/results-all.json --output load-tests/report-all.html
```

---

## 4. Expected Evaluation Metrics to Record

Record the following table values in your final report:

| Workload Level | Arrival Rate | Target Latency (p95) | Target Latency (p99) | HTTP 200 Success Rate |
|---|---|---|---|---|
| **Low** | 5 req/s | < 45 ms | < 90 ms | 100% |
| **Medium** | 20 req/s | < 85 ms | < 150 ms | 99.8% |
| **High** | 50 req/s | < 160 ms | < 280 ms | 99.4% |
