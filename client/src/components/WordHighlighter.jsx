import { useState, useEffect, useRef, useMemo } from 'react';

// Renders and highlights words using precise timing from AssemblyAI `words`
// Each item in `words` should be { text, start, end, confidence }
export default function WordHighlighter({ words = [], currentTime = 0, isPlaying = false, keepInView = false }) {
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const highlightedRef = useRef(null);

  // Precompute an array of display tokens from words
  const tokens = useMemo(() => {
    if (!Array.isArray(words)) return [];
    const mapped = words.map((w) => {
      const startMs = Number.isFinite(w?.start) ? Number(w.start) : -1;
      const endMs = Number.isFinite(w?.end) ? Number(w.end) : -1;
      const startSec = startMs >= 0 ? startMs / 1000 : -1;
      const endSec = endMs >= 0 ? endMs / 1000 : -1;
      return {
        text: String(w?.text ?? ''),
        startSec,
        endSec,
      };
    });

    // Ensure monotonic times and fill tiny gaps to avoid flicker
    for (let i = 0; i < mapped.length; i++) {
      const cur = mapped[i];
      const prev = mapped[i - 1];
      const next = mapped[i + 1];
      if (cur.startSec >= 0 && cur.endSec >= 0 && cur.endSec < cur.startSec) {
        // Swap if out of order
        const tmp = cur.startSec; cur.startSec = cur.endSec; cur.endSec = tmp;
      }
      // If end missing, borrow next start
      if (cur.startSec >= 0 && (cur.endSec < 0 || cur.endSec < cur.startSec) && next && next.startSec >= 0) {
        cur.endSec = Math.max(cur.startSec, next.startSec - 0.001);
      }
      // If start missing, borrow prev end
      if ((cur.startSec < 0) && prev && prev.endSec >= 0) {
        cur.startSec = prev.endSec;
      }
      // If still missing end, set minimal duration
      if (cur.endSec < 0 && cur.startSec >= 0) {
        cur.endSec = cur.startSec + 0.08; // ~80ms minimal duration
      }
    }
    return mapped;
  }, [words]);

  useEffect(() => {
    if (!isPlaying || tokens.length === 0) {
      setHighlightedWordIndex(-1);
      return;
    }

    // Binary search by time for exact sync
    let lo = 0, hi = tokens.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const t = tokens[mid];
      if (currentTime < t.startSec) {
        hi = mid - 1;
      } else if (currentTime > t.endSec) {
        lo = mid + 1;
      } else {
        found = mid;
        break;
      }
    }
    // If not found inside a span, snap to nearest previous token
    if (found === -1) {
      found = Math.min(Math.max(hi, 0), tokens.length - 1);
    }

    if (found !== -1 && found !== highlightedWordIndex) {
      setHighlightedWordIndex(found);
    }
  }, [currentTime, isPlaying, tokens, highlightedWordIndex]);

  if (tokens.length === 0) {
    return <span />;
  }

  return (
    <span className="leading-relaxed">
      {tokens.map((t, index) => {
        const isHighlighted = isPlaying && index === highlightedWordIndex;
        return (
          <span
            key={index}
            ref={isHighlighted ? highlightedRef : null}
            className={`transition-all duration-200 ${
              isHighlighted
                ? 'bg-yellow-400 text-black font-semibold px-1 py-0.5 rounded shadow-lg'
                : 'px-1 py-0.5'
            }`}
            style={{ transitionDelay: isHighlighted ? '0ms' : '100ms' }}
          >
            {t.text}{index < tokens.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
}
