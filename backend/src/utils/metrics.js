const AWS = require('aws-sdk');

const cloudwatch = new AWS.CloudWatch({
  region: process.env.AWS_REGION || 'ap-south-1'
});

// In-memory aggregates for local observability and viva demo
const inMemoryMetrics = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  totalDurationMs: 0,
  avgProcessingDurationMs: 0,
  classifications: {},
  errors: {},
  lastUpdated: new Date().toISOString()
};

const metrics = {
  async recordProcessingTime(documentId, durationMs) {
    console.log(`[METRIC] Processing time for ${documentId}: ${durationMs}ms`);

    inMemoryMetrics.totalProcessed += 1;
    inMemoryMetrics.totalDurationMs += durationMs;
    inMemoryMetrics.avgProcessingDurationMs =
      inMemoryMetrics.totalProcessed > 0
        ? inMemoryMetrics.totalDurationMs / inMemoryMetrics.totalProcessed
        : 0;
    inMemoryMetrics.lastUpdated = new Date().toISOString();

    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      try {
        await cloudwatch.putMetricData({
          Namespace: 'DocProcessing',
          MetricData: [{
            MetricName: 'ProcessingDuration',
            Value: durationMs,
            Unit: 'Milliseconds',
            Dimensions: [{ Name: 'Service', Value: 'DocumentProcessor' }]
          }]
        }).promise();
      } catch (err) {
        console.warn('[METRIC] CloudWatch publish skipped/failed:', err.message);
      }
    }
  },

  async recordClassification(classification) {
    console.log(`[METRIC] Classification: ${classification}`);

    inMemoryMetrics.successful += 1;
    inMemoryMetrics.classifications[classification] =
      (inMemoryMetrics.classifications[classification] || 0) + 1;
    inMemoryMetrics.lastUpdated = new Date().toISOString();

    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      try {
        await cloudwatch.putMetricData({
          Namespace: 'DocProcessing',
          MetricData: [{
            MetricName: 'DocumentClassified',
            Value: 1,
            Unit: 'Count',
            Dimensions: [{ Name: 'Classification', Value: classification }]
          }]
        }).promise();
      } catch (err) {
        console.warn('[METRIC] CloudWatch publish skipped/failed:', err.message);
      }
    }
  },

  async recordError(errorType) {
    console.log(`[METRIC] Error: ${errorType}`);

    inMemoryMetrics.failed += 1;
    inMemoryMetrics.errors[errorType] = (inMemoryMetrics.errors[errorType] || 0) + 1;
    inMemoryMetrics.lastUpdated = new Date().toISOString();

    if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID) {
      try {
        await cloudwatch.putMetricData({
          Namespace: 'DocProcessing',
          MetricData: [{
            MetricName: 'ProcessingErrors',
            Value: 1,
            Unit: 'Count',
            Dimensions: [{ Name: 'ErrorType', Value: errorType }]
          }]
        }).promise();
      } catch (err) {
        console.warn('[METRIC] CloudWatch publish skipped/failed:', err.message);
      }
    }
  },

  getAggregatedMetrics() {
    const total = inMemoryMetrics.totalProcessed || (inMemoryMetrics.successful + inMemoryMetrics.failed);
    const successRate = total > 0 ? Math.round((inMemoryMetrics.successful / total) * 100) : 100;

    return {
      totalProcessed: total,
      successful: inMemoryMetrics.successful,
      failed: inMemoryMetrics.failed,
      successRate,
      avgProcessingDurationMs: inMemoryMetrics.avgProcessingDurationMs,
      classifications: inMemoryMetrics.classifications,
      errors: inMemoryMetrics.errors,
      lastUpdated: inMemoryMetrics.lastUpdated,
      environment: process.env.NODE_ENV || 'development'
    };
  }
};

module.exports = metrics;
