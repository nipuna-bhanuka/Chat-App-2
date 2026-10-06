// Blob storage is separate from localStorage: object URLs cannot survive reloads.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('claritas-audio', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('recordings', { keyPath: 'id' }).createIndex('scenarioId', 'scenarioId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Audio storage is unavailable. Please enable browser storage and retry.'))
  })
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('recordings', mode)
      const request = action(tx.objectStore('recordings'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = tx.onabort = () => reject(new Error('Could not save audio. Free some browser storage and retry.'))
    })
  } finally { db.close() }
}

export function saveAudio(id: string, scenarioId: string, blob: Blob) {
  return transaction('readwrite', (store) => store.put({ id, scenarioId, blob }))
}

export async function loadAudio(id: string): Promise<Blob | undefined> {
  const record = await transaction('readonly', (store) => store.get(id))
  return record?.blob
}

export function deleteAudio(id: string) {
  return transaction('readwrite', (store) => store.delete(id))
}

export async function clearScenarioAudio(scenarioId: string) {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('recordings', 'readwrite')
      const request = tx.objectStore('recordings').index('scenarioId').openCursor(IDBKeyRange.only(scenarioId))
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) { cursor.delete(); cursor.continue() }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
