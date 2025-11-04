export default async function handler(req, res) {
  const url = 'https://digitalbooth.onrender.com/api/health'
  try {
    const response = await fetch(url, { method: 'GET' })
    const data = await response.json().catch(() => ({}))
    return res.status(200).json({ ok: true, upstreamStatus: response.status, data })
  } catch (error) {
    // Return 200 so cron never retries aggressively; include error for visibility
    return res.status(200).json({ ok: false, error: String(error) })
  }
}


