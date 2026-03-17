# API Specification

Base URL: `https://api.konstruktor.app` (prod) / `http://localhost:3000` (dev)

All requests and responses use `application/json`. Auth via Better Auth session cookie or `Authorization: Bearer <token>` header.

---

## Authentication

Handled by Better Auth. Endpoints at `/api/auth/**` (Better Auth standard routes).

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sign-in/email` | Sign in with email + password |
| POST | `/api/auth/sign-up/email` | Register teacher |
| POST | `/api/auth/sign-out` | Sign out |
| GET | `/api/auth/session` | Get current session |

---

## Quizzes

### `GET /quizzes`
Returns all quizzes for the authenticated teacher.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "title": "Biology Chapter 3",
    "subject": "Biology",
    "status": "published",
    "version": 2,
    "questionCount": 10,
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-03-15T14:30:00Z"
  }
]
```

---

### `POST /quizzes`
Create a new quiz (starts as draft).

**Request body:** `CreateQuizInput` (validated with Zod)
```json
{
  "title": "Biology Chapter 3",
  "subject": "Biology",
  "gradeLevel": "Grade 9"
}
```

**Response 201:** Full quiz object.

---

### `GET /quizzes/:id`
Get a full quiz including all questions.

**Response 200:** Full `Quiz` object from `@konstruktor/shared`.
**Response 404:** Quiz not found or not owned by caller.

---

### `PUT /quizzes/:id`
Update quiz (title, questions, settings). Increments `version` on publish.

**Request body:** `UpdateQuizInput`

---

### `DELETE /quizzes/:id`
Soft-delete (sets status to `archived`).

---

### `POST /quizzes/:id/publish`
Publishes a draft quiz. Increments version. Returns updated quiz.

---

### `GET /quizzes/:id/export`
Generates a `.pack` download. Returns a pre-signed DO Spaces URL for the generated pack file.

**Response 200:**
```json
{ "downloadUrl": "https://konstruktor-assets.ams3.cdn.digitaloceanspaces.com/packs/..." }
```

---

## Results (Quiz Sessions)

### `POST /sessions`
Bulk-sync sessions from a player device. Idempotent — duplicate session IDs are ignored.

**Auth:** Device JWT token (not teacher session).

**Request body:**
```json
{
  "deviceId": "uuid",
  "sessions": [
    {
      "id": "uuid",
      "quizId": "uuid",
      "quizVersion": 2,
      "playerName": "Иванов Иван",
      "startedAt": "2026-03-17T09:00:00Z",
      "completedAt": "2026-03-17T09:08:00Z",
      "score": 80,
      "totalPoints": 100,
      "earnedPoints": 80,
      "isPassed": true,
      "answers": [...]
    }
  ]
}
```

**Response 200:** `{ "synced": 3, "skipped": 0 }`

---

### `GET /quizzes/:id/sessions`
All sessions for a quiz. Teacher only.

**Query params:** `?from=ISO_DATE&to=ISO_DATE&playerName=search`

**Response 200:** Array of session summaries.

---

### `GET /sessions/:id`
Full session detail including all question answers.

---

## Analytics

### `GET /quizzes/:id/analytics`
Aggregated analytics for a quiz.

**Response 200:**
```json
{
  "totalSessions": 42,
  "completedSessions": 40,
  "averageScore": 73.5,
  "averageDurationSeconds": 480,
  "passRate": 0.85,
  "questionStats": [
    {
      "questionId": "uuid",
      "questionText": "What is...",
      "correctRate": 0.62,
      "averageResponseTimeMs": 8400
    }
  ],
  "scoreDistribution": [
    { "bucket": "0-20", "count": 1 },
    { "bucket": "21-40", "count": 3 },
    { "bucket": "41-60", "count": 8 },
    { "bucket": "61-80", "count": 15 },
    { "bucket": "81-100", "count": 13 }
  ]
}
```

---

## Devices

### `POST /devices/register`
Register a new player device. Called once during device setup.

**Request body:**
```json
{
  "name": "Classroom 3 Tablet",
  "platform": "android",
  "organizationCode": "ORG-ABC123"
}
```

**Response 201:**
```json
{
  "deviceId": "uuid",
  "deviceToken": "eyJ..."
}
```

The `deviceToken` is a long-lived JWT stored in Capacitor Preferences (secure storage). Used as Bearer token for `/sessions` sync.

---

## File Uploads

### `POST /uploads/presign`
Get a pre-signed URL to upload a file directly to DO Spaces.

**Auth:** Teacher session required.

**Request body:**
```json
{
  "filename": "diagram.png",
  "contentType": "image/png",
  "size": 204800
}
```

**Response 200:**
```json
{
  "uploadUrl": "https://ams3.digitaloceanspaces.com/...",
  "publicUrl": "https://konstruktor-assets.ams3.cdn.digitaloceanspaces.com/..."
}
```

Files are **never** proxied through the API — always uploaded directly to DO Spaces.

---

## Error Format

All errors return a consistent shape:

```json
{
  "error": "Quiz not found",
  "code": "QUIZ_NOT_FOUND"
}
```

HTTP status codes follow REST conventions: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error).
