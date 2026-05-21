use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::{Deserialize, Serialize};
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MenuCategoryRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub tally_code: Option<i32>,
    pub tally_master_code: Option<i64>,
    pub tally_name: Option<String>,
    pub allow_discount: bool,
    pub max_discount_percent: f64,
    pub auto_discount_percent: f64,
    pub unit_id: Option<i32>,
    pub unit_name: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct MenuCategoryTaxRow {
    pub id: i32,
    pub tax_id: i32,
    pub tax_code: i64,
    pub tax_name: String,
    pub tax_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct MenuCategoryDetail {
    pub category: MenuCategoryRow,
    pub taxes: Vec<MenuCategoryTaxRow>,
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

#[derive(Debug, Serialize)]
pub struct LookupResult {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct UnitOption {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaxInput {
    pub tax_id: i32,
    pub tax_percentage: f64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_categories(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedMenuCategories, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "mc.code",
        Some("name") => "mc.name",
        _ => "mc.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM menu_category mc WHERE mc.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT mc.id, mc.code, mc.name, mc.tally_code, \
                tm.code AS tally_master_code, tm.name AS tally_name, \
                mc.allow_discount, \
                CAST(mc.max_discount_percent  AS FLOAT8) AS max_discount_percent, \
                CAST(mc.auto_discount_percent AS FLOAT8) AS auto_discount_percent, \
                mc.unit_id, u.name AS unit_name, mc.is_active \
         FROM menu_category mc \
         LEFT JOIN tally_master tm ON tm.id = mc.tally_code \
         LEFT JOIN units u ON u.id = mc.unit_id \
         WHERE mc.name ILIKE $1 \
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

    let data = rows.iter().map(|r| MenuCategoryRow {
        id:                   r.try_get("id").unwrap_or(0),
        code:                 r.try_get("code").unwrap_or(0),
        name:                 r.try_get("name").unwrap_or_default(),
        tally_code:           r.try_get("tally_code").ok().flatten(),
        tally_master_code:    r.try_get("tally_master_code").ok().flatten(),
        tally_name:           r.try_get("tally_name").ok().flatten(),
        allow_discount:       r.try_get("allow_discount").unwrap_or(false),
        max_discount_percent: r.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
        auto_discount_percent:r.try_get::<f64, _>("auto_discount_percent").unwrap_or(0.0),
        unit_id:              r.try_get("unit_id").ok().flatten(),
        unit_name:            r.try_get("unit_name").ok().flatten(),
        is_active:            r.try_get("is_active").unwrap_or(true),
    }).collect();

    Ok(PagedMenuCategories { data, total })
}

// ─────────────────────────────────────────────────────────────
// Single record with tax details (used by edit dialog)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_category_detail(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<MenuCategoryDetail, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT mc.id, mc.code, mc.name, mc.tally_code, \
                tm.code AS tally_master_code, tm.name AS tally_name, \
                mc.allow_discount, \
                CAST(mc.max_discount_percent  AS FLOAT8) AS max_discount_percent, \
                CAST(mc.auto_discount_percent AS FLOAT8) AS auto_discount_percent, \
                mc.unit_id, u.name AS unit_name, mc.is_active \
         FROM menu_category mc \
         LEFT JOIN tally_master tm ON tm.id = mc.tally_code \
         LEFT JOIN units u ON u.id = mc.unit_id \
         WHERE mc.id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    let category = MenuCategoryRow {
        id:                   row.try_get("id").unwrap_or(0),
        code:                 row.try_get("code").unwrap_or(0),
        name:                 row.try_get("name").unwrap_or_default(),
        tally_code:           row.try_get("tally_code").ok().flatten(),
        tally_master_code:    row.try_get("tally_master_code").ok().flatten(),
        tally_name:           row.try_get("tally_name").ok().flatten(),
        allow_discount:       row.try_get("allow_discount").unwrap_or(false),
        max_discount_percent: row.try_get::<f64, _>("max_discount_percent").unwrap_or(0.0),
        auto_discount_percent:row.try_get::<f64, _>("auto_discount_percent").unwrap_or(0.0),
        unit_id:              row.try_get("unit_id").ok().flatten(),
        unit_name:            row.try_get("unit_name").ok().flatten(),
        is_active:            row.try_get("is_active").unwrap_or(true),
    };

    let tax_rows = sqlx::query(
        "SELECT d.id, d.tax_id, tm.code AS tax_code, tm.name AS tax_name, \
                CAST(d.tax_percentage AS FLOAT8) AS tax_percentage \
         FROM menu_category_tax_detail d \
         JOIN tax_master tm ON tm.id = d.tax_id \
         WHERE d.category_id = $1 \
         ORDER BY d.id",
    )
    .bind(id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let taxes = tax_rows.iter().map(|r| MenuCategoryTaxRow {
        id:             r.try_get("id").unwrap_or(0),
        tax_id:         r.try_get("tax_id").unwrap_or(0),
        tax_code:       r.try_get("tax_code").unwrap_or(0),
        tax_name:       r.try_get("tax_name").unwrap_or_default(),
        tax_percentage: r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
    }).collect();

    Ok(MenuCategoryDetail { category, taxes })
}

// ─────────────────────────────────────────────────────────────
// Simple list for dropdowns (other screens)
// ─────────────────────────────────────────────────────────────

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
    Ok(rows.iter().map(|r| MenuCategorySimple {
        id:   r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

// ─────────────────────────────────────────────────────────────
// Dropdown helpers
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_units_for_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<UnitOption>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, name FROM units WHERE is_active = 1 ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| UnitOption {
        id:   r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

// ─────────────────────────────────────────────────────────────
// Lookup helpers — called on blur/Enter in the form
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn lookup_tally_for_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<LookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM tally_master WHERE code = $1 AND is_active = 1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Lookup failed: {e}"))?;
    Ok(row.map(|r| LookupResult {
        id:   r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn lookup_tax_for_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<LookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM tax_master WHERE code = $1 AND is_active = 1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Lookup failed: {e}"))?;
    Ok(row.map(|r| LookupResult {
        id:   r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

// ─────────────────────────────────────────────────────────────
// Create  (code is optional — BIGSERIAL auto-generates if null)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    allow_discount: bool,
    max_discount_percent: f64,
    auto_discount_percent: f64,
    tally_code: Option<i32>,
    unit_id: Option<i32>,
    tax_details: Vec<TaxInput>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Category name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            "Category name or code already exists".to_string()
        } else {
            format!("Failed to create category: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO menu_category \
             (code, name, allow_discount, max_discount_percent, auto_discount_percent, tally_code, unit_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(allow_discount)
        .bind(max_discount_percent)
        .bind(auto_discount_percent)
        .bind(tally_code)
        .bind(unit_id)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO menu_category \
             (name, allow_discount, max_discount_percent, auto_discount_percent, tally_code, unit_id) \
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(&name)
        .bind(allow_discount)
        .bind(max_discount_percent)
        .bind(auto_discount_percent)
        .bind(tally_code)
        .bind(unit_id)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    };

    for td in &tax_details {
        if td.tax_id > 0 {
            sqlx::query(
                "INSERT INTO menu_category_tax_detail (category_id, tax_id, tax_percentage) \
                 VALUES ($1, $2, $3)",
            )
            .bind(id)
            .bind(td.tax_id)
            .bind(td.tax_percentage)
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to save tax detail: {e}"))?;
        }
    }

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update  (deletes old tax rows then inserts the new set)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    allow_discount: bool,
    max_discount_percent: f64,
    auto_discount_percent: f64,
    tally_code: Option<i32>,
    unit_id: Option<i32>,
    tax_details: Vec<TaxInput>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() { return Err("Category name is required".to_string()); }
    if code <= 0      { return Err("Category code is required".to_string()); }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE menu_category \
         SET code = $1, name = $2, allow_discount = $3, \
             max_discount_percent = $4, auto_discount_percent = $5, \
             tally_code = $6, unit_id = $7, updated_at = NOW() \
         WHERE id = $8",
    )
    .bind(code)
    .bind(&name)
    .bind(allow_discount)
    .bind(max_discount_percent)
    .bind(auto_discount_percent)
    .bind(tally_code)
    .bind(unit_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            "Category name or code already exists".to_string()
        } else {
            format!("Failed to update category: {e}")
        }
    })?;

    sqlx::query("DELETE FROM menu_category_tax_detail WHERE category_id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to clear tax details: {e}"))?;

    for td in &tax_details {
        if td.tax_id > 0 {
            sqlx::query(
                "INSERT INTO menu_category_tax_detail (category_id, tax_id, tax_percentage) \
                 VALUES ($1, $2, $3)",
            )
            .bind(id)
            .bind(td.tax_id)
            .bind(td.tax_percentage)
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to save tax detail: {e}"))?;
        }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_menu_category_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE menu_category SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update category: {e}"))?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Delete  (cascades to tax details via ON DELETE CASCADE)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn delete_menu_category(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    // Explicit delete of child rows in case ON DELETE CASCADE is not in effect on older DB
    sqlx::query("DELETE FROM menu_category_tax_detail WHERE category_id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete tax details: {e}"))?;
    sqlx::query("DELETE FROM menu_category WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete category: {e}"))?;
    Ok(())
}
