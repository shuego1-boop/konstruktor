use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct PackManifest {
    pub version: u8,
    pub quiz_id: String,
    pub quiz_version: u32,
    pub title: String,
    pub created_at: String,
    pub asset_count: u32,
    pub checksum: String,
}

/// Export a quiz (.pack file = ZIP with quiz.json + manifest.json)
///
/// Called from JS:
///   const path = await save({ defaultPath: 'quiz.pack', ... })
///   await invoke('export_pack', { quizId, outputPath: path })
#[tauri::command]
pub async fn export_pack(
    app: AppHandle,
    quiz_id: String,
    output_path: String,
) -> Result<String, String> {
    // Fetch quiz row from local SQLite
    let conn = super::quizzes::open(&app).map_err(|e| e.to_string())?;
    let (title, questions_str, settings_str, status, version, created_at, updated_at,
         description, subject, grade_level): (
        String, String, String, String, i64, String, String,
        Option<String>, Option<String>, Option<String>,
    ) = conn
        .query_row(
            "SELECT title, questions, settings, status, version, created_at, updated_at,
                    description, subject, grade_level
             FROM quizzes WHERE id = ?1",
            rusqlite::params![quiz_id],
            |row| {
                Ok((
                    row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
                    row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?,
                ))
            },
        )
        .map_err(|e| format!("Quiz not found: {e}"))?;

    // Build quiz JSON — embed questions/settings as parsed JSON values
    let questions: serde_json::Value =
        serde_json::from_str(&questions_str).unwrap_or(serde_json::Value::Array(vec![]));
    let settings: serde_json::Value =
        serde_json::from_str(&settings_str).unwrap_or(serde_json::Value::Object(Default::default()));

    let quiz_json = serde_json::to_string(&serde_json::json!({
        "id": quiz_id,
        "title": title,
        "description": description,
        "subject": subject,
        "gradeLevel": grade_level,
        "questions": questions,
        "settings": settings,
        "status": status,
        "version": version,
        "createdAt": created_at,
        "updatedAt": updated_at,
    }))
    .map_err(|e| e.to_string())?;

    // Compute SHA-256 checksum of quiz.json
    let mut hasher = Sha256::new();
    hasher.update(quiz_json.as_bytes());
    let checksum = hex::encode(hasher.finalize());

    let manifest = PackManifest {
        version: 1,
        quiz_id: quiz_id.clone(),
        quiz_version: version as u32,
        title: title.clone(),
        created_at: chrono::Utc::now().to_rfc3339(),
        asset_count: 0,
        checksum,
    };
    let manifest_json = serde_json::to_string(&manifest).map_err(|e| e.to_string())?;

    // Create ZIP at output_path
    let file = std::fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    zip.start_file("quiz.json", options).map_err(|e| e.to_string())?;
    zip.write_all(quiz_json.as_bytes()).map_err(|e| e.to_string())?;

    zip.start_file("manifest.json", options).map_err(|e| e.to_string())?;
    zip.write_all(manifest_json.as_bytes()).map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    Ok(output_path)
}

/// Read manifest from a .pack file without fully extracting it.
#[tauri::command]
pub async fn get_pack_manifest(pack_path: String) -> Result<PackManifest, String> {
    let file = std::fs::File::open(&pack_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut manifest_file = archive
        .by_name("manifest.json")
        .map_err(|_| "manifest.json not found in pack".to_string())?;

    let mut contents = String::new();
    manifest_file.read_to_string(&mut contents).map_err(|e| e.to_string())?;

    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

/// Import (unzip) a .pack file — returns the quiz.json contents.
#[tauri::command]
pub async fn import_pack(pack_path: String) -> Result<String, String> {
    let file = std::fs::File::open(&pack_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut quiz_file = archive
        .by_name("quiz.json")
        .map_err(|_| "quiz.json not found in pack".to_string())?;

    let mut contents = String::new();
    quiz_file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
    Ok(contents)
}
