// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const { initializeSocket } = require('./config/socket');
// const routes = require('./routes');

// const app = express();
// const server = http.createServer(app);

// // Initialize Socket.io
// initializeSocket(server);

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use('/api', routes);

// // Static files
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// module.exports = server;

















const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { initializeSocket } = require('./config/socket');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
    req.io = io;
    next();
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("join", (userId) => {
        console.log("User joined room:", userId);
        socket.join(userId.toString());
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

module.exports = server;