import { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { srtToPlainText } from '../utils/srt.js'
import { withApiBase } from '../config.js'
import ThumbnailGenerator from './ThumbnailGenerator.jsx'
import ConsentSection from './ConsentSection.jsx'

// Language code to name mapping
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
  'pl': 'Polish',
  'tr': 'Turkish',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'el': 'Greek',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'he': 'Hebrew',
  'uk': 'Ukrainian',
  'ca': 'Catalan',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'sr': 'Serbian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'ur': 'Urdu',
}

export default function Archive({ onReady }) {
  const [dialItems, setDialItems] = useState([])
  const [userItems, setUserItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dial') // 'dial' or 'user'
  const [visibleCount, setVisibleCount] = useState(12)
  const [sortBy, setSortBy] = useState('default') // 'default', 'shortest', 'longest', 'most-played'
  const [languageFilter, setLanguageFilter] = useState('all') // 'all' or language code
  const [tagFilter, setTagFilter] = useState('all') // 'all' or specific tag
  const [audioDurations, setAudioDurations] = useState({}) // Map of recording ID to actual audio duration
  const [playCounts, setPlayCounts] = useState({}) // Map of recording ID to play count

  // Load play counts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recordingPlayCounts')
      if (stored) {
        setPlayCounts(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load play counts:', e)
    }
  }, [])

  // Function to increment play count for a recording
  const incrementPlayCount = useCallback((recordingId) => {
    setPlayCounts(prev => {
      const newCounts = {
        ...prev,
        [recordingId]: (prev[recordingId] || 0) + 1
      }
      // Save to localStorage
      try {
        localStorage.setItem('recordingPlayCounts', JSON.stringify(newCounts))
      } catch (e) {
        console.error('Failed to save play counts:', e)
      }
      return newCounts
    })
  }, [])

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

  // Preload audio metadata to get actual durations
  useEffect(() => {
    const loadAudioDurations = async () => {
      const durations = {}
      const itemsToLoad = [...dialItems, ...userItems]
      
      // Load durations in batches to avoid overwhelming the browser
      const batchSize = 5
      for (let i = 0; i < itemsToLoad.length; i += batchSize) {
        const batch = itemsToLoad.slice(i, i + batchSize)
        await Promise.all(
          batch.map(item => {
            return new Promise((resolve) => {
              // Skip if we already have durationSeconds from database
              if (item.durationSeconds && item.durationSeconds > 0) {
                durations[item._id] = item.durationSeconds
                resolve()
                return
              }
              
              const audio = new Audio()
              const audioUrl = item.audioUrl.startsWith('http') 
                ? item.audioUrl 
                : withApiBase(item.audioUrl)
              
              audio.preload = 'metadata'
              audio.onloadedmetadata = () => {
                if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                  durations[item._id] = audio.duration
                }
                resolve()
              }
              audio.onerror = () => {
                resolve() // Continue even if one fails
              }
              audio.src = audioUrl
            })
          })
        )
      }
      
      setAudioDurations(durations)
    }
    
    if (!loading && (dialItems.length > 0 || userItems.length > 0)) {
      loadAudioDurations()
    }
  }, [dialItems, userItems, loading])

  // Extract available languages from current items
  const availableLanguages = useMemo(() => {
    const languages = new Set()
    currentItems.forEach(item => {
      if (item.detected_language) {
        languages.add(item.detected_language)
      }
    })
    return Array.from(languages).sort()
  }, [currentItems])

  const availableTags = useMemo(() => {
    const tags = new Set()
    currentItems.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          if (tag) tags.add(tag)
        })
      }
    })
    return Array.from(tags).sort((a, b) => a.localeCompare(b))
  }, [currentItems])

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let items = [...currentItems]

    // Apply language filter
    if (languageFilter !== 'all') {
      items = items.filter(item => item.detected_language === languageFilter)
    }

    if (tagFilter !== 'all') {
      items = items.filter(item => Array.isArray(item.tags) && item.tags.includes(tagFilter))
    }

    // Apply filtering/sorting
    switch (sortBy) {
      case 'shortest':
        // Find the shortest duration
        if (items.length > 0) {
          // Get all valid durations - use audioDurations if available, otherwise fallback to durationSeconds
          const validItems = items.map(item => {
            // Prefer actual audio duration from loaded metadata, fallback to durationSeconds
            const dur = audioDurations[item._id] ?? item.durationSeconds
            // Convert to number if it's a string, handle null/undefined
            const numDur = dur != null ? Number(dur) : null
            return { item, duration: numDur }
          }).filter(({ duration }) => duration != null && !isNaN(duration) && duration > 0)
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Shortest filter - Total items:', items.length)
            console.log('Valid items with duration:', validItems.length)
            console.log('Durations found:', validItems.map(({ duration }) => duration))
          }
          
          if (validItems.length > 0) {
            // Find the minimum duration
            const shortestDuration = Math.min(...validItems.map(({ duration }) => duration))
            // Filter to show only items with the shortest duration (with tolerance for floating point)
            items = validItems
              .filter(({ duration }) => Math.abs(duration - shortestDuration) < 0.01)
              .map(({ item }) => item)
            // Sort by creation date (oldest first) for items with same duration
            items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Shortest duration:', shortestDuration, 'Items found:', items.length)
            }
          } else {
            // No items with valid duration, show empty
            if (process.env.NODE_ENV === 'development') {
              console.log('No items with valid duration found')
              console.log('Sample item durations:', items.slice(0, 3).map(item => ({
                id: item._id,
                durationSeconds: item.durationSeconds,
                audioDuration: audioDurations[item._id]
              })))
            }
            items = []
          }
        }
        break
      case 'longest':
        // Find the longest duration
        if (items.length > 0) {
          // Get all valid durations - use audioDurations if available, otherwise fallback to durationSeconds
          const validItems = items.map(item => {
            // Prefer actual audio duration from loaded metadata, fallback to durationSeconds
            const dur = audioDurations[item._id] ?? item.durationSeconds
            // Convert to number if it's a string, handle null/undefined
            const numDur = dur != null ? Number(dur) : null
            return { item, duration: numDur }
          }).filter(({ duration }) => duration != null && !isNaN(duration) && duration > 0)
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Longest filter - Total items:', items.length)
            console.log('Valid items with duration:', validItems.length)
            console.log('Durations found:', validItems.map(({ duration }) => duration))
          }
          
          if (validItems.length > 0) {
            // Find the maximum duration
            const longestDuration = Math.max(...validItems.map(({ duration }) => duration))
            // Filter to show only items with the longest duration (with tolerance for floating point)
            items = validItems
              .filter(({ duration }) => Math.abs(duration - longestDuration) < 0.01)
              .map(({ item }) => item)
            // Sort by creation date (oldest first) for items with same duration
            items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Longest duration:', longestDuration, 'Items found:', items.length)
            }
          } else {
            // No items with valid duration, show empty
            if (process.env.NODE_ENV === 'development') {
              console.log('No items with valid duration found')
              console.log('Sample item durations:', items.slice(0, 3).map(item => ({
                id: item._id,
                durationSeconds: item.durationSeconds,
                audioDuration: audioDurations[item._id]
              })))
            }
            items = []
          }
        }
        break
      case 'most-played':
        // Filter to only show recordings that have been played at least once
        items = items.filter(item => {
          const playCount = playCounts[item._id] || 0
          return playCount > 0
        })
        // Sort by play count (highest first), then by creation date (newest first) as tiebreaker
        items.sort((a, b) => {
          const countA = playCounts[a._id] || 0
          const countB = playCounts[b._id] || 0
          if (countB !== countA) {
            return countB - countA // Higher play count first
          }
          // If play counts are equal, sort by creation date (newest first)
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
        break
      case 'default':
      default:
        // Sort by creation date (oldest first) - original behavior
        items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
    }

    return items
  }, [currentItems, languageFilter, tagFilter, sortBy, audioDurations, playCounts])

  // Reset pagination and filters when switching tabs
  useEffect(() => {
    setVisibleCount(12)
    setSortBy('default')
    setLanguageFilter('all')
    setTagFilter('all')
  }, [activeTab])

  const handleTagClick = useCallback((tag) => {
    if (!tag) return
    setTagFilter(prev => (prev === tag ? 'all' : tag))
    setVisibleCount(12)
    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      console.warn('Failed to scroll after tag selection:', e)
    }
  }, [])

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm" aria-busy="true" aria-live="polite" role="status">
          <svg className="w-10 h-10 animate-spin text-white/90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
          </svg>
          {/* <div className="mt-3 text-sm text-white/90">Loading recordings…</div> */}
        </div>
      )}
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

        {/* Sort + Filter Controls */}
        <div className="mb-6 space-y-4">
          {/* Filters Row - Responsive */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium opacity-80 whitespace-nowrap">Sort:</label>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 pr-10 rounded-lg glass text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all hover:neon-glow cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '12px 12px'
                  }}
                >
                  <option value="default" className="bg-black/80 text-white">Default (Oldest First)</option>
                  <option value="shortest" className="bg-black/80 text-white">Shortest</option>
                  <option value="longest" className="bg-black/80 text-white">Longest</option>
                  <option value="most-played" className="bg-black/80 text-white">Most Played</option>
                </select>
              </div>
            </div>

            {/* Language Filter Dropdown */}
            {availableLanguages.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-sm font-medium opacity-80 whitespace-nowrap">Language:</label>
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 pr-10 rounded-lg glass text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all hover:neon-glow cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '12px 12px'
                    }}
                  >
                    <option value="all" className="bg-black/80 text-white">All Languages</option>
                    {availableLanguages.map(lang => (
                      <option key={lang} value={lang} className="bg-black/80 text-white">
                        {languageNames[lang] || lang.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tag Filter Dropdown */}
            {availableTags.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-sm font-medium opacity-80 whitespace-nowrap">Tag:</label>
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 pr-10 rounded-lg glass text-white text-sm focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent transition-all hover:neon-glow cursor-pointer appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '12px 12px'
                    }}
                  >
                    <option value="all" className="bg-black/80 text-white">All tags</option>
                    {availableTags.map(tag => (
                      <option key={tag} value={tag} className="bg-black/80 text-white">
                        #{tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Results count - Responsive */}
            <div className="text-sm opacity-60 w-full sm:w-auto sm:ml-auto text-center sm:text-left">
              {sortBy === 'most-played' ? (
                <>
                  Showing {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'recording' : 'recordings'} with plays
                  {filteredAndSortedItems.length === 0 && currentItems.length > 0 && (
                    <span className="ml-2 text-xs opacity-50">(Play some recordings to see them here)</span>
                  )}
                </>
              ) : (
                <>Showing {filteredAndSortedItems.length} of {currentItems.length} recordings</>
              )}
            </div>
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
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <div className="text-lg mb-2">
                {sortBy === 'most-played' 
                  ? 'No recordings have been played yet' 
                  : 'No recordings match your filters'}
              </div>
              <div className="text-sm mb-4">
                {sortBy === 'most-played' ? (
                  <>Start playing recordings to see them appear here. The most played recordings will be shown first.</>
                ) : (
                  <>Try adjusting your sort or language filter settings</>
                )}
              </div>
              <button
                onClick={() => {
                  setLanguageFilter('all')
                  setTagFilter('all')
                  setSortBy('default')
                }}
                className="px-4 py-2 rounded-lg glass hover:neon-glow transition-all text-sm"
              >
                {sortBy === 'most-played' ? 'View All Recordings' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedItems.slice(0, visibleCount).map((m, index) => (
                  <ArchiveCard 
                    key={m._id} 
                    recording={m} 
                    index={index}
                    onPlay={() => incrementPlayCount(m._id)}
                    playCount={playCounts[m._id] || 0}
                    showPlayCount={sortBy === 'most-played'}
                    onTagClick={handleTagClick}
                  />
                ))}
              </div>
              {filteredAndSortedItems.length > visibleCount && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(c + 12, filteredAndSortedItems.length))}
                    className="px-6 py-3 rounded-lg glass hover:neon-glow transition-all"
                  >
                    Load more ({filteredAndSortedItems.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
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
      <ConsentSection className="mt-12" id="archive-consent" />
    </div>
  )
}

const ArchiveCard = memo(function ArchiveCard({ recording, index, onPlay, playCount = 0, showPlayCount = false, onTagClick }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isInView, setIsInView] = useState(false)
  const audioRef = useRef(null)
  const cardRef = useRef(null)
  const hasTrackedPlay = useRef(false) // Track if we've already counted this play session

  // Memoize transcript parsing - only parse once
  const transcriptPreview = useMemo(() => {
    if (!recording.transcript) return 'No transcript available'
    const plain = srtToPlainText(recording.transcript)
    return plain ? plain.substring(0, 100) + '...' : 'No transcript available'
  }, [recording.transcript])

  const tags = useMemo(() => {
    if (!Array.isArray(recording.tags)) return []
    return recording.tags.map((tag) => String(tag)).filter(Boolean)
  }, [recording.tags])

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
        // Reset tracking flag when starting a new play
        hasTrackedPlay.current = false
      }
    }
  }, [isPlaying])

  const handleAudioPlay = useCallback(() => {
    setIsPlaying(true)
    // Track play count only once per play session
    if (!hasTrackedPlay.current && onPlay) {
      hasTrackedPlay.current = true
      onPlay()
    }
  }, [onPlay])

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false)
    hasTrackedPlay.current = false // Reset for next play
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
      className="group"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
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
            isFirstVisible={index < 4}
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight">
            {recording.title || 'Untitled Recording'}
          </h3>
          {showPlayCount && playCount > 0 && (
            <div className="flex items-center gap-1 text-xs opacity-70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">{playCount}</span>
            </div>
          )}
        </div>
        
        <p className="text-sm opacity-80 line-clamp-2">
          {transcriptPreview}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onTagClick) onTagClick(tag)
                }}
                className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Phone number and transcript toggle */}
        <div className="flex items-center justify-between mt-3">
          {recording.phoneNumber && (
            <div className="inline-block text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">
              #{recording.phoneNumber}
            </div>
          )}
          
          {/* Transcript Toggle Switch */}
          {recording.transcript && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTranscript(!showTranscript)
              }}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg glass hover:neon-glow transition-all"
              aria-label={showTranscript ? 'Hide transcript' : 'Show transcript'}
            >
              <span className="text-white/80">{showTranscript ? 'Hide transcript' : 'Show transcript'}</span>
              {/* Toggle Switch */}
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                showTranscript ? 'bg-neon-blue' : 'bg-white/20'
              }`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  showTranscript ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Hidden Audio Element - lazy loaded with preload="metadata" only */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onPause={() => setIsPlaying(false)}
        onPlay={handleAudioPlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
        className="hidden"
      >
        <source src={recording.audioUrl.startsWith('http') ? recording.audioUrl : withApiBase(recording.audioUrl)} />
      </audio>

      {/* Collapsible Transcript Section */}
      {recording.transcript && (
        <motion.div
          initial={false}
          animate={{
            height: showTranscript ? 'auto' : 0,
            opacity: showTranscript ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-sm font-medium mb-2 opacity-90">Transcript:</div>
            <TranscriptPreview text={recording.transcript} />
            <div className="text-xs opacity-60 mt-3">
              Created: {new Date(recording.createdAt).toLocaleString()}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if recording data changes
  const prevTagsKey = Array.isArray(prevProps.recording.tags) ? prevProps.recording.tags.join('|') : ''
  const nextTagsKey = Array.isArray(nextProps.recording.tags) ? nextProps.recording.tags.join('|') : ''
  return (
    prevProps.recording._id === nextProps.recording._id &&
    prevProps.recording.title === nextProps.recording.title &&
    prevProps.index === nextProps.index &&
    prevProps.onPlay === nextProps.onPlay &&
    prevProps.playCount === nextProps.playCount &&
    prevProps.showPlayCount === nextProps.showPlayCount &&
    prevTagsKey === nextTagsKey
  )
})

const TranscriptPreview = memo(function TranscriptPreview({ text }) {
  const [expanded, setExpanded] = useState(false)
  const plain = useMemo(() => srtToPlainText(text), [text])
  if (!plain) return <div className="text-xs opacity-70">No transcript yet.</div>
  if (!expanded) {
    return (
      <div className="text-xs opacity-80">
        <div className="line-clamp-3 break-words">{plain}</div>
        <button 
          className="mt-1 text-[11px] underline opacity-80 hover:opacity-100 transition-opacity" 
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(true)
          }}
        >
          View full
        </button>
      </div>
    )
  }
  return (
    <div className="text-xs opacity-90 break-words overflow-visible">
      <div className="w-full">{plain}</div>
      <button 
        className="mt-2 block text-[11px] underline opacity-80 hover:opacity-100 transition-opacity" 
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(false)
        }}
      >
        Ⓒ Click to collapse
      </button>
    </div>
  )
})


