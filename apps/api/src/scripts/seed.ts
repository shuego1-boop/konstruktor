/**
 * Seed script — creates a demo organization and teacher account.
 * Run AFTER the API is started: bun run db:seed
 *
 * Credentials: admin@konstruktor.local / password123
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth.ts'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) throw new Error('DATABASE_URL is required')

const client = postgres(connectionString)
const db = drizzle(client, { schema })

const ORG_NAME = 'Demo School'
const ORG_CODE = 'DEMO-001'
const USER_EMAIL = 'admin@konstruktor.local'
const USER_NAME = 'Admin Teacher'
const USER_PASSWORD = 'password123'

async function seed() {
  // ── Organization ───────────────────────────────────────────────────────────
  let [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.registrationCode, ORG_CODE))

  if (!org) {
    ;[org] = await db
      .insert(schema.organizations)
      .values({ name: ORG_NAME, registrationCode: ORG_CODE })
      .returning()
    console.log('✓ Organization created:', org!.name)
  } else {
    console.log('– Organization already exists:', org.name)
  }

  // ── App user (our users table) ─────────────────────────────────────────────
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, USER_EMAIL))

  if (!existingUser) {
    await db.insert(schema.users).values({
      email: USER_EMAIL,
      name: USER_NAME,
      role: 'teacher',
      organizationId: org!.id,
    })
    console.log('✓ App user created:', USER_EMAIL)
  } else {
    console.log('– App user already exists:', USER_EMAIL)
  }

  // ── Better Auth user — use Better Auth API so password is hashed correctly ─
  const [existingAuthUser] = await db
    .select()
    .from(schema.authUser)
    .where(eq(schema.authUser.email, USER_EMAIL))

  if (!existingAuthUser) {
    // Use Better Auth's internal API — correct password hashing (scrypt)
    const result = await auth.api.signUpEmail({
      body: {
        email: USER_EMAIL,
        password: USER_PASSWORD,
        name: USER_NAME,
      },
    })

    if (!result?.user) {
      throw new Error('Better Auth sign-up failed: ' + JSON.stringify(result))
    }

    console.log('✓ Better Auth user created:', USER_EMAIL)
  } else {
    console.log('– Better Auth user already exists:', USER_EMAIL)
  }

  console.log('\n✅ Seed complete!')
  console.log(`   Login: ${USER_EMAIL}`)
  console.log(`   Password: ${USER_PASSWORD}`)
  console.log(`   Org registration code: ${ORG_CODE}`)

  // ── Sample quizzes ─────────────────────────────────────────────────────────
  const [appUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, USER_EMAIL))

  if (appUser) {
    const existingQuizzes = await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.teacherId, appUser.id))

    if (existingQuizzes.length === 0) {
      const defaultSettings = {
        streakMultiplier: true,
        showCorrectAnswer: true,
        shuffleQuestions: false,
        shuffleAnswers: false,
        allowRetry: true,
        showProgressBar: true,
        soundEnabled: true,
        animationsEnabled: true,
        theme: { name: 'default', primaryColor: '#6366f1', backgroundColor: '#f8fafc', fontFamily: 'Inter', borderRadius: 'medium', cardStyle: 'elevated' },
      }

      const sampleQuizzes = [
        {
          teacherId: appUser.id,
          title: 'Математика — Алгебра 8 кл.',
          subject: 'Математика',
          gradeLevel: '8',
          status: 'published' as const,
          shareCode: 'MTH-001',
          questions: [
            { id: '1', type: 'single_choice', text: 'Чему равно 2²?', options: ['2', '4', '8', '16'], correctIndex: 1 },
            { id: '2', type: 'single_choice', text: 'Чему равно √16?', options: ['2', '4', '6', '8'], correctIndex: 1 },
          ],
          settings: { ...defaultSettings, timePerQuestion: 30 },
        },
        {
          teacherId: appUser.id,
          title: 'История России — XIX век',
          subject: 'История',
          gradeLevel: '9',
          status: 'published' as const,
          shareCode: 'HST-001',
          questions: [
            { id: '1', type: 'single_choice', text: 'В каком году произошла Отечественная война?', options: ['1805', '1812', '1825', '1853'], correctIndex: 1 },
          ],
          settings: { ...defaultSettings, timePerQuestion: 45 },
        },
        {
          teacherId: appUser.id,
          title: 'Биология — Клетка (черновик)',
          subject: 'Биология',
          gradeLevel: '7',
          status: 'draft' as const,
          shareCode: 'BIO-001',
          questions: [],
          settings: defaultSettings,
        },
      ]

      await db.insert(schema.quizzes).values(sampleQuizzes)
      console.log('✓ Sample quizzes created:', sampleQuizzes.length)
    } else {
      console.log('– Quizzes already exist:', existingQuizzes.length)
    }
  }

  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
