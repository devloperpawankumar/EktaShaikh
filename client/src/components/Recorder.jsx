import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { appendSegmentText, srtToPlainText } from '../utils/srt.js'
import { withApiBase } from '../config.js'
import { getAuthHeaders } from '../utils/user.js'
import useWebSpeech from '../hooks/useWebSpeech.js'
import ThumbnailGenerator from './ThumbnailGenerator.jsx'

function TranscriptPreview({ text }) {
  const [expanded, setExpanded] = useState(false)
  const plain = srtToPlainText(text)
  if (!plain) return <div className="text-xs opacity-70">No transcript yet.</div>
  if (!expanded) {
    return (
      <div className="text-xs opacity-80">
        <div className="line-clamp-3">{plain}</div>
        <button className="mt-1 text-[11px] underline opacity-80" onClick={() => setExpanded(true)}>View full</button>
      </div>
    )
  }
  return (
    <div className="text-xs opacity-90 break-words">
      {plain}
      <button className="mt-2 block text-[11px] underline opacity-80" onClick={() => setExpanded(false)}>Show less</button>
    </div>
  )
}

export default function Recorder({ socket, onReady }) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('User Recording')
  const [userRecordings, setUserRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [readyToRecord, setReadyToRecord] = useState(false)
  const [showReadyToast, setShowReadyToast] = useState(false)
  const [saving, setSaving] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const { supported, listening, segments, start: startSTT, stop: stopSTT } = useWebSpeech({ lang: 'en-US', interimResults: true })
  const [blob, setBlob] = useState(null)
  const preSaveAudioRef = useRef(null)
  const preSaveUrl = useMemo(() => {
    if (!blob) return ''
    try {
      return URL.createObjectURL(blob)
    } catch {
      return ''
    }
  }, [blob])
  useEffect(() => {
    return () => {
      if (preSaveUrl) {
        try { URL.revokeObjectURL(preSaveUrl) } catch {}
      }
    }
  }, [preSaveUrl])
  const [levels, setLevels] = useState(new Array(24).fill(0))
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const animRef = useRef(null)
  const listRef = useRef(null)
  const aaiWsRef = useRef(null)
  const aaiAudioCtxRef = useRef(null)
  const aaiScriptNodeRef = useRef(null)
  const aaiSourceRef = useRef(null)
  const aaiBufferRef = useRef(new Int16Array(0))
  const aaiReadyRef = useRef(false)
  const pendingStreamRef = useRef(null)
  const useAssemblyAIRef = useRef(true) // prefer AAI realtime when available
  const [aaiInterim, setAaiInterim] = useState('')
  const aaiFinalsMapRef = useRef(new Map()) // key -> final text
  const aaiFinalKeysRef = useRef([]) // preserve ordering of keys

  useEffect(() => {
    if (!socket) return
    const handler = (payload) => {
      if (payload?.text != null) setTranscript((t) => appendSegmentText(t, payload))
    }
    socket.on('transcription', handler)
    return () => socket.off('transcription', handler)
  }, [socket])

  // Append Web Speech segments to the transcript live
  useEffect(() => {
    if (segments.length === 0) return
    const last = segments[segments.length - 1]
    if (last.final) {
      setTranscript((t) => appendSegmentText(t, last))
    }
  }, [segments])

  const liveLines = useMemo(() => {
    const plain = srtToPlainText(transcript)
    return plain ? plain.split(/\n\s*\n/).filter(Boolean) : []
  }, [transcript])

  const interimLine = useMemo(() => {
    if (!segments || segments.length === 0) return ''
    const last = segments[segments.length - 1]
    return last && !last.final ? last.text : ''
  }, [segments])

  const combinedInterim = aaiInterim || interimLine

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [liveLines, combinedInterim])

  // Fetch user recordings
  useEffect(() => {
    const fetchUserRecordings = async () => {
      try {
        const res = await fetch(withApiBase('/api/messages?type=user'), { headers: getAuthHeaders() })
        const data = await res.json()
        setUserRecordings(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch user recordings:', error)
      } finally {
        setLoading(false)
        try { onReady && onReady() } catch {}
      }
    }
    fetchUserRecordings()
  }, [])

  const startTimer = () => {
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1)
    }, 1000)
  }

  const stopTimer = () => {
    clearInterval(timerRef.current)
  }

  const startRecording = async () => {
    // If we're not yet ready, perform preparation (request mic, init ASR) first
    if (!readyToRecord && !recording) {
      setPreparing(true)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        pendingStreamRef.current = stream

        // Initialize realtime first and wait until ready
        let aaiStarted = false
        if (useAssemblyAIRef.current) {
          try {
            await startAssemblyAIRealtime(stream) // resolves when ready
            aaiStarted = true
          } catch (e) {
            console.error('AssemblyAI init failed, will fall back:', e)
          }
        }

        if (!aaiStarted) {
          if (supported) {
            startSTT()
          } else {
            socket?.emit('start-transcription')
          }
        }

        // Prepared and ready; inform user to start recording now
        setReadyToRecord(true)
        setShowReadyToast(true)
        setTimeout(() => setShowReadyToast(false), 2500)
      } catch (err) {
        console.error('Failed to prepare recording:', err)
      } finally {
        setPreparing(false)
      }
      return
    }

    // If ready, start the actual MediaRecorder now
    if (readyToRecord && !recording && pendingStreamRef.current) {
      const stream = pendingStreamRef.current
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        const out = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBlob(out)
      }
      mr.start()
      setRecording(true)
      startTimer()

      // Start visualizer
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        const ctx = new Ctx()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        audioCtxRef.current = ctx
        analyserRef.current = analyser
        const data = new Uint8Array(analyser.frequencyBinCount)
        const bars = levels.length
        const loop = () => {
          analyser.getByteFrequencyData(data)
          const slice = Math.floor(data.length / bars)
          const next = new Array(bars).fill(0).map((_, i) => {
            const start = i * slice
            let sum = 0
            for (let j = start; j < start + slice; j++) sum += data[j]
            return Math.min(1, sum / (slice * 255))
          })
          setLevels(next)
          animRef.current = requestAnimationFrame(loop)
        }
        loop()
      } catch {}
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    stopTimer()
    if (supported && listening) stopSTT()
    stopAssemblyAIRealtime()
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    setReadyToRecord(false)
    if (pendingStreamRef.current) {
      try {
        pendingStreamRef.current.getTracks().forEach(t => t.stop())
      } catch {}
      pendingStreamRef.current = null
    }
  }

  const saveRecording = async () => {
    if (!blob || saving) return
    setSaving(true)
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      form.append('title', title || 'User Recording')
      form.append('durationSeconds', String(elapsed))
      form.append('transcript', transcript)
      form.append('type', 'user') // Explicitly set as user recording
      await fetch(withApiBase('/api/messages/upload'), { method: 'POST', headers: getAuthHeaders(), body: form })
      // reset state after save
      setBlob(null)
      setElapsed(0)
      setTranscript('')
      setTitle('User Recording')

      // Refresh user recordings list
      try {
        const res = await fetch(withApiBase('/api/messages?type=user'), { headers: getAuthHeaders() })
        const data = await res.json()
        setUserRecordings(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to refresh user recordings:', error)
      }
    } catch (e) {
      console.error('Failed to save recording:', e)
    } finally {
      setSaving(false)
    }
  }

  const cancelRecording = () => {
    setBlob(null)
    setElapsed(0)
    setTranscript('')
    setTitle('User Recording')
  }

  // ===== AssemblyAI Realtime helpers =====
  const startAssemblyAIRealtime = async (stream) => {
    // Fetch a temp token from the server
    const res = await fetch(withApiBase('/api/assemblyai/token?expires_in_seconds=60'))
    const data = await res.json()
    if (!res.ok || !data?.token) {
      throw new Error(data?.error || 'Failed to get AssemblyAI token')
    }

    const endpoint = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&formatted_finals=true&token=${encodeURIComponent(data.token)}`
    const ws = new WebSocket(endpoint)
    aaiWsRef.current = ws

    // Manage transcript accumulation from events
    let resolvedReady = false
    const readyResolvers = []
    const readyPromise = new Promise((resolve) => readyResolvers.push(resolve))
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const type = msg?.message_type || msg?.type
        const text = msg?.text || msg?.transcript || ''
        // Mark socket ready once session begins
        if ((type || '').toLowerCase() === 'session_begins') {
          aaiReadyRef.current = true
          if (!resolvedReady) { resolvedReady = true; readyResolvers.forEach((r) => r()); }
          return
        }
        if (!text) return
        const t = String(type || '').toLowerCase()
        if (t.includes('partial')) {
          setAaiInterim(text)
        } else {
          setAaiInterim('')
          // Deduplicate by storing finals keyed by a stable key
          const key = (Number.isFinite(msg?.audio_start) ? msg.audio_start : undefined) 
            ?? (Number.isFinite(msg?.start) ? msg.start : undefined)
            ?? (Number.isFinite(msg?.turn_order) ? msg.turn_order : undefined)
            ?? (aaiFinalKeysRef.current.length > 0 ? aaiFinalKeysRef.current[aaiFinalKeysRef.current.length - 1] + 1 : 0)
          if (!aaiFinalsMapRef.current.has(key)) {
            aaiFinalKeysRef.current.push(key)
          }
          aaiFinalsMapRef.current.set(key, text)
          const combined = aaiFinalKeysRef.current
            .slice()
            .sort((a, b) => a - b)
            .map((k) => aaiFinalsMapRef.current.get(k))
            .filter(Boolean)
            .join(' ')
          setTranscript(combined)
        }
      } catch {}
    }
    ws.onerror = (e) => {
      console.error('AssemblyAI WS error:', e)
    }
    ws.onclose = () => {
      // no-op
    }

    // Start audio pipeline once socket opens
    ws.onopen = () => {
      // Consider the stream ready on socket open to avoid missing early audio
      aaiReadyRef.current = true
      // Safety: in rare cases where provider delays readiness, ensure readiness after short delay
      setTimeout(() => { if (aaiWsRef.current === ws) aaiReadyRef.current = true }, 500)
      if (!resolvedReady) { resolvedReady = true; readyResolvers.forEach((r) => r()); }
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      aaiAudioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      aaiSourceRef.current = source
      // ScriptProcessorNode is deprecated but broadly supported; good for quick PCM capture
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      aaiScriptNodeRef.current = processor
      source.connect(processor)
      processor.connect(ctx.destination)

      processor.onaudioprocess = (e) => {
        if (!aaiWsRef.current || aaiWsRef.current.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)
        const down = downsampleTo16k(input, ctx.sampleRate)
        if (!down || down.length === 0) return
        const pcm16 = floatTo16BitPCM(down)
        // Accumulate PCM until AssemblyAI session is ready, then flush
        if (!aaiReadyRef.current) {
          aaiBufferRef.current = appendPCM(aaiBufferRef.current, pcm16)
          return
        }
        // queue and send in ~100ms chunks (1600 samples @ 16kHz)
        const chunked = appendPCM(aaiBufferRef.current, pcm16)
        const samplesPer100ms = 1600
        const availableChunks = Math.floor(chunked.length / samplesPer100ms)
        for (let i = 0; i < availableChunks; i++) {
          const start = i * samplesPer100ms
          const end = start + samplesPer100ms
          const slice = chunked.subarray(start, end)
          aaiWsRef.current.send(slice.buffer)
        }
        const remainder = chunked.length % samplesPer100ms
        aaiBufferRef.current = remainder ? chunked.subarray(chunked.length - remainder) : new Int16Array(0)
      }
    }

    // Return when realtime is ready to accept audio
    return readyPromise
  }

  const stopAssemblyAIRealtime = () => {
    try { aaiScriptNodeRef.current && aaiScriptNodeRef.current.disconnect() } catch {}
    try { aaiSourceRef.current && aaiSourceRef.current.disconnect() } catch {}
    aaiScriptNodeRef.current = null
    aaiSourceRef.current = null
    aaiBufferRef.current = new Int16Array(0)
    aaiReadyRef.current = false
    try { setAaiInterim('') } catch {}
    aaiFinalsMapRef.current = new Map()
    aaiFinalKeysRef.current = []
    if (aaiAudioCtxRef.current) {
      try { aaiAudioCtxRef.current.close() } catch {}
      aaiAudioCtxRef.current = null
    }
    if (aaiWsRef.current) {
      try { aaiWsRef.current.close() } catch {}
      aaiWsRef.current = null
    }
  }

  // Audio utils
  const appendPCM = (lhs, rhs) => {
    const out = new Int16Array(lhs.length + rhs.length)
    out.set(lhs, 0)
    out.set(rhs, lhs.length)
    return out
  }

  const floatTo16BitPCM = (float32) => {
    const out = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return out
  }

  const downsampleTo16k = (float32, inputSampleRate) => {
    const targetRate = 16000
    if (inputSampleRate === targetRate) return float32
    const ratio = inputSampleRate / targetRate
    const newLength = Math.round(float32.length / ratio)
    const result = new Float32Array(newLength)
    let pos = 0
    let idx = 0
    while (idx < newLength) {
      const nextPos = Math.round((idx + 1) * ratio)
      let sum = 0
      let count = 0
      for (; pos < nextPos && pos < float32.length; pos++) {
        sum += float32[pos]
        count++
      }
      result[idx] = count > 0 ? sum / count : 0
      idx++
    }
    return result
  }

  return (
    <div className="space-y-6">
      {/* Main Recording Interface */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="glass rounded-2xl p-6 min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm opacity-80">Voice Recorder</div>
            <div className="text-xs opacity-60">Saves to User Archives</div>
          </div>
          <div className="text-4xl font-mono mb-6">{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</div>
          {/* Inline banners removed in favor of overlay loader & toast */}
          <motion.div className="h-24 w-full rounded-lg bg-slate-800 border border-white/10 overflow-hidden px-2 flex items-end gap-1"
            animate={{ boxShadow: recording ? '0 0 20px rgba(255,78,205,0.6)' : '0 0 0 rgba(0,0,0,0)' }} transition={{ duration: 0.4 }}>
            {levels.map((v, i) => (
              <motion.div key={i} className="flex-1 bg-neon-blue/70 rounded-t"
                initial={{ height: 4 }}
                animate={{ height: 8 + v * 80 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            ))}
          </motion.div>
          <div className="mt-6 flex gap-3 flex-wrap">
            {!recording && !blob && !preparing && !readyToRecord && (
              <button onClick={startRecording} className="px-4 py-2 rounded glass hover:neon-glow transition">Record</button>
            )}
            {!recording && !blob && preparing && (
              <button disabled className="px-4 py-2 rounded glass opacity-70 cursor-not-allowed inline-flex items-center gap-2">
                <span className="relative flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Preparing…</span>
                </span>
              </button>
            )}
            {!recording && !blob && !preparing && readyToRecord && (
              <button onClick={startRecording} className="px-4 py-2 rounded glass hover:neon-glow transition">Start Recording</button>
            )}
            {recording && (
              <button onClick={stopRecording} className="px-4 py-2 rounded glass hover:neon-glow transition">Stop</button>
            )}
            {!recording && blob && (
              <>
                {/* Preview the recording before saving */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm opacity-80">Preview</div>
                    <div className="text-xs opacity-60">
                      {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
                    </div>
                  </div>
                  <audio
                    ref={preSaveAudioRef}
                    controls
                    className="w-full rounded-lg"
                    src={preSaveUrl || undefined}
                  />
                </div>
                {/* Pre-save edit form */}
                <div className="w-full grid gap-3">
                  <div>
                    <label className="block text-xs opacity-70 mb-1">Transcript</label>
                    <textarea
                      className="w-full min-h-[140px] rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                    />
                  </div>
                </div>
                {saving ? (
                  <button disabled className="px-4 py-2 rounded glass opacity-70 cursor-not-allowed inline-flex items-center gap-2">
                    <span className="relative flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Saving…</span>
                    </span>
                  </button>
                ) : (
                  <button onClick={saveRecording} className="px-4 py-2 rounded glass hover:neon-glow transition">Save</button>
                )}
                <button onClick={cancelRecording} disabled={saving} className={`px-4 py-2 rounded glass transition ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:neon-glow'}`}>Cancel</button>
              </>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 min-h-[320px]">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Transcription
          </div>
          <div ref={listRef} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 max-h-72 overflow-auto">
            {preparing ? (
              <div className="flex items-center gap-2 text-sm opacity-80">
                <span className="relative flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Warming up live transcription…</span>
                </span>
              </div>
            ) : (!recording && readyToRecord) ? (
              <div className="text-sm opacity-80">Ready — click Start Recording</div>
            ) : liveLines.length === 0 && !combinedInterim ? (
              <div className="opacity-60 text-sm">—</div>
            ) : (
              <div className="space-y-2">
                {liveLines.map((line, idx) => (
                  <div key={idx} className="text-sm leading-relaxed opacity-90">{line}</div>
                ))}
                {combinedInterim && (
                  <div className="text-sm leading-relaxed opacity-70 italic">{combinedInterim}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay loaders (consistent with Booth) */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm" aria-busy="true" aria-live="polite" role="status">
          <svg className="w-10 h-10 animate-spin text-white/90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
          </svg>
          {/* <div className="mt-3 text-sm text-white/90">Loading your recordings…</div> */}
        </div>
      )}
      {preparing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm" aria-busy="true" aria-live="polite" role="status">
          <svg className="w-10 h-10 animate-spin text-white/90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
          </svg>
          <div className="mt-3 text-sm text-white/90">Warming up live transcription…</div>
        </div>
      )}

      {/* Subtle toast for ready state */}
      {showReadyToast && !recording && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 shadow-lg backdrop-blur">
            Ready — you can start recording now
          </div>
        </div>
      )}

      {/* User Archives Section */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Your Recordings</h3>
          <div className="text-sm opacity-70">{userRecordings.length} recordings saved</div>
        </div>
        
        <div className="text-sm opacity-80 mb-4">
          Your personal recordings saved from the voice recorder. Click on any recording to play it.
        </div>

        {loading ? (
          <div className="text-center py-8 opacity-60">Loading your recordings...</div>
        ) : userRecordings.length === 0 ? (
          <div className="text-center py-8 opacity-60">
            <div className="text-lg mb-2">No recordings yet</div>
            <div className="text-sm">Start recording above to create your first voice message</div>
          </div>
        ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userRecordings.map((m, index) => (
              <UserRecordingCard key={m._id} recording={m} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UserRecordingCard({ recording, index }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleAudioEnd = () => {
    setIsPlaying(false)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div 
      className="group cursor-pointer"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Header with number and date */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-mono opacity-60">
          #{String(index + 1).padStart(3, '0')}
        </div>
        <div className="text-xs opacity-50">
          {new Date(recording.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          }).toUpperCase()}
        </div>
      </div>

      {/* Thumbnail Preview */}
      <div className="relative mb-3">
        <ThumbnailGenerator 
          recording={recording} 
          className="h-48 w-full"
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
        />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePlay()
            }}
            className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(recording.durationSeconds || duration)}
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg leading-tight text-white">
          {recording.title || 'User Recording'}
        </h3>
        
        <p className="text-sm opacity-80 line-clamp-2">
          {recording.transcript ? 
            srtToPlainText(recording.transcript).substring(0, 100) + '...' : 
            'No transcript available'
          }
        </p>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="hidden"
      >
        <source src={recording.audioUrl.startsWith('http') ? recording.audioUrl : withApiBase(recording.audioUrl)} />
      </audio>

      {/* Expanded Details */}
      {showDetails && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/20"
        >
          <TranscriptPreview text={recording.transcript} />
          <div className="text-xs opacity-60 mt-2">
            Created: {new Date(recording.createdAt).toLocaleString()}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}


