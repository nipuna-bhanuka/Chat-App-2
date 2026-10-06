import { use, useCallback, useState } from 'react'

const cache = new Map<string, Promise<unknown>>()

export function invalidateApiCache(key: string) {
  for (const cachedKey of cache.keys()) {
    if (cachedKey.startsWith(`${key}:`)) cache.delete(cachedKey)
  }
}

function read<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const cached = cache.get(key)
  if (cached) {
    return cached as Promise<T>
  }

  const request = factory()
  cache.set(key, request)
  return request
}

type UseApiResult<T> = {
  data: T
  reload: () => void
}

export function useApi<T>(
  factory: () => Promise<T>,
  dependencyKey: string,
): UseApiResult<T> {
  // Keep the request owned by this mounted hook stable even when another
  // lifecycle cleanup invalidates the shared cache. Re-reading that cache on
  // every render can suspend an active chat and replay its cleanup effects.
  const [resource, setResource] = useState(() => ({
    key: dependencyKey,
    tick: 0,
    request: read(`${dependencyKey}:0`, factory),
  }))
  let current = resource
  if (resource.key !== dependencyKey) {
    current = { key: dependencyKey, tick: 0, request: read(`${dependencyKey}:0`, factory) }
    setResource(current)
  }
  const data = use(current.request)

  const reload = useCallback(() => {
    const tick = current.tick + 1
    setResource({ key: dependencyKey, tick, request: read(`${dependencyKey}:${tick}`, factory) })
  }, [current.tick, dependencyKey, factory])

  return { data, reload }
}
