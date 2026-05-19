use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DayBookRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub group_code: Option<i32>,
    pub group_name: Option<String>,
    pub gen_leg_code: Option<i32>,
    pub ledger_name: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedDayBooks {
    pub data: Vec<DayBookRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_day_books(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedDayBooks, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "db.code",
        Some("name") => "db.name",
        _ => "db.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM day_book db WHERE db.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT db.id, db.code, db.name, db.group_code, ag.name AS group_name, \
                db.gen_leg_code, gl.name AS ledger_name, db.is_active \
         FROM day_book db \
         LEFT JOIN account_groups ag ON ag.id = db.group_code \
         LEFT JOIN general_ledger gl ON gl.id = db.gen_leg_code \
         WHERE db.name ILIKE $1 \
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
        .map(|r| DayBookRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            group_code: r.try_get("group_code").ok().flatten(),
            group_name: r.try_get("group_name").ok().flatten(),
            gen_leg_code: r.try_get("gen_leg_code").ok().flatten(),
            ledger_name: r.try_get("ledger_name").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedDayBooks { data, total })
}

// ─────────────────────────────────────────────────────────────
// Dropdown helpers (reuse existing get_all_account_groups / get_all_general_ledgers)
// ─────────────────────────────────────────────────────────────

use serde::Deserialize;

#[derive(Debug, Serialize, Deserialize)]
pub struct SimpleOption {
    pub id: i32,
    pub name: String,
}

#[tauri::command]
pub async fn get_all_groups_for_daybook(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SimpleOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query("SELECT id, name FROM account_groups WHERE is_active = 1 ORDER BY name")
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| SimpleOption {
        id: r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_all_ledgers_for_daybook(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SimpleOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query("SELECT id, name FROM general_ledger WHERE is_active = 1 ORDER BY name")
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| SimpleOption {
        id: r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_day_book(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    group_code: Option<i32>,
    gen_leg_code: Option<i32>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Day book name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Day book code or name already exists".to_string()
        } else {
            format!("Failed to create day book: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO day_book (code, name, group_code, gen_leg_code) \
             VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(group_code)
        .bind(gen_leg_code)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO day_book (name, group_code, gen_leg_code) \
             VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(&name)
        .bind(group_code)
        .bind(gen_leg_code)
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
pub async fn update_day_book(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    group_code: Option<i32>,
    gen_leg_code: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Day book name is required".to_string());
    }
    if code <= 0 {
        return Err("Day book code is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE day_book SET code = $1, name = $2, group_code = $3, gen_leg_code = $4, \
         updated_at = NOW() WHERE id = $5",
    )
    .bind(code)
    .bind(&name)
    .bind(group_code)
    .bind(gen_leg_code)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Day book code or name already exists".to_string()
        } else {
            format!("Failed to update day book: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_day_book_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE day_book SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update day book: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_day_book(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM day_book WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete day book: {e}"))?;
    Ok(())
}
