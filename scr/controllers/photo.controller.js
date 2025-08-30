const photoService = require('../services/photo.service');
const path = require('path');
const fs = require('fs');

// Main controller to process uploaded photos
exports.processPhotos = async (req, res) => {
    try {
        const photos = req.files;
        const finalFilename = await photoService.combinePhotos(photos);

        // Send back the URL for the final photo strip
        res.json({ success: true, url: `/download/${finalFilename}` });

        // Cleanup the temporary files
        photos.forEach(photo => fs.unlinkSync(photo.path));

    } catch (error) {
        console.error("Error processing photos:", error);
        res.status(500).json({ success: false, message: "Error processing photos" });
    }
};

// Controller to handle photo downloads
exports.downloadPhoto = (req, res) => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            } else {
                // Delete the file after it's been downloaded
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
};