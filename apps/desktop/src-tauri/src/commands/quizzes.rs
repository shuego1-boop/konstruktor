use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ─── Types ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub subject: Option<String>,
    #[serde(rename = "gradeLevel")]
    pub grade_level: Option<String>,
    /// Parsed Question[]
    pub questions: serde_json::Value,
    /// Parsed QuizSettings
    pub settings: serde_json::Value,
    pub status: String,
    pub version: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "backgroundUrl")]
    pub background_url: Option<String>,
}

// ─── DB helpers ────────────────────────────────────────────────────────────

pub fn db_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("konstruktor.db")
}

pub fn open(app: &AppHandle) -> SqlResult<Connection> {
    let path = db_path(app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let conn = Connection::open(path)?;
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS quizzes (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT 'Новый квиз',
            description TEXT,
            subject     TEXT,
            grade_level TEXT,
            questions   TEXT NOT NULL DEFAULT '[]',
            settings    TEXT NOT NULL DEFAULT '{}',
            status      TEXT NOT NULL DEFAULT 'draft',
            version     INTEGER NOT NULL DEFAULT 1,
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    ")?;
    // Migration: add background_url column if not yet present
    conn.execute("ALTER TABLE quizzes ADD COLUMN background_url TEXT", []).ok();
    // Seed demo quizzes once
    let seeded: Option<String> = conn
        .query_row("SELECT value FROM meta WHERE key='seeded'", [], |r| r.get(0))
        .ok();
    if seeded.is_none() {
        seed_demo_quizzes(&conn)?;
        conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('seeded','1')", [])?;
    }
    Ok(conn)
}

fn seed_demo_quizzes(conn: &Connection) -> SqlResult<()> {
    let settings = serde_json::json!({
        "streakMultiplier": true,
        "showCorrectAnswer": true,
        "shuffleQuestions": false,
        "shuffleAnswers": false,
        "allowRetry": true,
        "showProgressBar": true,
        "soundEnabled": true,
        "animationsEnabled": true,
        "timePerQuestion": 30,
        "theme": {
            "name": "default",
            "primaryColor": "#6366f1",
            "backgroundColor": "#f8fafc",
            "fontFamily": "Inter",
            "borderRadius": "medium",
            "cardStyle": "elevated"
        }
    }).to_string();

    let now = now_iso();

    // ── Quiz 1: История России ─────────────────────────────────────────────
    let id1 = uuid::Uuid::new_v4().to_string();
    let q1 = serde_json::json!([
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "В каком году Пётр I основал Санкт-Петербург?",
            "points": 100,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "1700"},
                {"id": "b", "text": "1703"},
                {"id": "c", "text": "1712"},
                {"id": "d", "text": "1725"}
            ],
            "correctOptionId": "b"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Кто командовал русскими войсками в Бородинском сражении?",
            "points": 100,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "Суворов"},
                {"id": "b", "text": "Ушаков"},
                {"id": "c", "text": "Кутузов"},
                {"id": "d", "text": "Багратион"}
            ],
            "correctOptionId": "c"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "true_false",
            "text": "Отечественная война 1812 года закончилась победой России над Наполеоном.",
            "points": 100,
            "timeLimit": 20,
            "correctAnswer": true
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "В каком году произошла отмена крепостного права в России?",
            "points": 150,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "1825"},
                {"id": "b", "text": "1853"},
                {"id": "c", "text": "1861"},
                {"id": "d", "text": "1881"}
            ],
            "correctOptionId": "c"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Как называлась первая русская печатная книга, изданная Иваном Фёдоровым в 1564 году?",
            "points": 150,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "Апостол"},
                {"id": "b", "text": "Псалтырь"},
                {"id": "c", "text": "Библия"},
                {"id": "d", "text": "Евангелие"}
            ],
            "correctOptionId": "a"
        }
    ]).to_string();

    conn.execute(
        "INSERT INTO quizzes (id,title,description,subject,grade_level,questions,settings,status,version,created_at,updated_at)
         VALUES (?1,'История России — XIX век','Проверь свои знания ключевых событий российской истории XIX века','История','9',?2,?3,'draft',1,?4,?4)",
        params![id1, q1, settings, now],
    )?;

    // ── Quiz 2: Математика ─────────────────────────────────────────────────
    let id2 = uuid::Uuid::new_v4().to_string();
    let q2 = serde_json::json!([
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Чему равно значение выражения: 2³ + 3² ?",
            "points": 100,
            "timeLimit": 20,
            "options": [
                {"id": "a", "text": "13"},
                {"id": "b", "text": "17"},
                {"id": "c", "text": "25"},
                {"id": "d", "text": "29"}
            ],
            "correctOptionId": "b"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "true_false",
            "text": "Число π (пи) является рациональным числом.",
            "points": 100,
            "timeLimit": 15,
            "correctAnswer": false
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Какова площадь квадрата со стороной 7 см?",
            "points": 100,
            "timeLimit": 25,
            "options": [
                {"id": "a", "text": "14 см²"},
                {"id": "b", "text": "28 см²"},
                {"id": "c", "text": "49 см²"},
                {"id": "d", "text": "56 см²"}
            ],
            "correctOptionId": "c"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "multiple_choice",
            "text": "Какие из следующих чисел являются простыми?",
            "points": 150,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "2"},
                {"id": "b", "text": "9"},
                {"id": "c", "text": "13"},
                {"id": "d", "text": "21"},
                {"id": "e", "text": "37"}
            ],
            "correctOptionIds": ["a", "c", "e"]
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Найдите корень уравнения: 3x + 6 = 21",
            "points": 150,
            "timeLimit": 30,
            "options": [
                {"id": "a", "text": "x = 3"},
                {"id": "b", "text": "x = 5"},
                {"id": "c", "text": "x = 7"},
                {"id": "d", "text": "x = 9"}
            ],
            "correctOptionId": "b"
        },
        {
            "id": uuid::Uuid::new_v4().to_string(),
            "type": "single_choice",
            "text": "Чему равна сумма углов треугольника?",
            "points": 100,
            "timeLimit": 15,
            "options": [
                {"id": "a", "text": "90°"},
                {"id": "b", "text": "120°"},
                {"id": "c", "text": "180°"},
                {"id": "d", "text": "360°"}
            ],
            "correctOptionId": "c"
        }
    ]).to_string();

    conn.execute(
        "INSERT INTO quizzes (id,title,description,subject,grade_level,questions,settings,status,version,created_at,updated_at)
         VALUES (?1,'Математика — Основы алгебры и геометрии','Тест на знание базовых понятий алгебры и геометрии для 8 класса','Математика','8',?2,?3,'draft',1,?4,?4)",
        params![id2, q2, settings, now],
    )?;

    Ok(())
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn default_settings() -> serde_json::Value {
    serde_json::json!({
        "streakMultiplier": true,
        "showCorrectAnswer": true,
        "shuffleQuestions": false,
        "shuffleAnswers": false,
        "allowRetry": true,
        "showProgressBar": true,
        "soundEnabled": true,
        "animationsEnabled": true,
        "theme": {
            "name": "default",
            "primaryColor": "#6366f1",
            "backgroundColor": "#f8fafc",
            "fontFamily": "Inter",
            "borderRadius": "medium",
            "cardStyle": "elevated"
        }
    })
}

