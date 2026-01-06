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

















// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// const http = require('http');
// const { Server } = require('socket.io');
// const { initializeSocket } = require('./config/socket');
// const { getProfileDetails } = require('./helpers/getProfileDetails');

// const routes = require('./routes');

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

// // Initialize Socket.io
// initializeSocket(server);

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use('/api', routes);

// // Static files
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// app.use((req, res, next) => {
//     req.io = io;
//     next();
// });

// //////// Socket.io connection handling

// io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);
//     socket.on("join", ({ userId, company_id }) => {
//         // ✅ Save values on socket instance
//         socket.userId = userId;
//         socket.company_id = company_id;

//         socket.join(userId?.toString());
//         socket.join(company_id?.toString());
//         console.log(`User ${userId} joined personal & company ${company_id} rooms`);
//     });

//     socket.on("getProfile", async (payload) => {
//         const result = await getProfileDetails(payload);
//         socket.emit("profileResponse", result);
//     });
//     socket.on("disconnect", () => {
//     });
// });
// module.exports = server;




const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { getProfileDetails } = require('./helpers/getProfileDetails');
const routes = require('./routes');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/constants');

const app = express();
const server = http.createServer(app);

// ✅ Create io instance
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

///// ✅ Attach io to requests if needed
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ///✅ API Routes
app.use('/api', routes);

// ///✅ Static Files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ////✅ Socket.IO Events
io.on("connection", (socket) => {
    try {
        // 🔹 Extract and verify token
        const token = socket.handshake.auth?.token;

        if (!token) {
            console.log("❌ No token provided for socket");
            socket.disconnect(true);
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // attach user info to socket
        console.log("✅ Socket authenticated:", decoded);

        // 🔹 Log successful connection
        console.log(`User connected: socket.id=${socket.id}, user_id=${decoded.user_id}`);

        // 🔹 Join personal room for direct events
        socket.on("join", () => {
            const userId = socket.user?.user_id;
            if (userId) {
                socket.join(userId.toString());
                console.log(`✅ User ${userId} joined personal room`);
            }
        });

        // 🔹 Get Profile
        socket.on("getProfile", async () => {
            try {
                const payloadNew = { userId: socket.user?.user_id };
                const result = await getProfileDetails(payloadNew);
                socket.emit("profileResponse", result);
            } catch (err) {
                console.error("❌ Error getting profile:", err);
                socket.emit("profileResponse", { error: "Failed to fetch profile" });
            }
        });

        // 🔹 Handle disconnection
        socket.on("disconnect", (reason) => {
            console.log(`🔌 User disconnected: socket.id=${socket.id}, reason=${reason}`);
        });

    } catch (err) {
        console.error("❌ Authentication failed:", err.message);
        socket.disconnect(true);
    }
})

// ✅ Export the HTTP server (not app)
module.exports = server;
