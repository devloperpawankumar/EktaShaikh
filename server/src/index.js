import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import messagesRouter from './routes/messages.js';
import assemblyaiRouter from './routes/assemblyai.js';
import adminRouter from './routes/admin.js';
import { mockLiveTranscriptEmitter, startAssemblyAIRealtimeSession } from './services/transcription.js';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Static serving for uploaded audio with proper headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    // Set CORS headers for audio files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set proper content type for audio files
    if (path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'audio/webm');
    } else if (path.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (path.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (path.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (path.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    } else if (path.endsWith('.mov')) {
      // .mov files can contain audio, serve as audio/mp4
      res.setHeader('Content-Type', 'audio/mp4');
    }
  }
}));

// Routes
app.use('/api/messages', messagesRouter);
app.use('/api/assemblyai', assemblyaiRouter);
app.use('/api/admin', adminRouter);

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({ 
      status: 'ok', 
      database: states[dbState],
      readyState: dbState
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Socket.IO connection for realtime transcription
io.on('connection', (socket) => {
  socket.on('start-transcription-mock', async () => {
    await mockLiveTranscriptEmitter({ socket, namespace: 'transcription' });
  });
  socket.on('start-transcription', async ({ sampleRate } = {}) => {
    try {
      await startAssemblyAIRealtimeSession({ socket, namespace: 'transcription', sampleRate: sampleRate || 16000 });
    } catch (e) {
      socket.emit('transcription', { error: e?.message || 'Failed to start realtime session' });
    }
  });
  socket.on('disconnect', () => {});
});

// Mongo connection and server start
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_phone_booth';
const PORT = process.env.PORT || 4000;

mongoose.connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

export default app;


