// Transcription service abstraction. Choose one provider by uncommenting and wiring keys.

// Option A: OpenAI Whisper API (server-side transcription)
// import OpenAI from 'openai';
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function transcribeWithWhisper(filePath) {
//   const response = await openai.audio.transcriptions.create({
//     file: fs.createReadStream(filePath),
//     model: 'whisper-1',
//     response_format: 'verbose_json'
//   });
//   return response.text;
// }

// Option B: Google Cloud Speech-to-Text
// import speech from '@google-cloud/speech';
// const speechClient = new speech.SpeechClient();
// export async function transcribeWithGoogle(filePath) {
//   const audioBytes = await fs.promises.readFile(filePath);
//   const request = {
//     audio: { content: audioBytes.toString('base64') },
//     config: { languageCode: 'en-US', enableAutomaticPunctuation: true },
//   };
//   const [response] = await speechClient.recognize(request);
//   return response.results.map(r => r.alternatives?.[0]?.transcript).join('\n');
// }

import fs from 'fs';
import { AssemblyAI } from 'assemblyai';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';

// Build a cinematic-style transcript from word timings and tags
export function formatCinematicTranscript({ words = [], text = '' }) {
  // If no word timings are available, fallback to simple tag conversion on full text
  const convertStageTags = (s) => {
    return s
      .replace(/\[(laughter)\]/gi, '(laughs)')
      .replace(/\[(music)\]/gi, '(music)')
      .replace(/\[(applause)\]/gi, '(applause)')
      .replace(/\[(sigh)\]/gi, '(sighs)')
      .replace(/\[(silence)\]/gi, '(pause)')
      // Generic: [word(s)] -> (word(s))
      .replace(/\[([^\]]+)\]/g, (_, inner) => `(${inner})`)
      // Normalize spaced dashes from some ASR outputs
      .replace(/\s—\s/g, ' — ')
      .replace(/\s-\s/g, ' - ');
  };

  if (!Array.isArray(words) || words.length === 0) {
    return convertStageTags(text || '');
  }

  // Helpers for assembling tokens without adding spaces before punctuation
  const noSpaceBefore = new Set([',', '.', '!', '?', ':', ';', ')', ']', '}', '”', "'", '…']);
  const noSpaceAfter = new Set(['(', '[', '{', '“']);

  const pushToken = (arr, token) => {
    if (arr.length === 0) {
      arr.push(token);
      return;
    }
    const prev = arr[arr.length - 1];
    if (noSpaceBefore.has(token)) {
      arr[arr.length - 1] = prev + token; // attach punctuation to previous
    } else if (noSpaceAfter.has(prev.slice(-1))) {
      arr[arr.length - 1] = prev + token; // e.g., "(word"
    } else {
      arr.push(token);
    }
  };

  // Simple paragraph format - no line breaks or stanza breaks
  let tokens = [];

  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const token = w.text || '';
    if (!token) continue;

    // Stage tag tokens occasionally appear as [laughter] in words
    const converted = convertStageTags(token);
    pushToken(tokens, converted);
  }

  // Final pass: normalize em dashes and cut-offs hinted by ASR
  const finalText = tokens
    .join(' ')
    .replace(/\b([A-Za-z]+)\s?-{2,}\b/g, '$1—') // convert stretched to em dash
    .replace(/\s?-\s?$/g, ' -') // preserve cut-off at end of word
    .trim();

  return finalText;
}

export async function mockLiveTranscriptEmitter({ socket, namespace = 'transcription' }) {
  // Emits mock SRT-like segments to simulate real-time transcription
  const lines = [
    'Thank you for calling the digital phone booth.',
    'Please leave your message after the tone.',
    'Your words are being transcribed in real time.',
  ];
  let startMs = 0;
  let index = 1;
  for (const text of lines) {
    const durationMs = 1600;
    const endMs = startMs + durationMs;
    await new Promise((r) => setTimeout(r, 700));
    socket.emit(namespace, {
      index,
      startMs,
      endMs,
      text,
    });
    index += 1;
    startMs = endMs + 200;
  }
  socket.emit(namespace, { done: true });
}

