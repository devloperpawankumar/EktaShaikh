import { useEffect, useMemo, useRef, useState, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { appendSegmentText, srtToPlainText } from '../utils/srt.js'
import { formatCinematicTranscript } from '../utils/transcriptFormat.js'
import { withApiBase } from '../config.js'
import useWebSpeech from '../hooks/useWebSpeech.js'
import RotaryDial from './RotaryDial.jsx'
import WordHighlighter from './WordHighlighter.jsx'
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
    <div className="text-xs opacity-90 whitespace-pre-wrap">
      {plain}
      <button className="mt-2 block text-[11px] underline opacity-80" onClick={() => setExpanded(false)}>Show less</button>
    </div>
  )
}

export default function Booth({ onStartTranscription, socket, onReady }) {
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [visibleCount, setVisibleCount] = useState(12)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const audioRef = useRef(null)
  const [dialDigits, setDialDigits] = useState('')
  const [dialNotice, setDialNotice] = useState('')
  const commitTimerRef = useRef(null)
  const dialDigitsRef = useRef('')
  const { supported, listening, segments, start: startSTT, stop: stopSTT } = useWebSpeech({ lang: 'en-US', interimResults: true })
  const listRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioContext, setAudioContext] = useState(null)
  const [mediaStreamSource, setMediaStreamSource] = useState(null)
  const [processorNode, setProcessorNode] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [wordData, setWordData] = useState([])
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [languageConfidence, setLanguageConfidence] = useState(null)
  const [audioError, setAudioError] = useState(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)

  // Removed HEAD check to avoid an extra network round trip before play

  // Helper function to get language name from code
  const getLanguageName = (code) => {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'uk': 'Ukrainian',
      'cs': 'Czech',
      'sk': 'Slovak',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sr': 'Serbian',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'el': 'Greek',
      'he': 'Hebrew',
      'fa': 'Persian',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'or': 'Odia',
      'as': 'Assamese',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Burmese',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'sq': 'Albanian',
      'eu': 'Basque',
      'be': 'Belarusian',
      'bs': 'Bosnian',
      'ca': 'Catalan',
      'cy': 'Welsh',
      'ga': 'Irish',
      'is': 'Icelandic',
      'mk': 'Macedonian',
      'mt': 'Maltese',
      'gl': 'Galician',
      'lb': 'Luxembourgish',
      'fy': 'Frisian',
      'yi': 'Yiddish',
      'co': 'Corsican',
      'gd': 'Scottish Gaelic',
      'br': 'Breton',
      'fo': 'Faroese',
      'kl': 'Greenlandic',
      'se': 'Northern Sami',
      'sm': 'Samoan',
      'haw': 'Hawaiian',
      'mi': 'Maori',
      'ty': 'Tahitian',
      'to': 'Tongan',
      'fj': 'Fijian',
      'na': 'Nauruan',
      'ch': 'Chamorro',
      'mh': 'Marshallese',
      'pon': 'Pohnpeian',
      'kos': 'Kosraean',
      'yap': 'Yapese',
      'chk': 'Chuukese',
      'pau': 'Palauan',
      'gil': 'Gilbertese',
      'niu': 'Niuean',
      'tvl': 'Tuvaluan',
      'wls': 'Wallisian',
      'fut': 'Futunan',
      'rap': 'Rapanui',
      'rar': 'Rarotongan',
      'mri': 'Maori',
      'nau': 'Nauruan',
      'ton': 'Tongan',
      'fij': 'Fijian',
      'hif': 'Fiji Hindi',
      'tpi': 'Tok Pisin',
      'bi': 'Bislama',
      'ho': 'Hiri Motu',
      'tvl': 'Tuvaluan',
      'wls': 'Wallisian',
      'fut': 'Futunan',
      'rap': 'Rapanui',
      'rar': 'Rarotongan',
      'mri': 'Maori',
      'nau': 'Nauruan',
      'ton': 'Tongan',
      'fij': 'Fijian',
      'hif': 'Fiji Hindi',
      'tpi': 'Tok Pisin',
      'bi': 'Bislama',
      'ho': 'Hiri Motu'
    }
    return languageNames[code] || code.toUpperCase()
  }

  const liveLines = useMemo(() => {
    const plain = srtToPlainText(transcript)
    return plain ? plain.split(/\n\s*\n/).filter(Boolean) : []
  }, [transcript])

  const interimLine = useMemo(() => {
    if (!segments || segments.length === 0) return ''
    const last = segments[segments.length - 1]
    return last && !last.final ? last.text : ''
  }, [segments])

  // Build formatted cinematic transcript for display in booth
  const cinematicTranscript = useMemo(() => {
    return formatCinematicTranscript({
      words: Array.isArray(wordData) ? wordData : [],
      text: srtToPlainText(transcript)
    })
  }, [wordData, transcript])

  // Setup audio processing for transcription
  const setupAudioProcessing = async () => {
    try {
      // Skip setup if audio element is already connected
      if (audioRef.current && audioRef.current._audioSourceConnected) {
        return
      }

      // Clean up existing audio context and source if they exist
      if (mediaStreamSource) {
        try {
          mediaStreamSource.disconnect()
        } catch (e) {
          console.warn('Error disconnecting existing media stream source:', e)
        }
        setMediaStreamSource(null)
      }
      
      if (processorNode) {
        try {
          processorNode.disconnect()
        } catch (e) {
          console.warn('Error disconnecting existing processor node:', e)
        }
        setProcessorNode(null)
      }
      
      if (audioContext && audioContext.state !== 'closed') {
        try {
          await audioContext.close()
        } catch (e) {
          console.warn('Error closing existing audio context:', e)
        }
      }

      // Create new audio context
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      
      // Resume audio context if it's suspended (required for user interaction)
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      setAudioContext(ctx)

      // Create a MediaElementAudioSourceNode from the audio element
      if (audioRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current)
        audioRef.current._audioSourceConnected = true // Mark as connected
        setMediaStreamSource(source)

        // Create a ScriptProcessorNode to capture audio data
        const processor = ctx.createScriptProcessor(4096, 1, 1)
        setProcessorNode(processor)

        // Connect the audio graph - ensure audio plays through speakers
        // Connect source directly to destination for audio playback
        source.connect(ctx.destination)
        // Also connect to processor for transcription (but don't let it consume the audio)
        source.connect(processor)
        processor.connect(ctx.destination)

        // Process audio data for transcription
        processor.onaudioprocess = (event) => {
          if (isTranscribing) {
            const inputBuffer = event.inputBuffer
            const audioData = inputBuffer.getChannelData(0)
            
            // Convert Float32Array to Int16Array for transcription
            const int16Data = new Int16Array(audioData.length)
            for (let i = 0; i < audioData.length; i++) {
              int16Data[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768))
            }
            
            // Send audio data to transcription service
            sendAudioForTranscription(int16Data)
          }
        }
      } else {
        console.warn('Audio element not available for setup')
      }

    } catch (error) {
      console.error('Failed to setup audio processing:', error)
    }
  }

  // Send audio data to transcription service
  const sendAudioForTranscription = async (audioData) => {
    try {
      // For now, we'll use a mock transcription service
      // In production, you would send this to a real transcription API
      const response = await fetch(withApiBase('/api/messages/transcribe-audio'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: audioData
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.text) {
          setTranscript(prev => prev + result.text + ' ')
        }
      }
    } catch (error) {
      console.error('Transcription error:', error)
    }
  }

  useEffect(() => {
    if (!socket) return
    const handler = (payload) => {
      if (payload?.text != null) {
        setTranscript((t) => appendSegmentText(t, payload))
        
        // Update language detection information if available
        if (payload.detected_language) {
          setDetectedLanguage(payload.detected_language)
        }
        if (payload.language_confidence !== undefined) {
          setLanguageConfidence(payload.language_confidence)
        }
      }
    }
    socket.on('transcription', handler)
    return () => socket.off('transcription', handler)
  }, [socket])

  // Append Web Speech segments to transcript when enabled
  useEffect(() => {
    if (segments.length === 0) return
    const last = segments[segments.length - 1]
    if (last.final) {
      setTranscript((t) => appendSegmentText(t, last))
    }
  }, [segments])
  // Auto-scroll transcript list to bottom when new text arrives
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [liveLines, interimLine])

  useEffect(() => {
    // Signal route-level ready immediately; keep local skeleton for messages
    try { onReady && onReady() } catch {}
    const run = async () => {
      setLoadingMessages(true)
      try {
        // Limit to 30 items at API level for faster loading
        const res = await fetch(withApiBase('/api/messages?type=dial&limit=30'))
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load messages:', error)
        setMessages([])
      } finally {
        setLoadingMessages(false)
      }
    }
    run()
  }, [])

  // Cleanup on unmount: stop audio and release resources to avoid auto fetch on return
  useEffect(() => {
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.removeAttribute('src')
          // Force unload of the media to stop network activity
          audioRef.current.load()
        }
      } catch {}
      cleanupAudioProcessing()
    }
  }, [])

  // Handle audio events for transcription control
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleAudioEnd = () => {
      setIsPlaying(false)
      setIsTranscribing(false)
      setCurrentTime(0)
      // Don't cleanup audio processing on end - keep it alive for next track
    }

    const handleAudioPause = () => {
      setIsPlaying(false)
      setIsTranscribing(false)
    }

    const handleAudioPlay = () => {
      setIsPlaying(true)
      
      // Only start transcription if audio processing is not already set up
      if (!isTranscribing && !audioRef.current._audioSourceConnected) {
        setupAudioProcessing().then(() => {
          setIsTranscribing(true)
        }).catch((error) => {
          console.warn('Failed to start transcription:', error)
          setIsTranscribing(false)
          // Audio should still play even if transcription fails
        })
      } else if (audioRef.current._audioSourceConnected) {
        // If audio processing is already set up, just resume transcription
        setIsTranscribing(true)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.addEventListener('ended', handleAudioEnd)
    audio.addEventListener('pause', handleAudioPause)
    audio.addEventListener('play', handleAudioPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('ended', handleAudioEnd)
      audio.removeEventListener('pause', handleAudioPause)
      audio.removeEventListener('play', handleAudioPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [isTranscribing, processorNode, audioContext])

  // Removed periodic sync to reduce CPU wakeups; rely on audio element events

  const playIndex = async (idx) => {
    if (!messages.length || isLoadingAudio) {
      return
    }
    
    setIsLoadingAudio(true)
    setAudioError(null) // Clear any previous audio errors
    
    const maxIdx = Math.min(messages.length, 30) - 1
    const clamped = Math.max(0, Math.min(idx, maxIdx))
    const item = messages[clamped]
    setSelectedIdx(clamped)
    
        // play selected index
    
    // Clear previous transcript when starting new audio
    setTranscript('')
    
    // Show immediate feedback that we're starting to play
        
    
    if (audioRef.current && item?.audioUrl) {
      try {
        // Resume audio context if it exists and is suspended
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume()
        } else if (!audioContext) {
          await initializeAudioContext()
        }
        
        // Stop any currently playing audio
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        
        // Make audio URL absolute if it's relative and resolve a browser-playable fallback if needed
        let audioUrl = withApiBase(item.audioUrl)
        if (audioRef.current) {
          try {
            const canPlayWebm = audioRef.current.canPlayType && audioRef.current.canPlayType('audio/webm; codecs="vorbis"')
            const canPlayMp3 = audioRef.current.canPlayType && audioRef.current.canPlayType('audio/mpeg')
            const isWebm = /\.webm($|\?)/i.test(audioUrl)
            if (isWebm && !canPlayWebm) {
              // Try a sibling MP3 next to the WEBM (server converts on upload)
              const mp3Candidate = audioUrl.replace(/\.webm(\?|$)/i, '.mp3$1')
              if (canPlayMp3) {
                audioUrl = mp3Candidate
              } else {
                // Fallback to on-the-fly stream transcode endpoint
                const fileParam = encodeURIComponent(item.audioUrl)
                audioUrl = withApiBase(`/api/messages/stream?file=${fileParam}`)
              }
            }
          } catch {}
        }
        
        
        // Set the source and play immediately
        audioRef.current.src = audioUrl
        
        // Ensure audio is not muted and volume is set
        audioRef.current.muted = false
        audioRef.current.volume = 1.0
        
        // Play immediately without waiting for full load
        
        
        // Retry mechanism for interrupted play requests
        let playAttempts = 0
        const maxPlayAttempts = 3
        
        while (playAttempts < maxPlayAttempts) {
          try {
            // Ensure audio context is resumed before playing
            if (audioContext && audioContext.state === 'suspended') {
              await audioContext.resume()
            }
            
            await audioRef.current.play()
            
            break // Success, exit the retry loop
          } catch (playError) {
            playAttempts++
            
            
            if (playError.message && playError.message.includes('interrupted') && playAttempts < maxPlayAttempts) {
              
              await new Promise(resolve => setTimeout(resolve, 50))
              continue
            } else if (playError.name === 'NotAllowedError' && playAttempts < maxPlayAttempts) {
              
              if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume()
              }
              await new Promise(resolve => setTimeout(resolve, 100))
              continue
            } else {
              throw playError // Re-throw if not interrupted or max attempts reached
            }
          }
        }
        
        setIsPlaying(true)
        setIsLoadingAudio(false) // Clear loading state immediately
        
        
        // Start live transcription shortly after play to prioritize audio start
        setTimeout(async () => {
          if (!audioRef.current) return
          if (!audioRef.current._audioSourceConnected) {
            try {
              await setupAudioProcessing()
              setIsTranscribing(true)
            } catch {
              setIsTranscribing(false)
            }
          } else {
            setIsTranscribing(true)
          }
        }, 200)
        
      } catch (playError) {
        console.error('Failed to play audio:', playError)
        setIsPlaying(false)
        setIsTranscribing(false)
        setIsLoadingAudio(false) // Clear loading state on error
        
        // Set user-friendly error message
        let errorMessage = 'Failed to play audio'
        if (playError.name === 'NotAllowedError') {
          errorMessage = 'Audio playback blocked by browser. Please try clicking the dial again.'
          console.error('Audio playback blocked by browser. User interaction required.')
        } else if (playError.name === 'NotSupportedError') {
          errorMessage = 'Audio format not supported by your browser.'
          console.error('Audio format not supported by browser.')
        } else if (playError.message && playError.message.includes('interrupted')) {
          // Handle the specific "play() request was interrupted" error
          console.warn('Play request was interrupted, retrying...')
          // Don't show error to user for this common browser issue
          return // Exit gracefully without showing error
        } else {
          console.error('Unknown audio playback error:', playError)
          errorMessage = `Audio error: ${playError.message || 'Unknown error'}`
        }
        setAudioError(errorMessage)
      }
    } else {
      
      setIsLoadingAudio(false) // Clear loading state
    }
    
    // Set existing transcript if available
    if (item?.transcript) setTranscript(item.transcript)
    
    // Set word data if available (from AssemblyAI transcription)
    if (item?.words && Array.isArray(item.words)) {
      setWordData(item.words)
    } else {
      setWordData([])
    }
    
    // Set language detection information if available
    if (item?.detected_language) {
      setDetectedLanguage(item.detected_language)
    } else {
      setDetectedLanguage(null)
    }
    
    if (item?.language_confidence !== undefined) {
      setLanguageConfidence(item.language_confidence)
    } else {
      setLanguageConfidence(null)
    }
    
    // Reset loading state
    setIsLoadingAudio(false)
  }


  const handleDialSelect = async (num) => {
    // Initialize audio context on first user interaction
    await initializeAudioContext()
    
    const scheduleCommit = (delayMs = 1600) => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
      commitTimerRef.current = setTimeout(() => {
        const buf = dialDigitsRef.current
        if (!buf) { commitTimerRef.current = null; return }
        const parsed = parseInt(buf, 10)
        if (Number.isNaN(parsed)) { commitTimerRef.current = null; return }

        // Enforce 1–30
        if (parsed < 1 || parsed > 30) {
          setDialNotice('Only numbers 1–30 allowed')
          setTimeout(() => setDialNotice(''), 1200)
          commitTimerRef.current = null
          return
        }

        const maxIndex = Math.min(30, messages.length)
        if (maxIndex > 0) {
          const oneBasedIndex = Math.max(1, Math.min(parsed, maxIndex))
          const idx = oneBasedIndex - 1
          playIndex(idx).catch((error) => {
            console.error('Failed to play audio for index', idx, ':', error)
          })
        }

        // Clear the display shortly after commit
        setTimeout(() => {
          setDialDigits('')
          dialDigitsRef.current = ''
          commitTimerRef.current = null
        }, 900)
      }, delayMs)
    }

    setDialDigits((prev) => {
      // Block a third digit entirely
      if (prev.length >= 2) {
        setDialNotice('Max 2 digits (1–30)')
        setTimeout(() => setDialNotice(''), 1200)
        return prev
      }

      const next = `${prev}${num}`
      const parsed = parseInt(next, 10)

      // If not a number yet, just show it
      if (Number.isNaN(parsed)) {
        dialDigitsRef.current = next
        scheduleCommit(1100)
        return next
      }

      // Enforce 1–30 while typing
      if (parsed < 1) {
        setDialNotice('Minimum is 1')
        setTimeout(() => setDialNotice(''), 1200)
        return prev
      }
      if (parsed > 30) {
        setDialNotice('Only numbers 1–30 allowed')
        setTimeout(() => setDialNotice(''), 1200)
        return prev
      }

      // Update buffer
      dialDigitsRef.current = next

      // If two digits reached, commit immediately; otherwise, wait a bit for a possible second digit
      if (next.length === 2) {
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
        // Commit now using current buffer
        const value = parsed
        const maxIndex = Math.min(30, messages.length)
        if (maxIndex > 0) {
          const oneBasedIndex = Math.max(1, Math.min(value, maxIndex))
          const idx = oneBasedIndex - 1
          playIndex(idx).catch((error) => {
            console.error('Failed to play audio for index', idx, ':', error)
          })
        }
        // Clear shortly so the user sees the entered number
        commitTimerRef.current = setTimeout(() => {
          setDialDigits('')
          dialDigitsRef.current = ''
          commitTimerRef.current = null
        }, 900)
      } else {
        // one digit: wait to see if a second digit comes in
        scheduleCommit(1600)
      }

      return next
    })
  }

  // Initialize audio context on first user interaction
  const initializeAudioContext = async () => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        setAudioContext(ctx)
      } catch (error) {
        console.error('Failed to initialize audio context:', error)
      }
    }
  }

  // Clean up audio processing resources
  const cleanupAudioProcessing = () => {
    try {
      if (processorNode) {
        processorNode.disconnect()
        setProcessorNode(null)
      }
      if (mediaStreamSource) {
        mediaStreamSource.disconnect()
        setMediaStreamSource(null)
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
        setAudioContext(null)
      }
      if (audioRef.current) {
        audioRef.current._audioSourceConnected = false
      }
    } catch (error) {
      console.warn('Error during audio cleanup:', error)
    }
  }

  // Removed sync function (event-driven state is sufficient)

  return (
    <div className="space-y-6">
      {/* Main Dial Interface */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="glass rounded-2xl p-0  min-h-[320px] flex flex-col items-center justify-center text-center">
        
          <div className="flex flex-col items-center gap-4">
            <RotaryDial 
              onDigit={handleDialSelect} 
              displayNumber={selectedIdx !== null ? String(selectedIdx + 1) : (dialDigits || '')}
              currentMessage={selectedIdx !== null ? messages[selectedIdx] : null}
              currentTime={currentTime}
              duration={audioRef.current?.duration || 0}
              onPrev={async () => {
                if (messages.length === 0) return
                
                
                // Initialize audio context on first user interaction
                await initializeAudioContext()
                
                const currentIdx = selectedIdx ?? 0
                // Loop to last track if at first track
                const prevIdx = currentIdx <= 0 ? messages.length - 1 : currentIdx - 1
                
                
                // Play immediately without delay
                try {
                  await playIndex(prevIdx)
                  
                } catch (error) {
                  console.error('Failed to play previous track:', error)
                }
              }}
              onNext={async () => {
                if (messages.length === 0) return
                
                
                // Initialize audio context on first user interaction
                await initializeAudioContext()
                
                const currentIdx = selectedIdx ?? -1
                // Loop back to first track if at last track
                const nextIdx = currentIdx >= messages.length - 1 ? 0 : currentIdx + 1
                
                
                // Play immediately without delay
                try {
                  await playIndex(nextIdx)
                  
                } catch (error) {
                  console.error('Failed to play next track:', error)
                }
              }}
              onPlayPause={async () => {
                // Initialize audio context on first user interaction
                await initializeAudioContext()
                
                if (selectedIdx == null) {
                  await playIndex(0)
                  return
                }
                
                if (audioRef.current) {
                  if (audioRef.current.paused) {
                    try { 
                      
                      
                      // Resume audio context if suspended
                      if (audioContext && audioContext.state === 'suspended') {
                        
                        await audioContext.resume()
                      }
                      
                      // Play the audio
                      await audioRef.current.play()
                      setIsPlaying(true)
                      
                      
                      // Start transcription if not already running
                      if (!isTranscribing && audioRef.current._audioSourceConnected) {
                        try {
                          setIsTranscribing(true)
                          
                        } catch (error) {
                          console.warn('Failed to resume transcription:', error)
                          setIsTranscribing(false)
                        }
                      }
                    } catch (playError) {
                      console.error('Failed to play audio from play/pause button:', playError)
                      setIsPlaying(false)
                      setIsTranscribing(false)
                      
                      let errorMessage = 'Failed to resume audio'
                      if (playError.name === 'NotAllowedError') {
                        errorMessage = 'Audio playback blocked by browser. Please try clicking the dial again.'
                      } else if (playError.name === 'NotSupportedError') {
                        errorMessage = 'Audio format not supported by your browser.'
                      }
                      setAudioError(errorMessage)
                    }
                  } else {
                    try {
                      
                      audioRef.current.pause()
                      setIsPlaying(false)
                      setIsTranscribing(false)
                      
                    } catch (pauseError) {
                      console.error('Failed to pause audio:', pauseError)
                    }
                  }
                }
              }}
              isPlaying={isPlaying}
              hasMessages={messages.length > 0}
              canGoPrev={messages.length > 0}
              canGoNext={messages.length > 0}
            />
          </div>
          <div className="mt-4 text-xs opacity-70">
            {loadingMessages ? 'Loading recordings…' : 'Rotate and release to select message index'}
          </div>
          <div className="mt-2 text-lg tracking-widest font-mono">
            {dialDigits || '—'}
          </div>
          {dialNotice && (
            <div className="mt-1 text-[12px] text-yellow-300 opacity-90">
              {dialNotice}
            </div>
          )}
          <div className="mt-2 text-sm opacity-90">
            {selectedIdx !== null && messages[selectedIdx] ? (
              <div>
                <div className="font-semibold">{messages[selectedIdx].title || 'Message'}</div>
                <div className="text-xs opacity-70">Track {selectedIdx + 1} of {messages.length}</div>
              </div>
            ) : '—'}
          </div>
          
          {/* Live Transcription Status */}
          <div className="mt-4 flex flex-col items-center space-y-2">
            {audioError ? (
              <div className="flex items-center space-x-2 text-red-400">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-sm">{audioError}</span>
              </div>
            ) : isLoadingAudio ? (
              <div className="flex items-center space-x-2 text-yellow-400">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Loading audio...</span>
              </div>
            ) : isPlaying ? (
              <div className="flex items-center space-x-2 text-green-400">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">
                  {isTranscribing ? 'Playing & Transcribing...' : 'Playing audio...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm">Ready to play audio</span>
              </div>
            )}
            
            {/* Language Detection Display */}
            {detectedLanguage && (
              <div className="flex items-center space-x-2 text-blue-400 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Detected: {getLanguageName(detectedLanguage)}</span>
                {languageConfidence && (
                  <span className="opacity-70">
                    ({Math.round(languageConfidence * 100)}% confidence)
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Audio element hidden - controlled by RotaryDial */}
  <audio 
            ref={audioRef} 
            className="hidden" 
    preload="metadata"
            crossOrigin="anonymous"
            playsInline
            autoPlay={false}
            muted={false}
            volume={1.0}
            onError={(e) => {
              try {
                console.error('Audio element error:', e)
                console.error('Audio src:', e.target.src)
                console.error('Audio error details:', e.target.error)

                // Attempt a one-time fallback to streaming transcode if direct file fails
                if (audioRef.current && !audioRef.current._fallbackTried) {
                  audioRef.current._fallbackTried = true
                  try {
                    const current = messages[selectedIdx]
                    const origFile = current?.audioUrl || (() => {
                      try { return new URL(e.target.src).pathname } catch { return '' }
                    })()
                    if (origFile) {
                      const streamUrl = withApiBase(`/api/messages/stream?file=${encodeURIComponent(origFile)}`)
                      audioRef.current.src = streamUrl
                      audioRef.current.muted = false
                      audioRef.current.volume = 1.0
                      audioRef.current.play().catch(() => {})
                      return
                    }
                  } catch {}
                }

                // Set user-friendly error message if fallback not possible or also failed
                let errorMessage = 'Failed to load audio file'
                if (e.target.error) {
                  switch (e.target.error.code) {
                    case e.target.error.MEDIA_ERR_ABORTED:
                      errorMessage = 'Audio loading was aborted'
                      break
                    case e.target.error.MEDIA_ERR_NETWORK:
                      errorMessage = 'Network error while loading audio'
                      break
                    case e.target.error.MEDIA_ERR_DECODE:
                      errorMessage = 'Audio file format not supported'
                      break
                    case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                      errorMessage = 'Audio format not supported by browser'
                      break
                    default:
                      errorMessage = 'Unknown audio error'
                  }
                }
                setAudioError(errorMessage)
                setIsPlaying(false)
                setIsTranscribing(false)
              } catch {}
            }}
            onLoadStart={() => {}}
            onLoadedData={() => {}}
            onCanPlay={() => {}}
            onCanPlayThrough={() => {}}
            onLoadedMetadata={() => {}}
            onStalled={() => {}}
            onSuspend={() => {}}
            onAbort={() => {}}
            onPlay={() => {
              setIsPlaying(true)
            }}
            onPause={() => {
              setIsPlaying(false)
              setIsTranscribing(false)
            }}
          />
        </div>

        <div className="glass rounded-2xl p-6 min-h-[320px]">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <span className={`inline-block w-2 h-2 rounded-full ${
              isTranscribing ? 'bg-emerald-400 animate-pulse' : 
              isPlaying ? 'bg-yellow-400' : 'bg-gray-400'
            }`} />
            Live Transcription
            {isTranscribing && <span className="text-xs opacity-70 ml-2">(Listening...)</span>}
            {isPlaying && !isTranscribing && <span className="text-xs opacity-70 ml-2">(Audio playing)</span>}
          </div>
          <div ref={listRef} className="rounded-xl border border-white/10 bg-slate-900/50 p-4 max-h-72 overflow-y-auto overflow-x-hidden">
            {(!wordData || wordData.length === 0) && !cinematicTranscript ? (
              <div className="opacity-60 text-sm">
                {!isPlaying ? 'Play audio to start live transcription' :
                 !isTranscribing ? 'Starting transcription...' : 'Transcribing audio...'}
              </div>
            ) : (
              <div className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
                {cinematicTranscript}
                {interimLine && (
                  <div className="mt-2 opacity-70 italic">{interimLine}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dial Archives Section hidden */}
    </div>
  )
}

const BoothMessageCard = memo(function BoothMessageCard({ message, index, isSelected, isPlaying, currentTime, duration, onPlay, getLanguageName }) {
  const [showDetails, setShowDetails] = useState(false)
  
  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  return (
    <motion.div 
      className="group cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
    >
      
      {/* Header with number and date */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-mono opacity-60">
          #{String(index + 1).padStart(3, '0')}
        </div>
        <div className="text-xs opacity-50">
          {new Date(message.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          }).toUpperCase()}
        </div>
      </div>

      {/* Thumbnail Preview */}
      <div className="relative mb-3">
        <ThumbnailGenerator 
          recording={message} 
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
              onPlay()
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
          {formatDuration(message.durationSeconds || duration)}
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg leading-tight text-white">
          {message.title || 'Untitled Recording'}
        </h3>
        
        <p className="text-sm opacity-80 line-clamp-2">
          {message.transcript ? 
            srtToPlainText(message.transcript).substring(0, 100) + '...' : 
            'No transcript available'
          }
        </p>

        {/* Language Detection Info */}
        {message.detected_language && (
          <div className="text-xs text-blue-400">
            Language: {getLanguageName(message.detected_language)}
            {message.language_confidence && (
              <span className="opacity-70 ml-1">
                ({Math.round(message.language_confidence * 100)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/20"
        >
          <TranscriptPreview text={message.transcript} />
          <div className="text-xs opacity-60 mt-2">
            Created: {new Date(message.createdAt).toLocaleString()}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isPlaying === nextProps.isPlaying &&
    Math.abs((prevProps.currentTime || 0) - (nextProps.currentTime || 0)) < 0.5 && // Only update on significant time changes
    prevProps.duration === nextProps.duration &&
    prevProps.index === nextProps.index
  )
})


