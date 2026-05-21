use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for food_type
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct FoodTypeRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct FoodTypeSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct PagedFoodTypes {
    pub data: Vec<FoodTypeRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_food_types(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedFoodTypes, String> {
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
        "SELECT COUNT(*) AS count FROM food_type WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, is_active FROM food_type \
         WHERE name ILIKE $1 ORDER BY {} {} LIMIT $2 OFFSET $3",
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
        .map(|r| FoodTypeRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedFoodTypes { data, total })
}

#[tauri::command]
pub async fn get_all_food_types(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<FoodTypeSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name FROM food_type WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| FoodTypeSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn create_food_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Food type name already exists".to_string()
        } else {
            format!("Failed to create food type: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query("INSERT INTO food_type (code, name) VALUES ($1, $2)")
            .bind(c)
            .bind(&name)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    } else {
        sqlx::query("INSERT INTO food_type (name) VALUES ($1)")
            .bind(&name)
            .execute(&pool)
            .await
            .map_err(map_err)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_food_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE food_type SET name = $1, updated_at = NOW() WHERE id = $2")
        .bind(&name)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
                "Food type name already exists".to_string()
            } else {
                format!("Failed to update food type: {e}")
            }
        })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_food_type_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE food_type SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update food type: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_food_type(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM food_type WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete food type: {e}"))?;

    Ok(())
}
