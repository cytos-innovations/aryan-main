// Party List — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_party_list() -> Result<String, String> {
    Ok("Party List is connected. Logic coming soon.".to_string())
}
