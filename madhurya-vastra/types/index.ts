export type LookupItem = {
  id: string
  name: string
  hexCode?: string
  createdAt: string
}

export type User = {
  id: string
  cognitoSub: string
  name: string
  phone: string | null
  email: string | null
  avatarUrl: string | null
  role: 'owner' | 'seller'
}

export type ApiResponse<T> = {
  data?: T
  error?: string
}
