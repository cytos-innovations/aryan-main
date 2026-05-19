use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — plan_master table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct PlanMasterRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub tariff: f64,
    pub plan_details: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PlanMasterSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub tariff: f64,
}

#[derive(Debug, Serialize)]
pub struct PagedPlanMasters {
    pub data: Vec<PlanMasterRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_plan_masters(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedPlanMasters, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        Some("tariff") => "tariff",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM plan_master WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, \
                CAST(tariff AS FLOAT8) AS tariff, \
                plan_details, is_active \
         FROM plan_master WHERE name ILIKE $1 \
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
        .map(|r| PlanMasterRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            tariff: r.try_get::<f64, _>("tariff").unwrap_or(0.0),
            plan_details: r.try_get("plan_details").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedPlanMasters { data, total })
}

#[tauri::command]
pub async fn get_all_plan_masters(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PlanMasterSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name, CAST(tariff AS FLOAT8) AS tariff \
         FROM plan_master WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| PlanMasterSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            tariff: r.try_get::<f64, _>("tariff").unwrap_or(0.0),
        })
        .collect())
}

#[tauri::command]
pub async fn create_plan_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    name: String,
    tariff: f64,
    plan_details: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Plan name is required".to_string());
    }
    if tariff < 0.0 {
        return Err("Tariff must be a non-negative value".to_string());
    }

    let details = plan_details
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Code or plan name already exists".to_string()
        } else {
            format!("Failed to create plan: {e}")
        }
    };

    if let Some(code_val) = code {
        sqlx::query(
            "INSERT INTO plan_master (code, name, tariff, plan_details) VALUES ($1, $2, $3, $4)",
        )
        .bind(code_val)
        .bind(&name)
        .bind(tariff)
        .bind(details)
        .execute(&pool)
        .await
        .map_err(map_err)?;
    } else {
        sqlx::query(
            "INSERT INTO plan_master (name, tariff, plan_details) VALUES ($1, $2, $3)",
        )
        .bind(&name)
        .bind(tariff)
        .bind(details)
        .execute(&pool)
        .await
        .map_err(map_err)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_plan_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    tariff: f64,
    plan_details: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Plan name is required".to_string());
    }
    if tariff < 0.0 {
        return Err("Tariff must be a non-negative value".to_string());
    }

    let details = plan_details
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE plan_master \
         SET name = $1, tariff = $2, plan_details = $3, updated_at = NOW() \
         WHERE id = $4",
    )
    .bind(&name)
    .bind(tariff)
    .bind(details)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Plan name already exists".to_string()
        } else {
            format!("Failed to update plan: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_plan_master_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE plan_master SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update plan: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_plan_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM plan_master WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete plan: {e}"))?;

    Ok(())
}
