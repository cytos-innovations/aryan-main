use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for menu_category
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MenuCategoryRow {
    pub id: i32,
    pub code: i64,
    pub category_type: Option<String>,
    pub name: String,
    pub tally_code: Option<i32>,
    pub allow_discount: bool,
    pub max_discount_percent: f64,
    pub auto_discount_percent: f64,
    pub unit_id: Option<i32>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct MenuCategorySimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct PagedMenuCategories {
    pub data: Vec<MenuCategoryRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_categories(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedMenuCategories, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        Some("category_type") => "category_type",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM menu_category WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, category_type, name, tally_code, allow_discount, \
                CAST(max_discount_percent AS FLOAT8) AS max_discount_percent, \
                CAST(auto_discount_percent AS FLOAT8) AS auto_discount_percent, \
                unit_id, is_active \
         FROM menu_category WHERE name ILIKE $1 \
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
        .map(|r| MenuCategoryRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            category_type: r.try_get("category_type").ok().flatten(),
            name: r.try_get("name").unwrap_or_default(),
            tally_code: r.try_get("tally_code").ok().flatten(),
            allow_discount: r.try_get("allow_discount").unwrap_or(false),
            max_discount_percent: r.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
            auto_discount_percent: r.try_get::<f64, _>("auto_discount_percent").unwrap_or(0.0),
            unit_id: r.try_get("unit_id").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedMenuCategories { data, total })
}

#[tauri::command]
pub async fn get_all_menu_categories(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuCategorySimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name FROM menu_category WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| MenuCategorySimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn create_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    category_type: Option<String>,
    allow_discount: bool,
    max_discount_percent: f64,
    auto_discount_percent: f64,
    tally_code: Option<i32>,
    unit_id: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let cat_type: Option<String> = category_type
        .as_deref()
        .and_then(|s| s.chars().next())
        .map(|c| c.to_string());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "INSERT INTO menu_category \
         (category_type, name, tally_code, allow_discount, max_discount_percent, \
          auto_discount_percent, unit_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(cat_type)
    .bind(&name)
    .bind(tally_code)
    .bind(allow_discount)
    .bind(max_discount_percent)
    .bind(auto_discount_percent)
    .bind(unit_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Category name already exists".to_string()
        } else {
            format!("Failed to create category: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn update_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    category_type: Option<String>,
    allow_discount: bool,
    max_discount_percent: f64,
    auto_discount_percent: f64,
    tally_code: Option<i32>,
    unit_id: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let cat_type: Option<String> = category_type
        .as_deref()
        .and_then(|s| s.chars().next())
        .map(|c| c.to_string());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE menu_category SET \
         category_type = $1, name = $2, tally_code = $3, allow_discount = $4, \
         max_discount_percent = $5, auto_discount_percent = $6, unit_id = $7, \
         updated_at = NOW() WHERE id = $8",
    )
    .bind(cat_type)
    .bind(&name)
    .bind(tally_code)
    .bind(allow_discount)
    .bind(max_discount_percent)
    .bind(auto_discount_percent)
    .bind(unit_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Category name already exists".to_string()
        } else {
            format!("Failed to update category: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_menu_category_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE menu_category SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update category: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM menu_category WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete category: {e}"))?;

    Ok(())
}
