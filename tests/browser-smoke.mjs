/* eslint-disable no-await-in-loop -- Browser readiness polling must be sequential. */
// Optional browser integration smoke test. Requires Chrome and a running Vite server.
// Uses a synthetic microphone and mocked AI responses; never calls Gemini.
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const profile = await mkdtemp(join(tmpdir(), 'claritas-voice-'))
const chrome = spawn(process.env.CHROME_PATH || '/opt/google/chrome/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })
let socket
try {
  const debuggerUrl = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000)
    chrome.stderr.on('data', (chunk) => {
      output += chunk.toString()
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    })
    chrome.on('error', reject)
    chrome.on('exit', (code) => { clearTimeout(timeout); reject(new Error(`Chrome exited: ${code}`)) })
  })
  socket = new WebSocket(debuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  let nextId = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const response = JSON.parse(event.data)
    if (!response.id) return
    const item = pending.get(response.id)
    pending.delete(response.id)
    if (response.error) item?.reject(new Error(JSON.stringify(response.error)))
    else item?.resolve(response.result)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  const { targetInfos } = await send('Target.getTargets')
  const page = targetInfos.find((target) => target.type === 'page')
  const { sessionId } = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const until = async (expression) => {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      if (await evaluate(`Boolean(${expression})`)) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}`)
  }
  await send('Page.enable', {}, sessionId)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__calls = []; window.__tracks = []; window.__failNext = false; window.__aborts = []; window.__transcriptionDelay = 1000;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (typeof url !== 'string' || !url.startsWith('/api/')) return originalFetch(url, options);
      window.__calls.push({url, size: options.body?.size, type: options.body?.type, body: typeof options.body === 'string' ? JSON.parse(options.body) : null});
      if (url === '/api/transcribe') {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { options.signal.removeEventListener('abort', abort); resolve(); }, window.__transcriptionDelay);
          const abort = () => { clearTimeout(timeout); window.__aborts.push(url); reject(options.signal.reason); };
          if (options.signal.aborted) abort();
          else options.signal.addEventListener('abort', abort, {once:true});
        });
        if (window.__failNext) { window.__failNext = false; return Response.json({error: 'No clear speech was detected. Please record again.'}, {status:422}); }
        return Response.json({transcript:'I can deliver the proposal tomorrow.'});
      }
      if (url === '/api/chat') return Response.json({text:JSON.stringify({reply:'Please include the revised scope.', resolved:false})});
      return Response.json({error:'No speech audio'}, {status:502});
    };
    const originalMic = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const stream = await originalMic(...args); window.__tracks.push(...stream.getTracks()); return stream;
    };
  ` }, sessionId)
  await send('Page.navigate', { url: process.env.VOICE_TEST_URL || 'http://127.0.0.1:5173/' }, sessionId)
  await until("document.querySelector('a[href^=\"/chat/\"]')")
  await evaluate("document.querySelector('a[href^=\"/chat/\"]').click()")
  await until("document.querySelector('[aria-label=\"Record voice message\"]')")
  const click = (label) => evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`)
  await click('Record voice message')
  await until("document.querySelector('[aria-label=\"Stop recording\"]')")
  await new Promise((resolve) => setTimeout(resolve, 1200))
  await click('Stop recording')
  await until("document.body.innerText.includes('I can deliver the proposal tomorrow.')")
  assert.equal(await evaluate("window.__calls.find(x=>x.url==='/api/transcribe').size > 0"), true)
  assert.equal(await evaluate("window.__calls.find(x=>x.url==='/api/chat').body.contents.at(-1).parts[0].text"), 'I can deliver the proposal tomorrow.')
  assert.equal(await evaluate("window.__tracks.every(t=>t.readyState==='ended')"), true)
  assert.equal(await evaluate('window.__aborts.length'), 0)
  assert.equal(await evaluate("window.__calls.filter(x=>x.url==='/api/transcribe').length"), 1)
  console.log('PASS: microphone capture → real Blob → transcript → chat → stopped microphone')
  await evaluate('window.__beforeReload = true')
  await send('Page.reload', {}, sessionId)
  await until("window.__beforeReload === undefined && window.__calls !== undefined && document.body.innerText.includes('I can deliver the proposal tomorrow.') && document.querySelector('audio[src^=\"blob:\"]')")
  await until("document.querySelector('audio[src^=\"blob:\"]')?.readyState >= 1")
  console.log('PASS: transcript and IndexedDB recording survive reload and audio decodes')
  await evaluate('window.__failNext = true')
  await click('Record voice message')
  await until("document.querySelector('[aria-label=\"Stop recording\"]')")
  await new Promise((resolve) => setTimeout(resolve, 1200))
  await click('Stop recording')
  await until("document.body.innerText.includes('No clear speech was detected.') && document.body.innerText.includes('Retry voice message')")
  assert.equal(await evaluate("window.__calls.filter(x=>x.url==='/api/chat').length"), 0)
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='Retry voice message').click()")
  await until("window.__calls.filter(x=>x.url==='/api/chat').length === 1 && !document.body.innerText.includes('Retry voice message')")
  console.log('PASS: failed transcription retains draft, consumes no chat turn, and retries successfully')
  await click('Record voice message')
  await until("document.querySelector('[aria-label=\"Stop recording\"]')")
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='Cancel recording').click()")
  await until("document.querySelector('[aria-label=\"Record voice message\"]') && window.__tracks.every(t=>t.readyState==='ended')")
  console.log('PASS: cancel stops microphone tracks')
  await evaluate('window.__transcriptionDelay = 10000')
  await click('Record voice message')
  await until("document.querySelector('[aria-label=\"Stop recording\"]')")
  await new Promise((resolve) => setTimeout(resolve, 1200))
  await click('Stop recording')
  await until("window.__calls.filter(x=>x.url==='/api/transcribe').length === 3")
  await click('Back to scenarios')
  await until("document.querySelector('a[href^=\"/chat/\"]') && window.__aborts.length === 1")
  assert.equal(await evaluate("window.__tracks.every(t=>t.readyState==='ended')"), true)
  await evaluate("document.querySelector('a[href^=\"/chat/\"]').click()")
  await until("document.querySelector('[aria-label=\"Record voice message\"]') && document.body.innerText.includes('2/10 turns')")
  assert.equal(await evaluate("window.__calls.filter(x=>x.url==='/api/chat').length"), 1)
  console.log('PASS: navigating away aborts pending transcription; returning restores committed turns only')
  await click('Record voice message')
  await until("document.querySelector('[aria-label=\"Stop recording\"]')")
  await click('Back to scenarios')
  await until("document.querySelector('a[href^=\"/chat/\"]') && window.__tracks.every(t=>t.readyState==='ended')")
  console.log('PASS: navigating away during recording releases the microphone')
} finally {
  socket?.close()
  chrome.kill('SIGTERM')
  if (chrome.exitCode === null && chrome.signalCode === null) await new Promise((resolve) => chrome.once('exit', resolve))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {})
}
