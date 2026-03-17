export type UserRole = 'admin' | 'teacher'

export type Organization = {
  id: string
  name: string
  createdAt: string
}

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string
  createdAt: string
}

export type DevicePlatform = 'android' | 'windows'

export type Device = {
  id: string
  organizationId: string
  name: string
  platform: DevicePlatform
  registeredAt: string
  lastSeenAt?: string
}
