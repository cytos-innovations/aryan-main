// Tax Summary — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_tax_summary() -> Result<String, String> {
    Ok("Tax Summary is connected. Logic coming soon.".to_string())
}
