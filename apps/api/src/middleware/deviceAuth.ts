import type { Context, Next, Env } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { devices } from '../db/schema.ts'
import { verifyToken } from '../lib/tokens.ts'

export type DeviceAuthContext = Env & {
  Variables: {
    deviceId: string
  }
}

/**
 * Middleware that validates device Bearer token for player sync requests.
 * Extracts token from `Authorization: Bearer <token>` header,
 * looks up the device, verifies against stored Argon2id hash,
 * and injects `deviceId` into the Hono context.
 */
export async function deviceAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const parts = authHeader.split(' ')
  // Format: "Bearer <deviceId>:<token>"
  const rawCredential = parts[1] ?? ''
  const colonIdx = rawCredential.indexOf(':')
  if (colonIdx === -1) {
    return c.json({ error: 'Invalid token format — expected deviceId:token' }, 401)
  }

  const deviceId = rawCredential.slice(0, colonIdx)
  const token = rawCredential.slice(colonIdx + 1)

  if (!deviceId || !token) {
    return c.json({ error: 'Invalid token format' }, 401)
  }

  const [device] = await db
    .select({ id: devices.id, deviceTokenHash: devices.deviceTokenHash })
    .from(devices)
    .where(eq(devices.id, deviceId))

  if (!device) {
    return c.json({ error: 'Device not found' }, 401)
  }

  const valid = await verifyToken(token, device.deviceTokenHash)
  if (!valid) {
    return c.json({ error: 'Invalid device token' }, 401)
  }

  c.set('deviceId', device.id)
  await next()
}
