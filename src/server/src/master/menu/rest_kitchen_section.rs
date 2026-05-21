use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact kitchen_section schema columns
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct KitchenSectionRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub is_print_enabled: bool,
    pub printer_name: Option<String>,
    pub printer_type: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedKitchenSections {
    pub data: Vec<KitchenSectionRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated) — used by the master screen
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_kitchen_section_list(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedKitchenSections, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM kitchen_section WHERE name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT id, code, name, is_print_enabled, printer_name, printer_type, is_active \
         FROM kitchen_section \
         WHERE name ILIKE $1 \
         ORDER BY {} {} LIMIT $2 OFFSET $3",
        order_col, dir
    );

    let rows = sqlx::query(&sql)
        .bind(&pattern)
        .bind(qs.per_page)
        .bind(offset)
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows.iter().map(|r| KitchenSectionRow {
        id:               r.try_get("id").unwrap_or(0),
        code:             r.try_get("code").unwrap_or(0),
        name:             r.try_get("name").unwrap_or_default(),
        is_print_enabled: r.try_get("is_print_enabled").unwrap_or(true),
        printer_name:     r.try_get("printer_name").ok().flatten(),
        printer_type:     r.try_get("printer_type").ok().flatten(),
        is_active:        r.try_get("is_active").unwrap_or(true),
    }).collect();

    Ok(PagedKitchenSections { data, total })
}

// ─────────────────────────────────────────────────────────────
// Create  (code optional — BIGSERIAL auto-generates if null)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_kitchen_section(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    is_print_enabled: bool,
    printer_name: Option<String>,
    printer_type: Option<String>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Section name is required".to_string());
    }

    let printer_name = printer_name.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let printer_type = printer_type.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            "Section name or code already exists".to_string()
        } else {
            format!("Failed to create kitchen section: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO kitchen_section (code, name, is_print_enabled, printer_name, printer_type) \
             VALUES ($1, $2, $3, $4, $5) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(is_print_enabled)
        .bind(&printer_name)
        .bind(&printer_type)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO kitchen_section (name, is_print_enabled, printer_name, printer_type) \
             VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(&name)
        .bind(is_print_enabled)
        .bind(&printer_name)
        .bind(&printer_type)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    };

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_kitchen_section(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    is_print_enabled: bool,
    printer_name: Option<String>,
    printer_type: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() { return Err("Section name is required".to_string()); }
    if code <= 0       { return Err("Section code is required".to_string()); }

    let printer_name = printer_name.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let printer_type = printer_type.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE kitchen_section \
         SET code = $1, name = $2, is_print_enabled = $3, \
             printer_name = $4, printer_type = $5, updated_at = NOW() \
         WHERE id = $6",
    )
    .bind(code)
    .bind(&name)
    .bind(is_print_enabled)
    .bind(&printer_name)
    .bind(&printer_type)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            "Section name or code already exists".to_string()
        } else {
            format!("Failed to update kitchen section: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_kitchen_section_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE kitchen_section SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update kitchen section: {e}"))?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn delete_kitchen_section(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM kitchen_section WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete kitchen section: {e}"))?;
    Ok(())
}
