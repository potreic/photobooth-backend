const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const photoRoutes = require('./routes/photo.routes');
const roomManager = require('./utils/roomManager');

const app = express();
const server = http.createServer(app);

// Set Up Frontend
app.use(express.static(path.join(__dirname, '../../photobooth-frontend')));

// Set up Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware to parse JSON bodies
app.use(express.json());

// Use the photo routes
app.use('/', photoRoutes);

// Pass the io object to the room manager
roomManager.init(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});