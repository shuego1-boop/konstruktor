import { Network } from '@capacitor/network'
import { Preferences } from '@capacitor/preferences'
import { getPendingSessions, markSynced } from './db.ts'

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000'

/**
 * Attempt to sync all pending sessions to the API.
 * Called:
 *  - On app resume (Capacitor App event)
 *  - After each quiz completion
 *  - On network status change (offline → online)
 */
export async function syncPendingSessions(): Promise<{ synced: number; failed: number }> {
  const status = await Network.getStatus()
  if (!status.connected) return { synced: 0, failed: 0 }

  const { value: deviceId } = await Preferences.get({ key: 'deviceId' })
  const { value: deviceToken } = await Preferences.get({ key: 'deviceToken' })

  if (!deviceId || !deviceToken) return { synced: 0, failed: 0 }

  const pending = await getPendingSessions()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceId}:${deviceToken}`,
      },
      body: JSON.stringify({ deviceId, sessions: pending }),
    })

    if (!res.ok) return { synced: 0, failed: pending.length }

    const { synced } = (await res.json()) as { synced: number; skipped: number }
    const syncedIds = pending.slice(0, synced).map((s) => s.id)
    await markSynced(syncedIds)

    return { synced, failed: 0 }
  } catch {
    return { synced: 0, failed: pending.length }
  }
}

/** Register this device with the API and store the token. */
export async function registerDevice(
  name: string,
  platform: 'android' | 'windows',
  organizationCode: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, platform, organizationCode }),
  })

  if (!res.ok) {
    const body = (await res.json()) as { error: string }
    throw new Error(body.error)
  }

  const { deviceId, deviceToken } = (await res.json()) as {
    deviceId: string
    deviceToken: string
  }

  await Preferences.set({ key: 'deviceId', value: deviceId })
  await Preferences.set({ key: 'deviceToken', value: deviceToken })
}
