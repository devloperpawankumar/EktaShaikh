import { useEffect, useRef, useState } from 'react'

export default function useWebSpeech({ lang = 'en-US', interimResults = true } = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [segments, setSegments] = useState([]) // {index,startMs,endMs,text,final?}
  const recognitionRef = useRef(null)
  const startTimeRef = useRef(0)
  const indexRef = useRef(1)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = interimResults
    rec.continuous = true
    rec.onresult = (e) => {
      const now = Date.now()
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0]?.transcript?.trim()
        if (!text) continue
        const isFinal = r.isFinal
        const startMs = now - startTimeRef.current - 500
        const endMs = now - startTimeRef.current
        setSegments((prev) => {
          const idx = indexRef.current
          const seg = { index: idx, startMs: Math.max(0, startMs), endMs: Math.max(0, endMs), text, final: isFinal }
          const next = [...prev]
          const last = next[next.length - 1]
          if (!isFinal) {
            if (last && last.index === idx && !last.final) {
              next[next.length - 1] = seg
            } else {
              next.push(seg)
            }
          } else {
            // finalize current line
            if (last && last.index === idx && !last.final) {
              next[next.length - 1] = seg
            } else {
              next.push(seg)
            }
            indexRef.current += 1
          }
          return next
        })
      }
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
  }, [lang, interimResults])

  const start = () => {
    if (!recognitionRef.current || listening) return
    startTimeRef.current = Date.now()
    indexRef.current = 1
    setSegments([])
    recognitionRef.current.start()
    setListening(true)
  }

  const stop = () => {
    recognitionRef.current?.stop()
  }

  return { supported, listening, segments, start, stop }
}