// Language detection using AssemblyAI
export async function detectLanguageWithAssemblyAI(filePath) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ASSEMBLYAI_API_KEY');
  }
  const client = new AssemblyAI({ apiKey });

  // First, detect the language
  const transcript = await client.transcripts.transcribe({
    audio: fs.createReadStream(filePath),
    language_detection: true,
    punctuate: false,
    format_text: false,
  });

  if (transcript.status !== 'completed') {
    throw new Error(`Language detection failed with status: ${transcript.status}`);
  }

  return {
    detected_language: transcript.language_code || 'en',
    confidence: transcript.language_confidence || 0.5,
    raw: transcript,
  };
}

// Prerecorded transcription using AssemblyAI with automatic language detection
export async function transcribeFileWithAssemblyAI(filePath, {
  language_code = null, // null means auto-detect
  punctuate = true,
  format_text = true,
  word_boost = [],
  boost_param = 'default',
  auto_detect_language = true,
  speaker_labels = false,
  sentiment_analysis = false,
  auto_highlights = false,
  iab_categories = false,
  entity_detection = false,
} = {}) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ASSEMBLYAI_API_KEY');
  }
  const client = new AssemblyAI({ apiKey });

  let detectedLanguage = language_code;
  let languageConfidence = 1.0;

  // Build request: use inline language_detection when no language_code provided
  const requestBody = {
    audio: fs.createReadStream(filePath),
    punctuate,
    format_text,
    word_boost,
    boost_param,
    speaker_labels,
    sentiment_analysis,
    auto_highlights,
    iab_categories,
    entity_detection,
  };

  const shouldAutoDetect = !language_code && auto_detect_language;
  if (shouldAutoDetect) {
    requestBody.language_detection = true;
  } else if (language_code) {
    requestBody.language_code = language_code;
  }

  // Transcribe (AssemblyAI will detect language when requested)
  const transcript = await client.transcripts.transcribe(requestBody);

  if (transcript.status !== 'completed') {
    throw new Error(`Transcription failed with status: ${transcript.status}`);
  }

  // Read detected language (if auto-detected)
  if (shouldAutoDetect) {
    detectedLanguage = transcript.language_code || detectedLanguage || 'en';
    languageConfidence = transcript.language_confidence ?? languageConfidence;
    console.log(`Detected language (inline): ${detectedLanguage} (confidence: ${languageConfidence})`);
  }

  // Compute per-word loudness (RMS dBFS) and tag LOUD/soft
  let wordsWithLoudness = transcript.words || [];
  try {
    wordsWithLoudness = await annotateWordLoudness(filePath, wordsWithLoudness);
  } catch (e) {
    console.warn('Loudness annotation failed:', e?.message || e);
  }

  return {
    text: transcript.text || '',
    words: wordsWithLoudness,
    confidence: transcript.confidence,
    detected_language: detectedLanguage,
    language_confidence: languageConfidence,
    // Optional enriched outputs when enabled above
    utterances: transcript.utterances || [], // speaker-labelled segments
    sentiment_analysis_results: transcript.sentiment_analysis_results || [],
    auto_highlights_result: transcript.auto_highlights_result || null,
    iab_categories_result: transcript.iab_categories_result || null,
    entities: transcript.entities || [],
    raw: transcript,
  };
}

