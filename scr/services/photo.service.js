const Jimp = require('jimp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '../uploads');

exports.combinePhotos = async (photos) => {
    const finalStrip = await Jimp.read(500, 1500, 0xFFFFFFFF); // 500x1500 white background

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const image = await Jimp.read(photo.path);

        // Resize and composite the photo
        image.resize(500, Jimp.AUTO); 
        finalStrip.composite(image, 0, i * 250); 
    }

    const finalFilename = `${uuidv4()}.jpeg`;
    const finalFilePath = path.join(uploadDir, finalFilename);
    await finalStrip.writeAsync(finalFilePath);

    return finalFilename;
};