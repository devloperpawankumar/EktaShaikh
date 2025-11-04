import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useScrollScenes from '../hooks/useScrollScenes.js'
import { withApiBase } from '../config.js'
import { srtToPlainText } from '../utils/srt.js'

const scenes = [
  {
    title: 'Welcome to the Booth',
    text: 'A guided tour of messages, moods, and moments.',
  },
  {
    title: 'How people speak',
    text: 'Live transcription segments visualize cadence and emphasis.',
  },
  {
    title: 'Archive patterns',
    text: 'Small multiples reveal duration and verbosity across calls.',
  },
]

export default function Story({ onReady }) {
  const { containerRef, activeIndex } = useScrollScenes({ numScenes: scenes.length })
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(withApiBase('/api/messages'))
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      } catch {}
      finally {
        try { onReady && onReady() } catch {}
      }
    }
    run()
  }, [])

  return (
    <div className="relative">
      {/* Sticky graphic */}
      <div className="sticky top-0 h-[60vh] sm:h-[70vh] flex items-center justify-center">
        <Graphic activeIndex={activeIndex} messages={messages} />
      </div>

      {/* Narrative */}
      <div ref={containerRef} className="max-w-2xl mx-auto">
        {scenes.map((s, i) => (
          <section key={i} data-scene data-scene-index={i} className="min-h-[80vh] flex items-center">
            <div className="space-y-3 p-6 glass rounded-2xl">
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="opacity-80 leading-relaxed">{s.text}</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Graphic({ activeIndex, messages }) {
  return (
    <div className="w-full max-w-4xl h-[48vh] sm:h-[56vh] rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden p-6">
      <AnimatePresence mode="popLayout">
        <motion.div key={activeIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="h-full">
          {activeIndex === 0 && <IntroViz count={messages?.length || 0} />}
          {activeIndex === 1 && <DurationHistogram messages={messages} />}
          {activeIndex === 2 && <TopWords messages={messages} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function IntroViz({ count }) {
  return (
    <div className="h-full grid place-items-center">
      <motion.div className="text-2xl sm:text-3xl font-semibold text-center">
        Digital Phone Booth — Story
        <div className="mt-2 text-base font-normal opacity-80">{count} messages in archive</div>
      </motion.div>
    </div>
  )
}

function DurationHistogram({ messages }) {
  const bins = useMemo(() => buildDurationBins(messages), [messages])
  const max = Math.max(1, ...bins.map((b) => b.count))
  return (
    <div className="h-full flex flex-col">
      <div className="text-sm opacity-80 mb-2">Message duration distribution (seconds)</div>
      <div className="flex-1 flex items-end gap-1">
        {bins.map((b, i) => (
          <motion.div key={i} className="flex-1 bg-neon-blue/70 rounded-t" initial={{ height: 4 }} animate={{ height: Math.max(6, (b.count / max) * 160) }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} title={`${b.label}: ${b.count}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] opacity-70 mt-2">
        <span>0</span>
        <span>short</span>
        <span>medium</span>
        <span>long</span>
      </div>
    </div>
  )
}

function TopWords({ messages }) {
  const top = useMemo(() => computeTopWords(messages, 36), [messages])
  return (
    <div className="h-full">
      <div className="text-sm opacity-80 mb-2">Common words in transcripts</div>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {top.map(([word, count], i) => (
          <motion.div key={word} className="px-2 py-2 rounded bg-slate-800 border border-white/10 text-xs text-center"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <div className="font-medium truncate">{word}</div>
            <div className="opacity-70 text-[10px]">{count}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function buildDurationBins(messages) {
  if (!Array.isArray(messages)) return []
  const durations = messages.map((m) => Number(m?.durationSeconds || 0)).filter((n) => Number.isFinite(n) && n >= 0)
  const max = Math.max(30, ...durations, 0)
  const binCount = 16
  const step = max / binCount
  const bins = Array.from({ length: binCount }, (_, i) => ({ min: i * step, max: (i + 1) * step, count: 0, label: `${Math.round(i * step)}-${Math.round((i + 1) * step)}` }))
  for (const d of durations) {
    const idx = Math.min(binCount - 1, Math.floor(d / step))
    bins[idx].count += 1
  }
  return bins
}

function computeTopWords(messages, limit = 36) {
  if (!Array.isArray(messages)) return []
  const stop = new Set(['the','and','or','a','to','of','in','it','is','that','this','for','on','with','as','was','are','be','at','by','i','you','we','they','he','she','me','my','your'])
  const freq = new Map()
  for (const m of messages) {
    const plain = srtToPlainText(m?.transcript || '') || ''
    const words = plain.toLowerCase().match(/[a-z']+/g) || []
    for (const w of words) {
      if (stop.has(w)) continue
      freq.set(w, (freq.get(w) || 0) + 1)
    }
  }
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)
}


