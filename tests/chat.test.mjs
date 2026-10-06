import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const audio = new Map()
globalThis.testAudioStorage = audio
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith('/audioStorage')) return { url: 'test:audio-storage', shortCircuit: true }
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.includes('/src/'))) {
      const base = specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL))
      for (const path of [base, base + '.ts', base + '.json']) if (existsSync(path)) return { url: pathToFileURL(path).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url === 'test:audio-storage') return { format: 'module', shortCircuit: true, source: `
      export async function saveAudio(id, scenarioId, blob) { globalThis.testAudioStorage.set(id, { scenarioId, blob }) }
      export async function deleteAudio(id) { globalThis.testAudioStorage.delete(id) }
      export async function clearScenarioAudio(scenarioId) {
        for (const [id, value] of globalThis.testAudioStorage) if (value.scenarioId === scenarioId) globalThis.testAudioStorage.delete(id)
      }
    ` }
    if (url.endsWith('.svg')) return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)}` }
    if (url.endsWith('.ts')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
    if (url.endsWith('.json')) return { format: 'module', shortCircuit: true, source: `export default ${readFileSync(new URL(url), 'utf8')}` }
    return next(url, context)
  },
})
const storage = new Map()
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, atob, btoa }
const { sendAudioMessage, fetchMessages, clearMessages } = await import('../src/services/chatService.ts')
const { MOCK_SCENARIOS } = await import('../src/features/scenarios/data/mockScenarios.ts')
const scenarioId = MOCK_SCENARIOS[0].id
const draft = () => ({ scenarioId, blob: new Blob(['recording'], { type: 'audio/webm' }), mimeType: 'audio/webm', durationSeconds: 3 })
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

test('voice transcript reaches chat context and audio is saved with message', async () => {
  storage.clear(); audio.clear()
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push([url, options])
    if (url === '/api/transcribe') return json({ transcript: 'I will deliver tomorrow.' })
    if (url === '/api/chat') return json({ text: '{"reply":"That works.","resolved":false}' })
    return json({ error: 'TTS unavailable' }, 502)
  }
  const result = await sendAudioMessage(draft())
  assert.equal(result.userMessage.content, 'I will deliver tomorrow.')
  assert.equal(result.userMessage.kind, 'audio')
  assert.equal(result.userMessage.durationSeconds, 3)
  assert.equal(await audio.get(result.userMessage.audioId).blob.text(), 'recording')
  assert.deepEqual(JSON.parse(calls[1][1].body).contents.at(-1).parts, [{ text: 'I will deliver tomorrow.' }])
  assert.equal((await fetchMessages(scenarioId)).length, 3)
  assert.equal(result.assistantMessage.content, 'That works.')
})

test('failed transcription creates no user turn and never calls chat', async () => {
  storage.clear(); audio.clear()
  const before = await fetchMessages(scenarioId)
  globalThis.fetch = async (url) => { assert.equal(url, '/api/transcribe'); return json({ error: 'No clear speech was detected.' }, 422) }
  await assert.rejects(sendAudioMessage(draft()), /No clear speech/)
  assert.deepEqual(await fetchMessages(scenarioId), before)
  assert.equal(audio.size, 0)
})

test('failed chat can retry cached transcript without duplicate turn or transcription', async () => {
  storage.clear(); audio.clear()
  const recording = draft()
  let transcriptions = 0, fail = true
  globalThis.fetch = async (url) => {
    if (url === '/api/transcribe') { transcriptions++; return json({ transcript: 'Let us review the scope.' }) }
    if (url === '/api/chat') return fail ? json({ error: 'Please retry.' }, 503) : json({ text: '{"reply":"Go ahead."}' })
    return json({}, 502)
  }
  await assert.rejects(sendAudioMessage(recording, undefined, (text) => { recording.transcript = text }), /retry/)
  assert.equal((await fetchMessages(scenarioId)).length, 1)
  fail = false
  await sendAudioMessage(recording)
  assert.equal(transcriptions, 1)
  assert.equal((await fetchMessages(scenarioId)).filter((m) => m.role === 'user').length, 1)
})

test('ending a session during transcription prevents late chat calls or persistence', async () => {
  storage.clear(); audio.clear()
  const controller = new AbortController()
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/transcribe')
    controller.abort()
    return json({ transcript: 'A late transcript.' })
  }
  await assert.rejects(sendAudioMessage(draft(), controller.signal), { name: 'AbortError' })
  assert.equal((await fetchMessages(scenarioId)).length, 1)
  assert.equal(audio.size, 0)
  clearMessages(scenarioId)
  assert.equal(storage.size, 0)
})

test('storage failure leaves no orphan audio or committed user turn', async () => {
  storage.clear(); audio.clear()
  await fetchMessages(scenarioId)
  const original = window.localStorage.setItem
  globalThis.fetch = async (url) => url === '/api/chat'
    ? json({ text: '{"reply":"Okay."}' })
    : json({}, 502)
  window.localStorage.setItem = () => { throw new Error('Storage full') }
  try {
    await assert.rejects(sendAudioMessage({ ...draft(), transcript: 'A cached transcript.' }), /Storage full/)
    assert.equal(audio.size, 0)
    assert.equal((await fetchMessages(scenarioId)).filter((m) => m.role === 'user').length, 0)
  } finally { window.localStorage.setItem = original }
})

test('completed session preserves playback until exit, then clears its audio', async () => {
  storage.clear(); audio.clear()
  globalThis.fetch = async (url) => url === '/api/chat'
    ? json({ text: '{"reply":"Agreed.","resolved":true}' })
    : json({}, 502)
  const result = await sendAudioMessage({ ...draft(), transcript: 'We have a plan.' })
  assert.equal(result.sessionComplete, true)
  assert.equal(storage.size, 0)
  assert.equal(audio.size, 1)
  clearMessages(scenarioId)
  assert.equal(audio.size, 0)
})

test('turn cap is checked before transcription', async () => {
  storage.clear(); audio.clear()
  await fetchMessages(scenarioId)
  const key = [...storage.keys()][0]
  storage.set(key, JSON.stringify(Array.from({ length: MOCK_SCENARIOS[0].turnCap }, () => ({ role: 'user', content: 'Existing turn' }))))
  globalThis.fetch = async () => { assert.fail('Must not call provider after turn cap') }
  await assert.rejects(sendAudioMessage(draft()), /already complete/)
})
