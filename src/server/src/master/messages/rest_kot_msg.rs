use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for kot_message
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct KotMessageRow {
    pub id: i32,
    pub code: i64,
    pub kot_message: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedKotMessages {
    pub data: Vec<KotMessageRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_kot_messages(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedKotMessages, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("kot_message") => "kot_message",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM kot_message WHERE kot_message ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, kot_message, is_active FROM kot_message \
         WHERE kot_message ILIKE $1 ORDER BY {} {} LIMIT $2 OFFSET $3",
        order_col, dir
    );

    let rows = sqlx::query(&sql)
        .bind(&search_pattern)
        .bind(qs.per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| KotMessageRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            kot_message: r.try_get("kot_message").unwrap_or_default(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedKotMessages { data, total })
}

#[tauri::command]
pub async fn create_kot_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    kot_message: String,
) -> Result<(), String> {
    let kot_message = kot_message.trim().to_string();
    if kot_message.is_empty() {
        return Err("KOT message is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("INSERT INTO kot_message (kot_message) VALUES ($1)")
        .bind(&kot_message)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to create KOT message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn update_kot_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    kot_message: String,
) -> Result<(), String> {
    let kot_message = kot_message.trim().to_string();
    if kot_message.is_empty() {
        return Err("KOT message is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE kot_message SET kot_message = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&kot_message)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update KOT message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_kot_message_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE kot_message SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update KOT message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_kot_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM kot_message WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete KOT message: {e}"))?;

    Ok(())
}
