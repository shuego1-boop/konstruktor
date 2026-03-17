import { openDB, type DBSchema } from 'idb'
import type { QuizSession } from '@konstruktor/shared'

/**
 * IndexedDB schema for offline result storage.
 * Sessions are written here immediately after quiz completion,
 * then synced to the API in the background.
 */
interface KonstruktorDB extends DBSchema {
  sessions: {
    key: string // session.id
    value: QuizSession & { _synced: 0 | 1 }
    indexes: { by_synced: 0 | 1; by_quiz: string }
  }
}

const DB_NAME = 'konstruktor-player'
const DB_VERSION = 1

export async function getDb() {
  return openDB<KonstruktorDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('sessions', { keyPath: 'id' })
      store.createIndex('by_synced', '_synced')
      store.createIndex('by_quiz', 'quizId')
    },
  })
}

/** Save a completed session locally. */
export async function saveSession(session: QuizSession): Promise<void> {
  const db = await getDb()
  await db.put('sessions', { ...session, _synced: 0 })
}

/** Return all sessions not yet synced to the cloud. */
export async function getPendingSessions(): Promise<QuizSession[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('sessions', 'by_synced', 0)
  // Strip internal _synced flag before returning
  return all.map(({ _synced: _, ...session }) => session as QuizSession)
}

/** Mark sessions as synced. */
export async function markSynced(sessionIds: string[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('sessions', 'readwrite')
  await Promise.all(
    sessionIds.map(async (id) => {
      const record = await tx.store.get(id)
      if (record) await tx.store.put({ ...record, _synced: 1 })
    }),
  )
  await tx.done
}
