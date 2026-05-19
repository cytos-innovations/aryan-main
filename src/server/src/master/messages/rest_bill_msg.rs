use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for bill_message
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct BillMessageRow {
    pub id: i32,
    pub code: i64,
    pub message_text: String,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedBillMessages {
    pub data: Vec<BillMessageRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Helper — parse "YYYY-MM-DD" string to NaiveDateTime
// ─────────────────────────────────────────────────────────────

fn parse_date(s: &Option<String>) -> Option<NaiveDateTime> {
    s.as_deref().and_then(|s| {
        let s = s.trim();
        if s.is_empty() {
            return None;
        }
        NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
            .ok()
            .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
            .or_else(|| {
                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                    .ok()
                    .and_then(|d| d.and_hms_opt(0, 0, 0))
            })
    })
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_bill_messages(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedBillMessages, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("message_text") => "message_text",
        Some("valid_from") => "valid_from",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM bill_message WHERE message_text ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, message_text, valid_from, valid_to, is_active \
         FROM bill_message WHERE message_text ILIKE $1 \
         ORDER BY {} {} LIMIT $2 OFFSET $3",
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
        .map(|r| BillMessageRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            message_text: r.try_get("message_text").unwrap_or_default(),
            valid_from: r
                .try_get::<Option<NaiveDateTime>, _>("valid_from")
                .ok()
                .flatten()
                .map(|dt| dt.format("%Y-%m-%d").to_string()),
            valid_to: r
                .try_get::<Option<NaiveDateTime>, _>("valid_to")
                .ok()
                .flatten()
                .map(|dt| dt.format("%Y-%m-%d").to_string()),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedBillMessages { data, total })
}

#[tauri::command]
pub async fn create_bill_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    message_text: String,
    valid_from: Option<String>,
    valid_to: Option<String>,
) -> Result<(), String> {
    let message_text = message_text.trim().to_string();
    if message_text.is_empty() {
        return Err("Message text is required".to_string());
    }

    let from_dt = parse_date(&valid_from);
    let to_dt = parse_date(&valid_to);

    if let (Some(from), Some(to)) = (from_dt, to_dt) {
        if to < from {
            return Err("To date must be on or after From date".to_string());
        }
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "INSERT INTO bill_message (message_text, valid_from, valid_to) VALUES ($1, $2, $3)",
    )
    .bind(&message_text)
    .bind(parse_date(&valid_from))
    .bind(parse_date(&valid_to))
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to create bill message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn update_bill_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    message_text: String,
    valid_from: Option<String>,
    valid_to: Option<String>,
) -> Result<(), String> {
    let message_text = message_text.trim().to_string();
    if message_text.is_empty() {
        return Err("Message text is required".to_string());
    }

    let from_dt = parse_date(&valid_from);
    let to_dt = parse_date(&valid_to);

    if let (Some(from), Some(to)) = (from_dt, to_dt) {
        if to < from {
            return Err("To date must be on or after From date".to_string());
        }
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE bill_message SET \
         message_text = $1, valid_from = $2, valid_to = $3, updated_at = NOW() \
         WHERE id = $4",
    )
    .bind(&message_text)
    .bind(parse_date(&valid_from))
    .bind(parse_date(&valid_to))
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update bill message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_bill_message_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE bill_message SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update bill message: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_bill_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM bill_message WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete bill message: {e}"))?;

    Ok(())
}
