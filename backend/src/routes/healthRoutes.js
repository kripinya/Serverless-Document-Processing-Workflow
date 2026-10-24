const express = require('express');
const router = express.Router();
const metrics = require('../utils/metrics');

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    metrics: {
      ...metrics.getAggregatedMetrics(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
