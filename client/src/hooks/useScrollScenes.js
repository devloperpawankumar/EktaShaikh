import { useEffect, useRef, useState } from 'react'

// Lightweight scroll scene manager using IntersectionObserver
export default function useScrollScenes({ numScenes = 1, rootMargin = '-40% 0% -40% 0%' }) {
  const containerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const sections = Array.from(root.querySelectorAll('[data-scene]'))
    if (sections.length === 0) return
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => Math.abs(a.intersectionRatio - b.intersectionRatio))
      if (visible[0]) {
        const idx = Number(visible[0].target.getAttribute('data-scene-index') || 0)
        setActiveIndex(idx)
      }
    }, { root: null, rootMargin, threshold: Array.from({ length: 11 }, (_, i) => i / 10) })
    sections.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [numScenes, rootMargin])

  return { containerRef, activeIndex }
}


