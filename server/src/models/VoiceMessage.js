import mongoose from 'mongoose';

const VoiceMessageSchema = new mongoose.Schema(
  {
    title: { type: String },
    audioUrl: { type: String, required: true },
    durationSeconds: { type: Number },
    transcript: { type: String },
    ownerId: { type: String, index: true }, // anonymous or authenticated user id (from header/cookie)
    words: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Word-level timing data from AssemblyAI
    tags: { type: [String], default: [] },
    detected_language: { type: String }, // Detected language code (e.g., 'en', 'es', 'fr')
    language_confidence: { type: Number }, // Confidence score for language detection (0-1)
    // Optional custom thumbnail image for this recording
    imageUrl: { type: String },
    // Enriched AssemblyAI outputs
    utterances: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sentiment_analysis_results: { type: [mongoose.Schema.Types.Mixed], default: [] },
    auto_highlights_result: { type: mongoose.Schema.Types.Mixed, default: null },
    iab_categories_result: { type: mongoose.Schema.Types.Mixed, default: null },
    entities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdAt: { type: Date, default: Date.now },
    waveform: { type: [Number], default: [] },
    type: { type: String, enum: ['dial', 'user'], default: 'user' }, // 'dial' for dial recordings, 'user' for user recordings
    phoneNumber: { type: String }, // For dial recordings, store the dialed number
  },
  { versionKey: false }
);

export default mongoose.model('VoiceMessage', VoiceMessageSchema);


