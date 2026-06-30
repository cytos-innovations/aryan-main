// Codewise Menu — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_codewise_menu() -> Result<String, String> {
    Ok("Codewise Menu is connected. Logic coming soon.".to_string())
}
