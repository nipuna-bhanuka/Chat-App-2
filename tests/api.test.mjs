import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createApiHandler } from '../server/api.mjs'

async function request(handler, path, body, headers = {}, method = 'POST') {
  const req = Readable.from([Buffer.isBuffer(body) ? body : Buffer.from(body)])
  Object.assign(req, { url: path, method, headers: { host: 'localhost:5173', ...headers } })
  let status, result
  const res = { writeHead(code) { status = code }, end(data) { result = JSON.parse(data) } }
  await handler(req, res)
  return { status, ...result }
}

test('uploads actual audio bytes with normalized MIME and returns transcript', async () => {
  let sent
  const api = createApiHandler({}, async (input) => { sent = input; return { text: '{"transcript":"  I can deliver it tomorrow.  "}' } })
  const result = await request(api, '/api/transcribe', Buffer.from('audio-bytes'), { 'content-type': 'audio/webm;codecs=opus' })
  assert.equal(result.status, 200)
  assert.equal(result.transcript, 'I can deliver it tomorrow.')
  assert.deepEqual(sent.contents[0].parts[0].inlineData, { mimeType: 'audio/webm', data: Buffer.from('audio-bytes').toString('base64') })
})

test('rejects empty, unsupported and oversized recordings before calling provider', async () => {
  const api = createApiHandler({}, async () => { assert.fail('Provider must not be called') })
  assert.equal((await request(api, '/api/transcribe', '', { 'content-type': 'audio/webm' })).status, 400)
  assert.equal((await request(api, '/api/transcribe', 'x', { 'content-type': 'text/plain' })).status, 415)
  assert.equal((await request(api, '/api/transcribe', Buffer.alloc(8 * 1024 * 1024 + 1), { 'content-type': 'audio/webm' })).status, 413)
})

test('silence and unreadable transcription are explicit failures', async () => {
  await Promise.all([['{"transcript":" "}', 422], ['not json', 502]].map(async ([text, expected]) => {
    const api = createApiHandler({}, async () => ({ text }))
    assert.equal((await request(api, '/api/transcribe', 'x', { 'content-type': 'audio/webm' })).status, expected)
  }))
})

test('provider failure is sanitized and retryable without exposing provider details', async () => {
  const api = createApiHandler({}, async () => { throw Object.assign(new Error('private provider response'), { status: 429 }) })
  const result = await request(api, '/api/transcribe', 'x', { 'content-type': 'audio/webm' })
  assert.equal(result.status, 429)
  assert.match(result.error, /retry/)
  assert.doesNotMatch(result.error, /private/)
})

test('rejects cross-origin calls, invalid methods and malformed chat input', async () => {
  const api = createApiHandler({}, async () => { assert.fail('Provider must not be called') })
  assert.equal((await request(api, '/api/transcribe', 'x', { origin: 'https://unrelated.example', 'content-type': 'audio/webm' })).status, 403)
  assert.equal((await request(api, '/api/transcribe', '', {}, 'GET')).status, 405)
  assert.equal((await request(api, '/api/chat', '{}', { 'content-type': 'application/json' })).status, 400)
})

test('chat and speech use server settings and the supported voice configuration', async () => {
  const calls = []
  const api = createApiHandler({ GEMINI_MODEL: 'chat-model', GEMINI_TTS_MODEL: 'speech-model', GEMINI_TTS_VOICE: 'Kore' }, async (input) => {
    calls.push(input)
    return { text: '{"reply":"Okay"}', candidates: [{ content: { parts: [{ inlineData: { data: 'AAAA' } }] } }] }
  })
  const chat = await request(api, '/api/chat', JSON.stringify({ systemInstruction: 'Role play', contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] }), { 'content-type': 'application/json' })
  assert.equal(chat.status, 200)
  const speech = await request(api, '/api/speech', '{"text":"Okay"}', { 'content-type': 'application/json' })
  assert.equal(speech.data, 'AAAA')
  assert.equal(calls[0].model, 'chat-model')
  assert.equal(calls[1].model, 'speech-model')
  assert.deepEqual(calls[1].config.speechConfig.voiceConfig, { prebuiltVoiceConfig: { voiceName: 'Kore' } })
})
