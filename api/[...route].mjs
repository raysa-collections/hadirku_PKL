import app from './_handler.mjs';

// Catch-all Vercel Serverless Function entrypoint for all /api/* routes
export default function handler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
