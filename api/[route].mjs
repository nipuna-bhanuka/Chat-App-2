import { createApiHandler } from '../server/api.mjs'

// Vercel entry point for /api/transcribe, /api/chat and /api/speech.
export default createApiHandler(process.env)
