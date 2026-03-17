import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { authMiddleware, type AuthContext } from '../middleware/auth.ts'

const presignSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
  ]),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
})

const endpoint = process.env['DO_SPACES_ENDPOINT']
const s3 = new S3Client({
  ...(endpoint !== undefined && { endpoint }),
  region: process.env['DO_SPACES_REGION'] ?? 'ams3',
  credentials: {
    accessKeyId: process.env['DO_SPACES_KEY'] ?? '',
    secretAccessKey: process.env['DO_SPACES_SECRET'] ?? '',
  },
  forcePathStyle: false,
})

export const uploadsRoute = new Hono<AuthContext>()

uploadsRoute.use('*', authMiddleware)

// POST /uploads/presign — get pre-signed upload URL
uploadsRoute.post('/presign', zValidator('json', presignSchema), async (c) => {
  const user = c.get('user')
  const { filename, contentType } = c.req.valid('json')

  const ext = filename.split('.').pop() ?? 'bin'
  // Path structure: uploads/<teacherId>/<timestamp>-<random>.<ext>
  const key = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const command = new PutObjectCommand({
    Bucket: process.env['DO_SPACES_BUCKET'],
    Key: key,
    ContentType: contentType,
    ACL: 'public-read',
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  const publicUrl = `${process.env['DO_SPACES_CDN_URL']}/${key}`

  return c.json({ uploadUrl, publicUrl })
})
