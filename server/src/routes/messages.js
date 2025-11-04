import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import VoiceMessage from '../models/VoiceMessage.js';
import { transcribeFileWithAssemblyAI, detectLanguageWithAssemblyAI, formatCinematicTranscript } from '../services/transcription.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const router = express.Router();

// Ensure uploads folder exists
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({ storage });

// Configure ffmpeg binary path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// List messages (with transcript preview)
router.get('/', async (req, res) => {
  try {
    const { type, limit } = req.query;
    const filter = type ? { type } : {};
    const queryLimit = limit ? Math.min(parseInt(limit, 10), 100) : 100;
    const items = await VoiceMessage.find(filter).sort({ createdAt: -1 }).limit(queryLimit).lean();
    res.json(items);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
  }
});

// Create message via upload
router.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, durationSeconds, transcript, type, phoneNumber, autoTranscribe } = req.body;

  const originalFilename = req.file.filename;
  const originalPath = path.resolve('uploads', originalFilename);
  let finalFilename = originalFilename;

  // If uploaded format is potentially unsupported (e.g., .webm/.ogg), create an MP3 alongside and prefer it
  const ext = (path.extname(originalFilename) || '').toLowerCase();
  const shouldTranscodeToMp3 = ['.webm', '.ogg', '.mkv', '.mov'].includes(ext);
  if (shouldTranscodeToMp3) {
    try {
      const mp3Filename = `${path.basename(originalFilename, ext)}.mp3`;
      const mp3Path = path.resolve('uploads', mp3Filename);
      // Only transcode if target doesn't exist yet
      if (!fs.existsSync(mp3Path)) {
        await new Promise((resolve, reject) => {
          ffmpeg(originalPath)
            .audioCodec('libmp3lame')
            .format('mp3')
            .on('error', (err) => reject(err))
            .on('end', () => resolve())
            .save(mp3Path);
        });
      }
      finalFilename = mp3Filename;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('MP3 transcode failed, keeping original file:', err);
    }
  }

  const audioUrl = `/uploads/${finalFilename}`;
  const doc = await VoiceMessage.create({
    title: title || 'Untitled Message',
    audioUrl,
    durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
    transcript: transcript || '',
    type: type || 'user',
    phoneNumber: phoneNumber || undefined,
  });

  // Auto-transcribe if requested (default for admin uploads)
  if (autoTranscribe !== 'false' && type === 'dial') {
    try {
      const filePath = path.resolve('uploads', req.file.filename);
      const result = await transcribeFileWithAssemblyAI(filePath, {
        auto_detect_language: true,
        speaker_labels: true,
        sentiment_analysis: true,
        auto_highlights: true,
        iab_categories: true,
        entity_detection: true,
      });
      // Apply cinematic formatting
      doc.transcript = formatCinematicTranscript({ words: result.words, text: result.text });
      doc.words = result.words || []; // Save word-level timing data
      doc.detected_language = result.detected_language || 'en';
      doc.language_confidence = result.language_confidence || 0.5;
      // Optionally persist enriched fields if you need them later
      doc.utterances = result.utterances || [];
      doc.sentiment_analysis_results = result.sentiment_analysis_results || [];
      doc.auto_highlights_result = result.auto_highlights_result || null;
      doc.iab_categories_result = result.iab_categories_result || null;
      doc.entities = result.entities || [];
      await doc.save();
      console.log(`Auto-transcribed with detected language: ${result.detected_language} (confidence: ${result.language_confidence})`);
    } catch (err) {
      console.error('Auto-transcription failed:', err);
      // Don't fail the upload, just log the error
    }
  }

  res.status(201).json(doc);
});

