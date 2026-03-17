import { describe, it, expect } from 'vitest'
import { generateDeviceToken } from '../src/lib/tokens'

describe('generateDeviceToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateDeviceToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('returns unique tokens each call', () => {
    const t1 = generateDeviceToken()
    const t2 = generateDeviceToken()
    expect(t1).not.toBe(t2)
  })
})

describe('hashToken / verifyToken', () => {
  it('hashes and verifies a token correctly', async () => {
    // Only runs in Bun runtime — skip gracefully in node
    if (typeof Bun === 'undefined') return

    const { hashToken, verifyToken } = await import('../src/lib/tokens')
    const token = generateDeviceToken()
    const hash = await hashToken(token)

    expect(hash).not.toBe(token)
    expect(hash.length).toBeGreaterThan(20)

    const valid = await verifyToken(token, hash)
    expect(valid).toBe(true)
  })

  it('rejects wrong token', async () => {
    if (typeof Bun === 'undefined') return

    const { hashToken, verifyToken } = await import('../src/lib/tokens')
    const hash = await hashToken('correct-token-abc')
    const valid = await verifyToken('wrong-token-xyz', hash)
    expect(valid).toBe(false)
  })
})
