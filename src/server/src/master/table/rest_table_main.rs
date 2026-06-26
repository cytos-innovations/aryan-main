use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for restaurant_table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct RestaurantTableRow {
    pub id: i32,
    pub code: i64,
    pub table_name: String,
    pub table_group_id: Option<i32>,
    pub group_name: Option<String>,
    pub applicable_rate: i32,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedRestaurantTables {
    pub data: Vec<RestaurantTableRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_restaurant_tables(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedRestaurantTables, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        // "table_name" kept for backward compat — sorts by code now.
        Some("code") | Some("table_name") => "rt.code",
        Some("applicable_rate") => "rt.applicable_rate",
        _ => "rt.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    // Tables are identified by their numeric code — search matches the code
    // (which is also the stored name) and the group name.
    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM restaurant_table rt \
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id \
         WHERE rt.code::text ILIKE $1 OR tg.name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT rt.id, rt.code, rt.table_name, rt.table_group_id, \
                tg.name AS group_name, rt.applicable_rate, rt.is_active \
         FROM restaurant_table rt \
         LEFT JOIN table_group tg ON tg.id = rt.table_group_id \
         WHERE rt.code::text ILIKE $1 OR tg.name ILIKE $1 \
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
        .map(|r| RestaurantTableRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            table_name: r.try_get("table_name").unwrap_or_default(),
            table_group_id: r.try_get("table_group_id").ok().flatten(),
            group_name: r.try_get("group_name").ok().flatten(),
            applicable_rate: r.try_get("applicable_rate").unwrap_or(1),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedRestaurantTables { data, total })
}

#[tauri::command]
pub async fn create_restaurant_table(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    table_group_id: Option<i32>,
    applicable_rate: i32,
) -> Result<(), String> {
    if !(1..=5).contains(&applicable_rate) {
        return Err("Rate must be between 1 and 5".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // The table is identified solely by its numeric code. When the caller
    // supplies a code we use it; otherwise let the BIGSERIAL assign one. Either
    // way the stored `table_name` mirrors the code so every downstream display
    // (cards, bills, KOTs) shows the code. `code` is UNIQUE, so duplicates are
    // rejected by the constraint.
    if let Some(code_val) = code.filter(|&c| c > 0) {
        sqlx::query(
            "INSERT INTO restaurant_table \
             (code, table_name, table_group_id, applicable_rate) \
             VALUES ($1, $1::text, $2, $3)",
        )
        .bind(code_val)
        .bind(table_group_id)
        .bind(applicable_rate)
        .execute(&pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
                "A table with this code already exists".to_string()
            } else {
                format!("Failed to create table: {e}")
            }
        })?;
    } else {
        // Auto-assigned code: insert with a placeholder name, then sync it to
        // the freshly generated code.
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO restaurant_table \
             (table_name, table_group_id, applicable_rate) \
             VALUES ('', $1, $2) RETURNING id",
        )
        .bind(table_group_id)
        .bind(applicable_rate)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to create table: {e}"))?;

        sqlx::query("UPDATE restaurant_table SET table_name = code::text WHERE id = $1")
            .bind(new_id)
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to set table code: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_restaurant_table(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: Option<i64>,
    table_group_id: Option<i32>,
    applicable_rate: i32,
) -> Result<(), String> {
    if !(1..=5).contains(&applicable_rate) {
        return Err("Rate must be between 1 and 5".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // The table name always mirrors the code, so updating the code (when given)
    // also rewrites the name to match. `code` is UNIQUE — duplicates are caught
    // by the constraint.
    sqlx::query(
        "UPDATE restaurant_table SET \
         code = COALESCE($1, code), \
         table_name = COALESCE($1::text, code::text), \
         table_group_id = $2, applicable_rate = $3, \
         updated_at = NOW() WHERE id = $4",
    )
    .bind(code)
    .bind(table_group_id)
    .bind(applicable_rate)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "A table with this code already exists".to_string()
        } else {
            format!("Failed to update table: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_restaurant_table_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE restaurant_table SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update table: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_restaurant_table(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM restaurant_table WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete table: {e}"))?;

    Ok(())
}
