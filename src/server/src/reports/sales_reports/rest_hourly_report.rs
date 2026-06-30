// Hourly Report — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_hourly_report() -> Result<String, String> {
    Ok("Hourly Report is connected. Logic coming soon.".to_string())
}