fn row_to_quiz(row: &rusqlite::Row<'_>) -> SqlResult<QuizRow> {
    let questions_str: String = row.get(5)?;
    let settings_str: String = row.get(6)?;
    Ok(QuizRow {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        subject: row.get(3)?,
        grade_level: row.get(4)?,
        questions: serde_json::from_str(&questions_str)
            .unwrap_or(serde_json::Value::Array(vec![])),
        settings: serde_json::from_str(&settings_str)
            .unwrap_or_else(|_| default_settings()),
        status: row.get(7)?,
        version: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        background_url: row.get::<_, Option<String>>(11).unwrap_or(None),
    })
}

// ─── Tauri commands ────────────────────────────────────────────────────────

/// List all quizzes ordered by updated_at DESC
#[tauri::command]
pub fn list_quizzes(app: AppHandle) -> Result<Vec<QuizRow>, String> {
    let conn = open(&app).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, subject, grade_level, questions, settings, status, version, created_at, updated_at, background_url
             FROM quizzes ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_quiz)
        .map_err(|e| e.to_string())?;
    let mut quizzes = Vec::new();
    for r in rows {
        quizzes.push(r.map_err(|e| e.to_string())?);
    }
    Ok(quizzes)
}

/// Create a blank draft quiz, return its UUID
#[tauri::command]
pub fn create_quiz(app: AppHandle) -> Result<String, String> {
    let conn = open(&app).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    let settings = default_settings().to_string();
    conn.execute(
        "INSERT INTO quizzes (id, title, questions, settings, created_at, updated_at)
         VALUES (?1, 'Новый квиз', '[]', ?2, ?3, ?3)",
        params![id, settings, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(id)
}

/// Get a single quiz by id
#[tauri::command]
pub fn get_quiz(app: AppHandle, id: String) -> Result<QuizRow, String> {
    let conn = open(&app).map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, title, description, subject, grade_level, questions, settings, status, version, created_at, updated_at, background_url
         FROM quizzes WHERE id = ?1",
        params![id],
        row_to_quiz,
    )
    .map_err(|e| format!("Quiz not found: {e}"))
}

/// Partial update — only non-null fields in the JSON patch are applied
#[tauri::command]
pub fn update_quiz(app: AppHandle, id: String, data: serde_json::Value) -> Result<QuizRow, String> {
    let conn = open(&app).map_err(|e| e.to_string())?;
    let now = now_iso();

    // Build dynamic SET clause
    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();

    let field_map = [
        ("title", "title"),
        ("description", "description"),
        ("subject", "subject"),
        ("gradeLevel", "grade_level"),
        ("questions", "questions"),
        ("settings", "settings"),
        ("status", "status"),
        ("version", "version"),
        ("backgroundUrl", "background_url"),
    ];

    for (json_key, col) in &field_map {
        if let Some(val) = data.get(json_key) {
            sets.push(format!("{col} = ?{}", values.len() + 1));
            let s = match val {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            values.push(s);
        }
    }
    sets.push(format!("updated_at = ?{}", values.len() + 1));
    values.push(now);

    let id_idx = values.len() + 1;
    values.push(id.clone());

    let sql = format!("UPDATE quizzes SET {} WHERE id = ?{id_idx}", sets.join(", "));
    conn.execute(&sql, rusqlite::params_from_iter(values.iter()))
        .map_err(|e| e.to_string())?;

    // Return updated row
    get_quiz(app, id)
}

/// Hard-delete: remove the quiz row permanently
#[tauri::command]
pub fn delete_quiz(app: AppHandle, id: String) -> Result<(), String> {
    let conn = open(&app).map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM quizzes WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
