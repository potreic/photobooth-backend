const Jimp = require('jimp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../uploads');

exports.combinePhotos = async (photos) => {
    // A photo strip will be 500px wide and 1500px tall (3 photos at 500x500 each)
    const finalStrip = new Jimp(500, 1500, 0xFFFFFFFF); 
    
    // An array to store all loaded Jimp images
    const loadedImages = await Promise.all(photos.map(photo => Jimp.read(photo.path)));

    // Composite each image onto the final strip
    for (let i = 0; i < loadedImages.length; i++) {
        const image = loadedImages[i];
        
        // Resize the image to fit the strip
        image.resize(500, 500); 
        
        // Composite the image onto the final strip at the correct position
        finalStrip.composite(image, 0, i * 500); 
    }

    const finalFilename = `${uuidv4()}.jpeg`;
    const finalFilePath = path.join(uploadDir, finalFilename);
    await finalStrip.writeAsync(finalFilePath);

    return finalFilename;
};