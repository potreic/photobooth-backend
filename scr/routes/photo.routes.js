const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photo.controller');
const upload = require('../middleware/multer.middleware');

// Endpoint to process uploaded photos
router.post('/process-photos', upload.array('photos', 6), photoController.processPhotos);

// Endpoint to download the final photo strip
router.get('/download/:filename', photoController.downloadPhoto);

// Simple test route
router.get('/', (req, res) => {
  res.send('<h1>Photo Booth Backend is Running!</h1>');
});

module.exports = router;