// Sales Summary — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_sales_summary() -> Result<String, String> {
    Ok("Sales Summary is connected. Logic coming soon.".to_string())
}
