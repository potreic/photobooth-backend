const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const Jimp = require('jimp');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Set up Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Multer storage configuration for temporary files
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        cb(null, `${uuidv4()}${fileExt}`);
    }
});
const upload = multer({ storage: storage });

// A simple object to store active rooms and their photos
const rooms = {};

// Middleware to parse JSON bodies
app.use(express.json());

// Serve a simple landing page
app.get('/', (req, res) => {
  res.send('<h1>Photo Booth Backend is Running!</h1>');
});

// === SOCKET.IO LOGIC ===
io.on('connection', (socket) => {
  console.log(`User connected with ID: ${socket.id}`);

  // Handle user joining a room
  socket.on('join-room', (roomId) => {
    // Simple validation: only allow two users per room
    if (rooms[roomId] && Object.keys(rooms[roomId]).length >= 2) {
        socket.emit('room-full');
        return;
    }

    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) {
        rooms[roomId] = { users: [], photos: [], timer: null };
    }
    rooms[roomId].users.push(socket.id);

    // Notify other user that a new user has joined
    socket.to(roomId).emit('user-joined', socket.id);

    // If a room has two users, start the 5-minute timer
    if (rooms[roomId].users.length === 2) {
        io.to(roomId).emit('ready');
        console.log(`Room ${roomId} is ready. Starting 5-minute timer.`);
        rooms[roomId].timer = setTimeout(() => {
            io.to(roomId).emit('session-expired');
            delete rooms[roomId]; // Clean up the room data
            console.log(`Room ${roomId} session expired and was cleaned up.`);
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
    }
  });

  // === WebRTC Signaling Events ===
  // Relay 'offer', 'answer', and 'ice-candidate' events
  socket.on('offer', (data) => {
      socket.to(data.roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
      socket.to(data.roomId).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
      socket.to(data.roomId).emit('ice-candidate', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected with ID: ${socket.id}`);
    // Find and clean up the user's room
    for (const roomId in rooms) {
      if (rooms[roomId].users.includes(socket.id)) {
        io.to(roomId).emit('partner-disconnected');
        clearTimeout(rooms[roomId].timer);
        delete rooms[roomId]; // Clean up the room and its timer
        console.log(`Room ${roomId} was cleaned up due to a user disconnecting.`);
        break;
      }
    }
  });
});

// === PHOTO PROCESSING API ENDPOINT ===
app.post('/process-photos', upload.array('photos', 6), async (req, res) => {
    try {
        const photos = req.files;
        const finalStrip = await Jimp.read(500, 1500, 0xFFFFFFFF); // Create a white background strip 500x1500

        // Loop through the 6 photos and combine them vertically
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const image = await Jimp.read(photo.path);

            // Resize and composite the photo
            image.resize(500, Jimp.AUTO); 
            finalStrip.composite(image, 0, i * 250); // Each photo is placed 250px down
        }

        const finalFilePath = path.join(uploadDir, `${uuidv4()}.jpeg`);
        await finalStrip.writeAsync(finalFilePath);

        // Send back the URL for the final photo strip
        res.json({ success: true, url: `/download/${path.basename(finalFilePath)}` });

        // Cleanup the temporary files
        photos.forEach(photo => fs.unlinkSync(photo.path));

    } catch (error) {
        console.error("Error processing photos:", error);
        res.status(500).json({ success: false, message: "Error processing photos" });
    }
});

// Endpoint to download the photo strip
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            } else {
                // Optional: Delete the file after it's been downloaded
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});