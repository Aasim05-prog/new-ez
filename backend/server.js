const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const setupChatSocket = require('./sockets/chatSocket');
const { setIO } = require('./controllers/notificationController');

// Load env vars
dotenv.config();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS — support multiple origins (dev + prod)
const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non‑browser requests
      try {
        const { hostname } = new URL(origin);
        const isAllowed = allowedOrigins.some(
          (allowed) => new URL(allowed).hostname === hostname
        );
        if (isAllowed) return callback(null, true);
      } catch (_) {}
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Connect to MongoDB before API requests. This works for both a long-running
// server and Vercel serverless functions, where modules can be reused.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Removed local static uploads serving as we now use Cloudinary

// Keep-alive route for Render
app.get('/ping', (req, res) => res.status(200).send('pong'));

const server = http.createServer(app);

if (!process.env.VERCEL) {
  // Setup Socket.io. Vercel serverless functions do not keep WebSocket
  // connections alive, so realtime chat runs only on long-running hosts.
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  // Initialize Socket.io chat handlers
  setupChatSocket(io);

  // Share io with notification controller for real-time pushes
  setIO(io);
}

// Basic Route
app.get('/', (req, res) => {
  res.send('EduMarket API is running...');
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  // Multer errors (file too large, wrong type, etc.)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 20MB.' });
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Handle 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}`);
  });
}

module.exports = app;
