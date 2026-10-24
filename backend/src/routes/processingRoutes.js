const express = require('express');
const router = express.Router();
const processingController = require('../controllers/processingController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/status/:id', processingController.getStatus);
router.post('/retry/:id', processingController.retryProcessing);
router.get('/events/:id', processingController.getEventHistory);

module.exports = router;