// Upload dial recording (for admin use)
router.post('/upload-dial', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, durationSeconds, transcript, phoneNumber } = req.body;

  const originalFilename = req.file.filename;
  const originalPath = path.resolve('uploads', originalFilename);
  let finalFilename = originalFilename;
  const ext = (path.extname(originalFilename) || '').toLowerCase();
  const shouldTranscodeToMp3 = ['.webm', '.ogg', '.mkv', '.mov'].includes(ext);
  if (shouldTranscodeToMp3) {
    try {
      const mp3Filename = `${path.basename(originalFilename, ext)}.mp3`;
      const mp3Path = path.resolve('uploads', mp3Filename);
      if (!fs.existsSync(mp3Path)) {
        await new Promise((resolve, reject) => {
          ffmpeg(originalPath)
            .audioCodec('libmp3lame')
            .format('mp3')
            .on('error', (err) => reject(err))
            .on('end', () => resolve())
            .save(mp3Path);
        });
      }
      finalFilename = mp3Filename;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('MP3 transcode failed for dial upload, keeping original:', err);
    }
  }

  const audioUrl = `/uploads/${finalFilename}`;
  const doc = await VoiceMessage.create({
    title: title || 'Dial Recording',
    audioUrl,
    durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
    transcript: transcript || '',
    type: 'dial',
    phoneNumber: phoneNumber || undefined,
  });

  res.status(201).json(doc);
});

// On-the-fly stream transcode to MP3 for unsupported formats
// GET /api/messages/stream?file=/uploads/<filename>
router.get('/stream', async (req, res) => {
  try {
    const fileParam = req.query.file;
    if (!fileParam || !fileParam.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Invalid file parameter' });
    }
    const requestedPath = path.resolve('.', fileParam.replace(/^\//, ''));
    if (!requestedPath.startsWith(path.resolve('uploads'))) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(requestedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream via ffmpeg transcoding pipeline
    ffmpeg(requestedPath)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('Stream transcode error:', err);
        if (!res.headersSent) {
          res.status(500).end('Transcode failed');
        } else {
          try { res.destroy(); } catch {}
        }
      })
      .pipe(res, { end: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Stream endpoint error:', err);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// Retrieve one
router.get('/:id', async (req, res) => {
  const item = await VoiceMessage.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Test AssemblyAI API key with a simple request
router.get('/transcription/test', async (req, res) => {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return res.json({ 
        status: 'error', 
        message: 'ASSEMBLYAI_API_KEY not configured'
      });
    }

    // Test with a real audio file from your uploads
    const testAudioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';
    
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: testAudioUrl,
        language_code: 'en'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      res.json({ 
        status: 'success', 
        message: 'AssemblyAI API key is working!',
        transcriptId: result.id,
        status: result.status
      });
    } else {
      res.json({ 
        status: 'error', 
        message: `API Error: ${result.error || 'Unknown error'}`,
        details: result
      });
    }
  } catch (err) {
    res.json({ 
      status: 'error', 
      message: `Test failed: ${err.message}`
    });
  }
});

// Check AssemblyAI service status
router.get('/transcription/status', async (req, res) => {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return res.json({ 
        status: 'error', 
        message: 'ASSEMBLYAI_API_KEY not configured',
        configured: false 
      });
    }

    // Simple validation - check if API key format looks correct
    // AssemblyAI has both old format (32 chars) and new format (sk-...)
    const isValidOldFormat = apiKey.length === 32 && /^[a-f0-9]+$/.test(apiKey);
    const isValidNewFormat = apiKey.startsWith('sk-') && apiKey.length > 20;
    
    if (!isValidOldFormat && !isValidNewFormat) {
      return res.json({ 
        status: 'error', 
        message: 'Invalid AssemblyAI API key format',
        configured: true,
        error: 'API key should be 32 characters (old format) or start with "sk-" (new format)'
      });
    }

    // Test with a simple HTTP request to AssemblyAI API
    try {
      const response = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: 'https://example.com/test.mp3' // This will fail but validate the API key
        })
      });

      if (response.status === 401) {
        return res.json({ 
          status: 'error', 
          message: 'Invalid AssemblyAI API key',
          configured: true,
          error: 'API key authentication failed'
        });
      }

      // If we get here, the API key is valid (even if the request fails for other reasons)
      res.json({ 
        status: 'ok', 
        message: 'AssemblyAI is configured and working',
        configured: true,
        note: 'API key validated successfully',
        keyFormat: isValidOldFormat ? 'legacy' : 'new'
      });

    } catch (apiError) {
      // Network or other errors - assume API key is valid if format is correct
      res.json({ 
        status: 'ok', 
        message: 'AssemblyAI API key format is valid',
        configured: true,
        note: 'Unable to test API connection, but key format is correct'
      });
    }
  } catch (err) {
    res.json({ 
      status: 'error', 
      message: `AssemblyAI error: ${err.message}`,
      configured: true,
      error: err.message
    });
  }
});

