export const API_ENDPOINTS = {
  auth: {
    me: '/auth/me',
    logout: '/auth/logout',
  },
  scenarios: {
    list: '/scenarios',
    byId: (id: string) => `/scenarios/${id}`,
  },
  chat: {
    messages: (scenarioId: string) => `/chat/${scenarioId}/messages`,
    send: (scenarioId: string) => `/chat/${scenarioId}/messages`,
  },
} as const

export const STORAGE_KEYS = {
  authUser: 'claritas.auth.user',
  chatMessages: (scenarioId: string) => `claritas.chat.${scenarioId}`,
} as const
