// Menu Group — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_menu_group() -> Result<String, String> {
    Ok("Menu Group is connected. Logic coming soon.".to_string())
}