// Transcribe an existing uploaded message using AssemblyAI and save transcript
router.post('/:id/transcribe', async (req, res) => {
  try {
    const item = await VoiceMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (!item.audioUrl) return res.status(400).json({ error: 'No audioUrl to transcribe' });

    // audioUrl format: /uploads/<filename>
    const filename = path.basename(item.audioUrl);
    const filePath = path.resolve('uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file missing on server' });
    }

    const result = await transcribeFileWithAssemblyAI(filePath, {
      language_code: req.body.language_code || null, // null means auto-detect
      auto_detect_language: req.body.auto_detect_language !== false,
      speaker_labels: req.body.speaker_labels !== false,
      sentiment_analysis: req.body.sentiment_analysis !== false,
      auto_highlights: req.body.auto_highlights !== false,
      iab_categories: req.body.iab_categories !== false,
      entity_detection: req.body.entity_detection !== false,
    });

    // Apply cinematic formatting
    item.transcript = formatCinematicTranscript({ words: result.words, text: result.text });
    item.words = result.words || []; // Save word-level timing data
    item.detected_language = result.detected_language || 'en';
    item.language_confidence = result.language_confidence || 0.5;
    // Persist enriched fields
    item.utterances = result.utterances || [];
    item.sentiment_analysis_results = result.sentiment_analysis_results || [];
    item.auto_highlights_result = result.auto_highlights_result || null;
    item.iab_categories_result = result.iab_categories_result || null;
    item.entities = result.entities || [];
    await item.save();

    res.json({
      id: item._id,
      transcript: item.transcript,
      words: item.words,
      confidence: result.confidence,
      detected_language: result.detected_language,
      language_confidence: result.language_confidence,
      utterances: result.utterances,
      sentiment_analysis_results: result.sentiment_analysis_results,
      auto_highlights_result: result.auto_highlights_result,
      iab_categories_result: result.iab_categories_result,
      entities: result.entities,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Transcription error', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Detect language of an existing uploaded message
router.post('/:id/detect-language', async (req, res) => {
  try {
    const item = await VoiceMessage.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (!item.audioUrl) return res.status(400).json({ error: 'No audioUrl to analyze' });

    // audioUrl format: /uploads/<filename>
    const filename = path.basename(item.audioUrl);
    const filePath = path.resolve('uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file missing on server' });
    }

    const result = await detectLanguageWithAssemblyAI(filePath);

    // Update the document with language information
    item.detected_language = result.detected_language;
    item.language_confidence = result.confidence;
    await item.save();

    res.json({
      id: item._id,
      detected_language: result.detected_language,
      language_confidence: result.confidence,
    });
  } catch (err) {
    console.error('Language detection error', err);
    res.status(500).json({ error: 'Language detection failed' });
  }
});

// Transcribe audio data (mock implementation)
router.post('/transcribe-audio', async (req, res) => {
  try {
    // This is a mock implementation
    // In production, you would integrate with a real transcription service like:
    // - OpenAI Whisper API
    // - Google Cloud Speech-to-Text
    // - Amazon Transcribe
    // - Deepgram
    
    // For now, return mock transcription
    const mockTranscriptions = [
      "This is a sample transcription.",
      "The audio is being processed in real time.",
      "Transcription service is working correctly.",
      "Audio content has been successfully transcribed.",
      "Live transcription is now active."
    ];
    
    const randomText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    
    res.json({ 
      text: randomText,
      confidence: 0.95,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;


