import { describe, it, expect } from 'vitest'
import { testClient } from 'hono/testing'
import { app } from '../src/index'

describe('GET /health', () => {
  it('should return status ok', async () => {
    const client = testClient(app)
    const res = await client.health.$get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})

describe('GET /not-found', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/this-route-does-not-exist')
    expect(res.status).toBe(404)
  })
})