// Live transcription wiring with AssemblyAI Realtime API via Socket.IO
export async function startAssemblyAIRealtimeSession({ 
  socket, 
  namespace = 'transcription', 
  sampleRate = 16000,
  language_code = null, // null means auto-detect
  auto_detect_language = true 
}) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ASSEMBLYAI_API_KEY');
  }
  const client = new AssemblyAI({ apiKey });

  // Configure transcriber with language detection if needed
  const transcriberConfig = { sampleRate };
  if (language_code) {
    transcriberConfig.language_code = language_code;
  } else if (auto_detect_language) {
    transcriberConfig.language_detection = true;
  }

  const transcriber = client.realtime.transcriber(transcriberConfig);
  await transcriber.connect();

  const emit = (event, payload) => socket.emit(namespace, payload ?? event);

  transcriber.on('transcript', (data) => {
    // data contains { text, words, confidence, punctuated, message_type, language_code, language_confidence }
    // words array contains { text, start, end, confidence }
    emit('transcript', {
      text: data.text,
      words: data.words || [],
      confidence: data.confidence,
      punctuated: data.punctuated,
      message_type: data.message_type,
      detected_language: data.language_code,
      language_confidence: data.language_confidence
    });
  });
  transcriber.on('error', (err) => {
    emit('error', { message: err?.message || String(err) });
  });
  transcriber.on('close', () => {
    emit('done', { done: true });
  });

  // Wire socket events to send audio
  const audioListener = (base64Chunk) => {
    try {
      const buf = Buffer.from(base64Chunk, 'base64');
      transcriber.sendAudio(buf);
    } catch (e) {
      emit('error', { message: 'Invalid audio chunk' });
    }
  };
  socket.on('realtime-audio', audioListener);

  const stopListener = async () => {
    try {
      await transcriber.close();
    } catch {}
    socket.off('realtime-audio', audioListener);
    socket.off('realtime-stop', stopListener);
    emit('done', { done: true });
  };
  socket.on('realtime-stop', stopListener);

  return transcriber;
}



