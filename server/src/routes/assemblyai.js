import { Router } from 'express';

const router = Router();

// GET /api/assemblyai/token?expires_in_seconds=60
router.get('/token', async (req, res) => {
  try {
    const expiresParam = parseInt(req.query.expires_in_seconds, 10);
    const expiresInSeconds = Number.isFinite(expiresParam) ? Math.max(1, Math.min(600, expiresParam)) : 60;

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' });
    }

    // AssemblyAI v3 streaming temp token endpoint
    const url = `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({ error: 'Failed to generate token', details: errText });
    }

    const data = await response.json();
    return res.json({ token: data.token, expires_in_seconds: expiresInSeconds });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate token', details: error?.message || String(error) });
  }
});

export default router;


