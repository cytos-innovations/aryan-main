// Customer List — scaffold stub (report logic to be implemented)
#[tauri::command]
pub async fn get_customer_list() -> Result<String, String> {
    Ok("Customer List is connected. Logic coming soon.".to_string())
}
