mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::pack::export_pack,
            commands::pack::import_pack,
            commands::pack::get_pack_manifest,
            commands::server::start_local_server,
            commands::server::stop_local_server,
            commands::quizzes::list_quizzes,
            commands::quizzes::create_quiz,
            commands::quizzes::get_quiz,
            commands::quizzes::update_quiz,
            commands::quizzes::delete_quiz,
            commands::ai::generate_background,
            commands::ai::get_background,
            commands::ai::upload_background,
            commands::ai::generate_quiz_questions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
