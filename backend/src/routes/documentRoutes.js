const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { authMiddleware } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authMiddleware);

router.post('/upload', upload.single('document'), documentController.upload);
router.get('/', documentController.getAll);
router.get('/:id', documentController.getById);
router.delete('/:id', documentController.delete);
router.get('/:id/download', documentController.download);

module.exports = router;
