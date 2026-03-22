use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn bg_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir")
        .join("backgrounds")
}

#[derive(Deserialize)]
struct ImageData {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    b64_json: Option<String>,
}

#[derive(Deserialize)]
struct ImagesResponse {
    data: Vec<ImageData>,
}

/// Call AI Tunnel to generate a background image, save to disk, return file path.
#[tauri::command]
pub async fn generate_background(
    app: AppHandle,
    quiz_id: String,
    prompt: String,
    api_key: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "model": "gpt-image-1-mini",
        "prompt": prompt,
        "n": 1,
        "size": "1536x1024",
        "quality": "medium"
    });

    let resp = client
        .post("https://api.aitunnel.ru/v1/images/generations")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ошибка соединения: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Ошибка API ({status}): {text}"));
    }

    let gen: ImagesResponse = resp
        .json()
        .await
        .map_err(|e| format!("Ошибка ответа API: {e}"))?;

    let item = gen
        .data
        .into_iter()
        .next()
        .ok_or_else(|| "Пустой ответ от API".to_string())?;

    let dir = bg_dir(&app);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{quiz_id}.png"));

    if let Some(b64) = item.b64_json {
        // Decode base64 image directly
        let bytes = STANDARD
            .decode(&b64)
            .map_err(|e| format!("Ошибка декодирования base64: {e}"))?;
        std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    } else if let Some(image_url) = item.url {
        // Download the generated image by URL
        let img_resp = client
            .get(&image_url)
            .send()
            .await
            .map_err(|e| format!("Ошибка загрузки изображения: {e}"))?;
        let bytes = img_resp
            .bytes()
            .await
            .map_err(|e| format!("Ошибка чтения: {e}"))?;
        std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    } else {
        return Err("API не вернул ни URL, ни base64 данные".to_string());
    }

    Ok(path.to_string_lossy().to_string())
}

/// Read a cached background image and return as base64 data URL.
#[tauri::command]
pub fn get_background(app: AppHandle, quiz_id: String) -> Result<String, String> {
    let path = bg_dir(&app).join(format!("{quiz_id}.png"));
    if !path.exists() {
        return Err("Фон не найден".to_string());
    }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{b64}"))
}

/// Copy a user-selected image file into the backgrounds cache and return the saved path.
#[tauri::command]
pub fn upload_background(app: AppHandle, quiz_id: String, src_path: String) -> Result<String, String> {
    let src = std::path::Path::new(&src_path);
    if !src.exists() {
        return Err("Файл не найден".to_string());
    }
    let bytes = std::fs::read(src).map_err(|e| format!("Ошибка чтения файла: {e}"))?;
    let dir = bg_dir(&app);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = dir.join(format!("{quiz_id}.png"));
    std::fs::write(&dest, &bytes).map_err(|e| format!("Ошибка сохранения: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

// ─── Chat-completion helpers ─────────────────────────────────────────────────

#[derive(Deserialize)]
struct ChatMessage {
    content: String,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

/// Call gpt-5-nano to generate quiz questions. Returns the raw JSON string from the model.
#[tauri::command]
pub async fn generate_quiz_questions(
    topic: String,
    question_count: u8,
    question_types: Vec<String>,
    grade_level: String,
    api_key: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let types_desc = question_types.join(", ");

    let system_prompt = r#"You are an educational quiz generator. Return a JSON object with a "questions" array.
Each question must follow one of these formats based on its type:

single_choice: {"type":"single_choice","text":"Question?","options":["A","B","C","D"],"correctOptionIndex":0}
multiple_choice: {"type":"multiple_choice","text":"Question?","options":["A","B","C","D"],"correctOptionIndices":[0,2]}
true_false: {"type":"true_false","text":"Statement.","correctAnswer":true}
text_input: {"type":"text_input","text":"Question?","correctAnswers":["answer","alternative spelling"]}
fill_blank: {"type":"fill_blank","text":"The capital of France is [blank].","blanks":[{"position":0,"acceptedAnswers":["Paris"]}]}
matching: {"type":"matching","text":"Match the items","pairs":[{"left":"Cat","right":"Кот"},{"left":"Dog","right":"Собака"},{"left":"Fish","right":"Рыба"},{"left":"Bird","right":"Птица"}]}
ordering: {"type":"ordering","text":"Put these in chronological order","items":["First event","Second event","Third event","Fourth event"]}

Rules:
- Use ONLY the question types listed by the user
- Write ALL question texts and answers in Russian
- For single_choice and multiple_choice provide exactly 4 options
- For matching provide at least 4 pairs
- For ordering provide at least 4 items
- Never include any IDs in your response
- Return only the JSON object, nothing else"#;

    let user_prompt = format!(
        "Topic: {topic}\nGrade level: {grade_level}\nNumber of questions: {question_count}\nQuestion types to use: {types_desc}\n\nGenerate {question_count} educational quiz questions about the topic above for grade {grade_level}. Use only the specified question types."
    );

    let body = serde_json::json!({
        "model": "gpt-5-nano",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7
    });

    let resp = client
        .post("https://api.aitunnel.ru/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ошибка соединения: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Ошибка API ({status}): {text}"));
    }

    let chat: ChatResponse = resp
        .json()
        .await
        .map_err(|e| format!("Ошибка ответа API: {e}"))?;

    let content = chat
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "Пустой ответ от API".to_string())?;

    Ok(content)
}

/// Read a local image file and return it as a base64 data URL.
/// Used by the hotspot image picker to embed images into quiz JSON.
#[tauri::command]
pub fn read_image_as_data_url(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("Файл не найден".to_string());
    }
    let bytes = std::fs::read(p).map_err(|e| format!("Ошибка чтения: {e}"))?;
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/png",
    };
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}
