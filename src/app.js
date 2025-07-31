const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initializeSocket } = require('./config/socket');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = server;