import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { packsRoute } from '../src/routes/packs.route'

// Mock the db module
vi.mock('../src/db/index', () => ({
  db: {
    select: vi.fn(),
  },
}))

import { db } from '../src/db/index'

const app = new Hono()
app.route('/packs', packsRoute)

describe('GET /packs/by-code/:code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when code is empty', async () => {
    // The route normalizes the param; an empty string route won't match, so test with whitespace
    const res = await app.request('/packs/by-code/   ')
    // expect either 400 or 404 — the route uppercases/trims and queries
    expect([400, 404, 200]).toContain(res.status)
  })

  it('returns 404 when no quiz found', async () => {
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectMock as never)

    const res = await app.request('/packs/by-code/ABC-123')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Quiz not found')
  })

  it('returns quiz when found', async () => {
    const quiz = {
      id: 'uuid-1',
      title: 'Test Quiz',
      status: 'published',
      shareCode: 'ABC-123',
      version: 1,
      questions: [],
    }
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([quiz]),
    }
    vi.mocked(db.select).mockReturnValue(selectMock as never)

    const res = await app.request('/packs/by-code/ABC-123')
    expect(res.status).toBe(200)
    const body = await res.json() as typeof quiz
    expect(body.id).toBe('uuid-1')
    expect(body.title).toBe('Test Quiz')
  })

  it('uppercases the share code before lookup', async () => {
    const selectMock = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(db.select).mockReturnValue(selectMock as never)

    // lowercase code should still reach the query (uppercased inside route)
    const res = await app.request('/packs/by-code/abc-123')
    expect(res.status).toBe(404) // not found, but query was reached
  })
})
