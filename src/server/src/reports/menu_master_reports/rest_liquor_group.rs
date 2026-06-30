// Liquor Group — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_liquor_group() -> Result<String, String> {
    Ok("Liquor Group is connected. Logic coming soon.".to_string())
}
