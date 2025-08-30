const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Set up Socket.IO with the HTTP server
const io = new Server(server, {
    cors: {
        origin: "*", // Allows all origins for simplicity during development
        methods: ["GET", "POST"]
    }
});

// Define a simple route to make sure the server is working
app.get('/', (req, res) => {
  res.send('<h1>Photo Booth Backend is Running!</h1>');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Set a port for the server to listen on
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});