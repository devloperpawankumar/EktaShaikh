import { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { srtToPlainText } from '../utils/srt.js'
import { withApiBase } from '../config.js'
import ThumbnailGenerator from './ThumbnailGenerator.jsx'

export default function Archive({ onReady }) {
  const [dialItems, setDialItems] = useState([])
  const [userItems, setUserItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dial') // 'dial' or 'user'
  const [visibleCount, setVisibleCount] = useState(12)

  useEffect(() => {
    // Signal ready immediately so route loader disappears
    try { onReady && onReady() } catch {}
    
    const run = async () => {
      try {
        // Fetch both in parallel instead of sequential
        const [dialRes, userRes] = await Promise.all([
          fetch(withApiBase('/api/messages?type=dial')),
          fetch(withApiBase('/api/messages?type=user'))
        ])
        const dialData = await dialRes.json()
        const userData = await userRes.json()
        // Sort ascending by createdAt so earliest uploads appear first
        const byOldestFirst = (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        setDialItems(Array.isArray(dialData) ? [...dialData].sort(byOldestFirst) : [])
        setUserItems(Array.isArray(userData) ? [...userData].sort(byOldestFirst) : [])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const currentItems = activeTab === 'dial' ? dialItems : userItems
  const currentTitle = activeTab === 'dial' ? 'Dial Archives' : 'User Archives'

  // Reset pagination when switching tabs
  useEffect(() => {
    setVisibleCount(12)
  }, [activeTab])

  return (
    <div>
      <div className="mb-6">
        <div className="text-2xl font-semibold mb-4">{currentTitle}</div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dial')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'dial'
                ? 'bg-neon-blue text-white shadow-lg'
                : 'glass hover:neon-glow'
            }`}
          >
            Dial Recordings ({dialItems.length})
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'user'
                ? 'bg-neon-blue text-white shadow-lg'
                : 'glass hover:neon-glow'
            }`}
          >
            User Recordings ({userItems.length})
          </button>
        </div>

        {/* Archive Description */}
        <div className="mb-6 p-4 glass rounded-xl">
          <div className="text-sm opacity-80">
            {activeTab === 'dial' ? (
              <>
                <strong>Dial Archives:</strong> Pre-recorded messages accessible through the rotary dial. 
                These are curated recordings that users can listen to by dialing specific numbers.
              </>
            ) : (
              <>
                <strong>User Archives:</strong> Personal recordings created by users through the voice recorder. 
                These are private recordings that users can save and listen to later.
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 h-64 animate-pulse">
              <div className="w-full h-32 bg-white/10 rounded mb-2"></div>
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentItems.slice(0, visibleCount).map((m, index) => (
              <ArchiveCard key={m._id} recording={m} index={index} />
            ))}
          </div>
          {currentItems.length > visibleCount && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => Math.min(c + 12, currentItems.length))}
                className="px-6 py-3 rounded-lg glass hover:neon-glow transition-all"
              >
                Load more ({currentItems.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {!loading && currentItems.length === 0 && (
        <div className="text-center py-12 opacity-60">
          <div className="text-lg mb-2">No recordings found</div>
          <div className="text-sm mb-4">
            {activeTab === 'dial' 
              ? 'Dial recordings will appear here once uploaded by administrators.'
              : 'User recordings will appear here once you start recording.'
            }
          </div>
          {activeTab === 'dial' && (
            <div className="text-xs opacity-50">
              Administrators can upload recordings using the Admin panel
            </div>
          )}
          {activeTab === 'user' && (
            <div className="text-xs opacity-50">
              Go to the Record section to create your first recording
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ArchiveCard = memo(function ArchiveCard({ recording, index }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isInView, setIsInView] = useState(false)
  const audioRef = useRef(null)
  const cardRef = useRef(null)

  // Memoize transcript parsing - only parse once
  const transcriptPreview = useMemo(() => {
    if (!recording.transcript) return 'No transcript available'
    const plain = srtToPlainText(recording.transcript)
    return plain ? plain.substring(0, 100) + '...' : 'No transcript available'
  }, [recording.transcript])

  // Memoize formatted date
  const formattedDate = useMemo(() => {
    return new Date(recording.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    }).toUpperCase()
  }, [recording.createdAt])

  // Intersection Observer - lazy load ThumbnailGenerator only when visible
  useEffect(() => {
    if (!cardRef.current) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect() // Only need to trigger once
          }
        })
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    )
    
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }, [isPlaying])

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }, [])

  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  const formattedDuration = useMemo(() => 
    formatDuration(recording.durationSeconds || duration),
    [recording.durationSeconds, duration, formatDuration]
  )

  return (
    <motion.div 
      ref={cardRef}
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
          {formattedDate}
        </div>
      </div>

      {/* Thumbnail Preview - lazy load only when in viewport */}
      <div className="relative mb-3">
        {isInView ? (
          <ThumbnailGenerator 
            recording={recording} 
            className="h-48 w-full"
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
          />
        ) : (
          <div className="h-48 w-full glass rounded-xl animate-pulse bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <div className="text-4xl opacity-50">🎵</div>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              handlePlay()
            }}
            className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
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
          </motion.button>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formattedDuration}
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg leading-tight">
          {recording.title || 'Untitled Recording'}
        </h3>
        
        <p className="text-sm opacity-80 line-clamp-2">
          {transcriptPreview}
        </p>

        {/* Phone Number Badge */}
        {recording.phoneNumber && (
          <div className="inline-block text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">
            #{recording.phoneNumber}
          </div>
        )}
      </div>

      {/* Hidden Audio Element - lazy loaded with preload="metadata" only */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
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
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if recording data changes
  return (
    prevProps.recording._id === nextProps.recording._id &&
    prevProps.recording.title === nextProps.recording.title &&
    prevProps.index === nextProps.index
  )
})

const TranscriptPreview = memo(function TranscriptPreview({ text }) {
  const [expanded, setExpanded] = useState(false)
  const plain = useMemo(() => srtToPlainText(text), [text])
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
})


