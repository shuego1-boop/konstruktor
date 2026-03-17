import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { devices, organizations } from '../db/schema.ts'
import { registerDeviceSchema } from '@konstruktor/shared/schemas'
import { generateDeviceToken, hashToken } from '../lib/tokens.ts'

export const devicesRoute = new Hono()

// POST /devices/register — register a new player device
devicesRoute.post('/register', zValidator('json', registerDeviceSchema), async (c) => {
  const data = c.req.valid('json')

  // Look up organization by registration code
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.registrationCode, data.organizationCode))

  if (!org) {
    return c.json({ error: 'Invalid organization code' }, 400)
  }

  const deviceToken = generateDeviceToken()
  const tokenHash = await hashToken(deviceToken)

  const [device] = await db
    .insert(devices)
    .values({
      organizationId: org.id,
      name: data.name,
      platform: data.platform,
      deviceTokenHash: tokenHash,
    })
    .returning({ id: devices.id })

  return c.json({ deviceId: device!.id, deviceToken }, 201)
})