// --- Loudness analysis utilities ---
// Decode audio to mono 16kHz 16-bit PCM and compute RMS for word windows
async function annotateWordLoudness(filePath, words) {
  if (!ffmpegPath) throw new Error('ffmpeg-static not available');
  if (!Array.isArray(words) || words.length === 0) return words;

  const sampleRate = 16000; // Hz
  const ffArgs = [
    '-i', filePath,
    '-ac', '1', // mono
    '-ar', String(sampleRate), // resample
    '-f', 's16le', // raw 16-bit PCM
    'pipe:1',
  ];

  const pcm = await readFfmpegPcm(ffmpegPath, ffArgs);
  if (!pcm || pcm.length === 0) return words;

  // Pre-compute whole-file RMS distribution to set adaptive thresholds
  const frameMs = 50; // 50ms window for baseline
  const frameSamples = Math.max(1, Math.floor((frameMs / 1000) * sampleRate));
  const baselineRms = [];
  for (let i = 0; i + frameSamples * 2 <= pcm.length; i += frameSamples * 2) {
    const rms = computeRmsFromPcm(pcm, i, frameSamples);
    baselineRms.push(rms);
  }
  const { mean, std } = meanStd(baselineRms);

  // Convert RMS to dBFS helper
  const toDb = (rms) => (rms <= 0 ? -Infinity : 20 * Math.log10(rms / 32768));

  // Adaptive thresholds using both absolute dBFS and baseline z-scores
  const loudThreshDb = Math.max(-24, toDb(mean + 1 * std));
  const veryLoudThreshDb = Math.max(-18, toDb(mean + 2 * std));
  const softThreshDb = Math.min(-38, toDb(Math.max(1, mean - 1 * std)));

  const annotated = words.map((w, idx) => {
    const startMs = Number.isFinite(w.start) ? w.start : null;
    const endMs = Number.isFinite(w.end) ? w.end : null;
    if (startMs == null || endMs == null || endMs <= startMs) {
      return { ...w };
    }
    const startSample = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
    const endSample = Math.min(Math.floor((endMs / 1000) * sampleRate), pcm.length / 2);
    const sampleCount = Math.max(1, endSample - startSample);
    const byteOffset = startSample * 2;
    const rms = computeRmsFromPcm(pcm, byteOffset, sampleCount);
    const loudnessDb = toDb(rms);

    // Compute z-score relative to global baseline
    const zScore = std > 0 ? (rms - mean) / std : 0;

    // Optional: consider neighbor smoothing to avoid single-word spikes
    const prev = words[idx - 1];
    const next = words[idx + 1];
    const neighborDb = [];
    if (prev && Number.isFinite(prev.start) && Number.isFinite(prev.end) && prev.end > prev.start) {
      const pStart = Math.max(0, Math.floor((prev.start / 1000) * sampleRate));
      const pEnd = Math.min(Math.floor((prev.end / 1000) * sampleRate), pcm.length / 2);
      neighborDb.push(toDb(computeRmsFromPcm(pcm, pStart * 2, Math.max(1, pEnd - pStart))));
    }
    if (next && Number.isFinite(next.start) && Number.isFinite(next.end) && next.end > next.start) {
      const nStart = Math.max(0, Math.floor((next.start / 1000) * sampleRate));
      const nEnd = Math.min(Math.floor((next.end / 1000) * sampleRate), pcm.length / 2);
      neighborDb.push(toDb(computeRmsFromPcm(pcm, nStart * 2, Math.max(1, nEnd - nStart))));
    }
    const localRefDb = neighborDb.length ? (neighborDb.reduce((a, b) => a + b, 0) / neighborDb.length) : loudThreshDb;
    const relativeBoostDb = Number.isFinite(loudnessDb) && Number.isFinite(localRefDb) ? (loudnessDb - localRefDb) : 0;

    let loudnessTag = null;
    if (Number.isFinite(loudnessDb)) {
      if (loudnessDb >= veryLoudThreshDb || zScore >= 2 || relativeBoostDb >= 6) {
        loudnessTag = 'VERY_LOUD';
      } else if (loudnessDb >= loudThreshDb || zScore >= 1 || relativeBoostDb >= 3) {
        loudnessTag = 'LOUD';
      } else if (loudnessDb <= softThreshDb || zScore <= -1) {
        loudnessTag = 'soft';
      }
    }

    // Emphasis score combines absolute, z-score, and local relative boost (0..1+)
    const emphasisScore = Math.max(0, (
      (Number.isFinite(loudnessDb) ? (loudnessDb - softThreshDb) / Math.max(1, veryLoudThreshDb - softThreshDb) : 0)
    ) + Math.max(0, zScore / 3) + Math.max(0, relativeBoostDb / 12));

    return { ...w, loudnessDb, loudnessTag, emphasisScore: Number.isFinite(emphasisScore) ? Number(emphasisScore.toFixed(3)) : 0 };
  });

  return annotated;
}

function readFfmpegPcm(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let errBuf = '';
    proc.stdout.on('data', (d) => chunks.push(d));
    proc.stderr.on('data', (d) => {
      errBuf += d.toString();
    });
    proc.on('error', (e) => reject(e));
    proc.on('close', (code) => {
      if (code !== 0 && chunks.length === 0) {
        return reject(new Error(`ffmpeg exited with code ${code}: ${errBuf.split('\n').slice(-5).join('\n')}`));
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

// Compute RMS from a segment of mono s16le PCM
function computeRmsFromPcm(pcmBuf, byteOffset, sampleCount) {
  const endByte = Math.min(pcmBuf.length, byteOffset + sampleCount * 2);
  if (endByte <= byteOffset) return 0;
  let sumSquares = 0;
  let n = 0;
  for (let i = byteOffset; i + 1 < endByte; i += 2) {
    const sample = pcmBuf.readInt16LE(i);
    sumSquares += sample * sample;
    n += 1;
  }
  if (n === 0) return 0;
  const meanSquare = sumSquares / n;
  const rms = Math.sqrt(meanSquare);
  return rms;
}

function meanStd(values) {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

