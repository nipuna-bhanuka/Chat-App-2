import { useCallback, useSyncExternalStore } from 'react'

function getSnapshot(key: string): string | null {
  return window.localStorage.getItem(key)
}

function getServerSnapshot(): string | null {
  return null
}

const listeners = new Map<string, Set<() => void>>()

function subscribe(key: string, onStoreChange: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>()
  set.add(onStoreChange)
  listeners.set(key, set)
  return () => {
    set.delete(onStoreChange)
  }
}

function emit(key: string): void {
  listeners.get(key)?.forEach((listener) => {
    listener()
  })
}

export function useLocalStorage<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    (onChange) => subscribe(key, onChange),
    () => getSnapshot(key),
    getServerSnapshot,
  )

  const value: T = raw === null ? fallback : (JSON.parse(raw) as T)

  const setValue = useCallback(
    (next: T) => {
      window.localStorage.setItem(key, JSON.stringify(next))
      emit(key)
    },
    [key],
  )

  return [value, setValue] as const
}
