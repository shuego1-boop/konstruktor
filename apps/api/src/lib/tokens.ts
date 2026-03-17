import { randomBytes } from 'crypto'

/**
 * Generates a secure random device token (32 bytes hex = 64 chars).
 */
export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hashes a device token using Bun's built-in Argon2id password hashing.
 * Only the hash is stored — never the raw token.
 */
export async function hashToken(token: string): Promise<string> {
  return Bun.password.hash(token, { algorithm: 'argon2id' })
}

/**
 * Verifies a raw token against a stored Argon2id hash.
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return Bun.password.verify(token, hash)
}
