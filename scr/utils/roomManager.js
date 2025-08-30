const { v4: uuidv4 } = require('uuid');

let io;
const rooms = {};

exports.init = (socketIoInstance) => {
    io = socketIoInstance;
    io.on('connection', (socket) => {
        console.log(`User connected with ID: ${socket.id}`);

        socket.on('create-room', () => {
            const roomId = uuidv4().split('-')[0]; // Use a shorter UUID for readability
            socket.join(roomId);
            rooms[roomId] = { users: [socket.id], photos: [], timer: null, sessionStarted: false };
            socket.emit('room-created', roomId);
            console.log(`User ${socket.id} created and joined room ${roomId}`);
        });

        socket.on('join-room', (roomId) => {
            const room = rooms[roomId];
            if (!room || room.users.length >= 2) {
                socket.emit('room-full');
                return;
            }

            socket.join(roomId);
            room.users.push(socket.id);
            console.log(`User ${socket.id} joined room ${roomId}`);

            // Notify both users that they are connected
            if (room.users.length === 2) {
                io.to(roomId).emit('partner-connected');
            }
        });

        socket.on('start-session', (roomId) => {
            const room = rooms[roomId];
            if (!room || room.sessionStarted) {
                return;
            }
            room.sessionStarted = true;
            io.to(roomId).emit('session-started');
            console.log(`Session started in room ${roomId}. Starting 5-minute timer.`);

            // Start the 5-minute timer
            room.timer = setTimeout(() => {
                io.to(roomId).emit('session-expired');
                delete rooms[roomId];
                console.log(`Room ${roomId} session expired and was cleaned up.`);
            }, 5 * 60 * 1000); // 5 minutes in milliseconds
        });

        // WebRTC signaling
        socket.on('offer', (data) => socket.to(data.roomId).emit('offer', data));
        socket.on('answer', (data) => socket.to(data.roomId).emit('answer', data));
        socket.on('ice-candidate', (data) => socket.to(data.roomId).emit('ice-candidate', data));

        socket.on('disconnect', () => {
            for (const roomId in rooms) {
                if (rooms[roomId].users.includes(socket.id)) {
                    io.to(roomId).emit('partner-disconnected');
                    clearTimeout(rooms[roomId].timer);
                    delete rooms[roomId];
                    console.log(`Room ${roomId} was cleaned up due to a user disconnecting.`);
                    break;
                }
            }
        });
    });
};