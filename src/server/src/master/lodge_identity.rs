use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — identity_type table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct IdentityTypeRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct IdentityTypeSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct PagedIdentityTypes {
    pub data: Vec<IdentityTypeRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_identity_types(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedIdentityTypes, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM identity_type WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, is_active \
         FROM identity_type WHERE name ILIKE $1 \
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
        .map(|r| IdentityTypeRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedIdentityTypes { data, total })
}

#[tauri::command]
pub async fn get_all_identity_types(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<IdentityTypeSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name FROM identity_type WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| IdentityTypeSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn create_identity_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    name: String,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Identity type name is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Code or identity type name already exists".to_string()
        } else {
            format!("Failed to create identity type: {e}")
        }
    };

    if let Some(code_val) = code {
        sqlx::query("INSERT INTO identity_type (code, name) VALUES ($1, $2)")
            .bind(code_val)
            .bind(&name)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    } else {
        sqlx::query("INSERT INTO identity_type (name) VALUES ($1)")
            .bind(&name)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_identity_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Identity type name is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE identity_type SET name = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&name)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Identity type name already exists".to_string()
        } else {
            format!("Failed to update identity type: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_identity_type_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE identity_type SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update identity type: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_identity_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM identity_type WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete identity type: {e}"))?;

    Ok(())
}
