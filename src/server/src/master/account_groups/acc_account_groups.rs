use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AccountGroupRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub category_id: Option<i32>,
    pub category_name: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedAccountGroups {
    pub data: Vec<AccountGroupRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct AccountCategorySimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_account_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedAccountGroups, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "ag.code",
        Some("name") => "ag.name",
        _ => "ag.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM account_groups ag WHERE ag.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT ag.id, ag.code, ag.name, ag.category_id, ac.name AS category_name, ag.is_active \
         FROM account_groups ag \
         LEFT JOIN account_categories ac ON ac.id = ag.category_id \
         WHERE ag.name ILIKE $1 \
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

    let data = rows
        .iter()
        .map(|r| AccountGroupRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            category_id: r.try_get("category_id").ok().flatten(),
            category_name: r.try_get("category_name").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedAccountGroups { data, total })
}

// ─────────────────────────────────────────────────────────────
// Dropdown data
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_account_categories(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AccountCategorySimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM account_categories WHERE is_active = 1 ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| AccountCategorySimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_account_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    category_id: Option<i32>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Group code or name already exists".to_string()
        } else {
            format!("Failed to create account group: {e}")
        }
    };

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO account_groups (code, name, category_id) \
             VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(category_id)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO account_groups (name, category_id) \
             VALUES ($1, $2) RETURNING id",
        )
        .bind(&name)
        .bind(category_id)
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
pub async fn update_account_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    category_id: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    if code <= 0 {
        return Err("Group code is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE account_groups SET code = $1, name = $2, category_id = $3, \
         updated_at = NOW() WHERE id = $4",
    )
    .bind(code)
    .bind(&name)
    .bind(category_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Group code or name already exists".to_string()
        } else {
            format!("Failed to update account group: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_account_group_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE account_groups SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update account group: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_account_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM account_groups WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete account group: {e}"))?;
    Ok(())
}
