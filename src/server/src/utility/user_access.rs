use crate::{acquire_pool, ApplicationInfo, AppState};
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Serialize)]
pub struct SimpleUser {
    pub id: i32,
    pub user_name: String,
}

#[derive(Debug, Serialize)]
pub struct PermissionWithStatus {
    pub id: i32,
    pub permission_name: String,
    pub action: String,
    pub description: Option<String>,
    pub assigned: bool,
}

#[derive(Debug, Serialize)]
pub struct AppWithAssignment {
    pub id: i32,
    pub code: String,
    pub application_name: String,
    pub assigned: bool,
}

// ─────────────────────────────────────────────────────────────
// User queries
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_users(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SimpleUser>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows =
        sqlx::query("SELECT id, user_name FROM users WHERE is_active = 1 ORDER BY user_name")
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| SimpleUser {
            id: r.try_get("id").unwrap_or(0),
            user_name: r.try_get("user_name").unwrap_or_default(),
        })
        .collect())
}

// ─────────────────────────────────────────────────────────────
// Application queries
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_applications(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ApplicationInfo>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, application_name FROM applications WHERE is_active = 1 ORDER BY application_name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| ApplicationInfo {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or_default(),
            application_name: r.try_get("application_name").unwrap_or_default(),
        })
        .collect())
}

/// Returns only the applications assigned to a specific user.
/// Used to populate the Application dropdown after user selection.
#[tauri::command]
pub async fn get_applications_for_user(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
) -> Result<Vec<ApplicationInfo>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        r#"
        SELECT a.id, a.code, a.application_name
        FROM applications a
        INNER JOIN user_applications ua ON ua.application_id = a.id
        WHERE ua.user_id = $1
          AND a.is_active = 1
          AND ua.is_active = 1
        ORDER BY a.application_name
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| ApplicationInfo {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or_default(),
            application_name: r.try_get("application_name").unwrap_or_default(),
        })
        .collect())
}

/// Returns all applications with an `assigned` flag indicating whether
/// the given user has access. Used in the Application tab (super user only).
#[tauri::command]
pub async fn get_all_apps_with_assignment(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
) -> Result<Vec<AppWithAssignment>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        r#"
        SELECT
            a.id,
            a.code,
            a.application_name,
            CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END AS assigned
        FROM applications a
        LEFT JOIN user_applications ua
            ON ua.application_id = a.id
            AND ua.user_id = $1
            AND ua.is_active = 1
        WHERE a.is_active = 1
        ORDER BY a.application_name
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| AppWithAssignment {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or_default(),
            application_name: r.try_get("application_name").unwrap_or_default(),
            assigned: r.try_get::<i32, _>("assigned").unwrap_or(0) == 1,
        })
        .collect())
}

/// Replaces the full set of application assignments for a user.
#[tauri::command]
pub async fn set_user_applications(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
    application_ids: Vec<i32>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Transaction failed: {e}"))?;

    // Remove all existing assignments for this user
    sqlx::query("DELETE FROM user_applications WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to clear application assignments: {e}"))?;

    // Insert new assignments
    for app_id in &application_ids {
        sqlx::query(
            "INSERT INTO user_applications (user_id, application_id) VALUES ($1, $2)",
        )
        .bind(user_id)
        .bind(app_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to assign application: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Commit failed: {e}"))?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Permission queries
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_user_access(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
) -> Result<Vec<PermissionWithStatus>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        r#"
        SELECT
            p.id,
            p.permission_name,
            p.action,
            p.description,
            CASE WHEN up.id IS NOT NULL THEN 1 ELSE 0 END AS assigned
        FROM permissions p
        LEFT JOIN user_permissions up
            ON up.permission_id = p.id
            AND up.user_id = $1
            AND up.is_active = 1
        WHERE p.is_active = 1
        ORDER BY p.permission_name
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| PermissionWithStatus {
            id: r.try_get("id").unwrap_or(0),
            permission_name: r.try_get("permission_name").unwrap_or_default(),
            action: r.try_get("action").unwrap_or_default(),
            description: r.try_get("description").ok().flatten(),
            assigned: r.try_get::<i32, _>("assigned").unwrap_or(0) == 1,
        })
        .collect())
}

#[tauri::command]
pub async fn set_user_permissions(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
    permission_ids: Vec<i32>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Transaction failed: {e}"))?;

    // Deactivate all permissions for this user
    sqlx::query("UPDATE user_permissions SET is_active = 0 WHERE user_id = $1")
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to deactivate permissions: {e}"))?;

    // Insert or reactivate each checked permission
    for perm_id in &permission_ids {
        sqlx::query(
            r#"
            INSERT INTO user_permissions (user_id, permission_id, is_active)
            VALUES ($1, $2, 1)
            ON CONFLICT (user_id, permission_id) DO UPDATE SET is_active = 1
            "#,
        )
        .bind(user_id)
        .bind(perm_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to activate permission: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Commit failed: {e}"))?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Discount caps
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct UserDiscountCap {
    pub user_id: i32,
    pub food_discount: f64,
    pub liquor_discount: f64,
    pub total_discount: f64,
}

#[tauri::command]
pub async fn get_user_discount_cap(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
) -> Result<Option<UserDiscountCap>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT user_id,
                food_discount::FLOAT8   AS food_discount,
                liquor_discount::FLOAT8 AS liquor_discount,
                total_discount::FLOAT8  AS total_discount
         FROM user_discount_cap WHERE user_id = $1 AND is_active = 1",
    )
    .bind(user_id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(row.map(|r| UserDiscountCap {
        user_id:         r.try_get("user_id").unwrap_or(user_id),
        food_discount:   r.try_get::<f64, _>("food_discount").unwrap_or(100.0),
        liquor_discount: r.try_get::<f64, _>("liquor_discount").unwrap_or(100.0),
        total_discount:  r.try_get::<f64, _>("total_discount").unwrap_or(100.0),
    }))
}

#[tauri::command]
pub async fn save_user_discount_cap(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    user_id: i32,
    food_discount: f64,
    liquor_discount: f64,
    total_discount: f64,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        r#"
        INSERT INTO user_discount_cap (user_id, food_discount, liquor_discount, total_discount)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
            food_discount   = EXCLUDED.food_discount,
            liquor_discount = EXCLUDED.liquor_discount,
            total_discount  = EXCLUDED.total_discount,
            updated_at      = CURRENT_TIMESTAMP
        "#,
    )
    .bind(user_id)
    .bind(food_discount)
    .bind(liquor_discount)
    .bind(total_discount)
    .execute(&pool)
    .await
    .map_err(|e| format!("Save failed: {e}"))?;

    Ok(())
}


