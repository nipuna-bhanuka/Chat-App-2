export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  displayName: string
}

export type AuthSession = {
  user: AuthUser
}
