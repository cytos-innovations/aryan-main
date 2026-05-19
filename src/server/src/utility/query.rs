use crate::{acquire_pool, AppState};
use bcrypt;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct UserRow {
    pub id: i32,
    pub user_name: String,
    pub last_login: Option<String>,
    pub is_active: i32,
    pub is_super: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedUsers {
    pub data: Vec<UserRow>,
    pub total: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryState {
    pub page: i64,
    pub per_page: i64,
    pub search: String,
    pub sort_by: Option<String>,
    pub sort_dir: String,
}

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub users: i64,
    pub applications: i64,
    pub permissions: i64,
    pub user_permissions: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_dashboard_stats(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<DashboardStats, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let users: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM users WHERE is_active = 1")
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?
            .try_get("count")
            .unwrap_or(0);

    let applications: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM applications WHERE is_active = 1")
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?
            .try_get("count")
            .unwrap_or(0);

    let permissions: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM permissions WHERE is_active = 1")
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?
            .try_get("count")
            .unwrap_or(0);

    let user_permissions: i64 =
        sqlx::query("SELECT COUNT(*) AS count FROM user_permissions WHERE is_active = 1")
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?
            .try_get("count")
            .unwrap_or(0);

    Ok(DashboardStats {
        users,
        applications,
        permissions,
        user_permissions,
    })
}

#[tauri::command]
pub async fn get_users(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedUsers, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("user_name") => "user_name",
        Some("last_login") => "last_login",
        Some("is_active") => "is_active",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row =
        sqlx::query("SELECT COUNT(*) AS count FROM users WHERE user_name ILIKE $1")
            .bind(&search_pattern)
            .fetch_one(&pool)
            .await
            .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, user_name, last_login, is_active, is_super \
         FROM users WHERE user_name ILIKE $1 \
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
        .map(|r| UserRow {
            id: r.try_get("id").unwrap_or(0),
            user_name: r.try_get("user_name").unwrap_or_default(),
            last_login: r
                .try_get::<Option<DateTime<Utc>>, _>("last_login")
                .ok()
                .flatten()
                .map(|dt| dt.to_rfc3339()),
            is_active: r.try_get("is_active").unwrap_or(1),
            is_super: r.try_get("is_super").unwrap_or(0),
        })
        .collect();

    Ok(PagedUsers { data, total })
}

#[tauri::command]
pub async fn create_user(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_name: String,
    password: String,
) -> Result<(), String> {
    if user_name.trim().is_empty() {
        return Err("Username is required".to_string());
    }
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;
    let hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Password hash failed: {e}"))?;

    sqlx::query("INSERT INTO users (user_name, password_hash) VALUES ($1, $2)")
        .bind(user_name.trim())
        .bind(&hash)
        .execute(&pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("unique") || msg.contains("duplicate") || msg.contains("23505") {
                "Username already exists".to_string()
            } else {
                format!("Failed to create user: {e}")
            }
        })?;

    Ok(())
}

#[tauri::command]
pub async fn update_user(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    user_name: String,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE users SET user_name = $1, updated_at = NOW() WHERE id = $2")
        .bind(user_name.trim())
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update user: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_user_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update user: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn change_user_password(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    password: String,
) -> Result<(), String> {
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;
    let hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Password hash failed: {e}"))?;
    sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&hash)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update password: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_user(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete user: {e}"))?;
    Ok(())
}
