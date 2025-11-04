export function msToSrtTime(ms) {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = Math.floor(ms % 1000)
  const pad = (n, l=2) => String(n).padStart(l, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis,3)}`
}

export function formatSrtSegment({ index, startMs, endMs, text }) {
  return `${index}\n${msToSrtTime(startMs)} --> ${msToSrtTime(endMs)}\n${text}`
}

export function appendSegmentText(existing, segment) {
  const lines = (existing ? existing.split('\n\n') : [])
  if (!segment) return existing || ''
  const block = formatSrtSegment(segment)
  // Replace last block if index matches (for interim updates)
  if (lines.length > 0) {
    const last = lines[lines.length - 1]
    const lastIndex = last.split('\n')[0]?.trim()
    if (String(segment.index) === lastIndex) {
      lines[lines.length - 1] = block
      return lines.join('\n\n')
    }
  }
  lines.push(block)
  return lines.join('\n\n')
}

// Strip SRT numbering and timecodes to plain text lines
export function srtToPlainText(srt) {
  if (!srt) return ''
  return srt
    .replace(/^\s*\d+\s*$\n?/gm, '')
    .replace(/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\s*$\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


