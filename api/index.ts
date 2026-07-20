import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = req.method || 'GET';

  if (url === '/api/health' || url === '/api/index' || url === '/api') {
    return res.status(200).json({ status: 'healthy', time: new Date().toISOString() });
  }

  res.status(200).json({ message: 'API FitNutrition funcionando', url, method });
}
