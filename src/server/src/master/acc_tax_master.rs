use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TaxMasterRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub tally_id: Option<i32>,
    pub tally_code: Option<i64>,
    pub tally_name: Option<String>,
    pub gl_id: Option<i32>,
    pub gl_code: Option<i64>,
    pub gl_name: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedTaxMasters {
    pub data: Vec<TaxMasterRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct TaxSlabRow {
    pub id: i32,
    pub slab_from: f64,
    pub slab_to: f64,
    pub tax_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct TallyLookup {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct GlLookup {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

// ─────────────────────────────────────────────────────────────
// Tax Master — List
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_tax_masters(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedTaxMasters, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "tm.code",
        Some("name") => "tm.name",
        _ => "tm.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM tax_master tm WHERE tm.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT tm.id, tm.code, tm.name, tm.tally_id, tm.gl_id, tm.is_active, \
                tal.code AS tally_code, tal.name AS tally_name, \
                gl.code AS gl_code, gl.name AS gl_name \
         FROM tax_master tm \
         LEFT JOIN tally_master tal ON tal.id = tm.tally_id \
         LEFT JOIN general_ledger gl ON gl.id = tm.gl_id \
         WHERE tm.name ILIKE $1 \
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
        .map(|r| TaxMasterRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            tally_id: r.try_get("tally_id").ok().flatten(),
            tally_code: r.try_get("tally_code").ok().flatten(),
            tally_name: r.try_get("tally_name").ok().flatten(),
            gl_id: r.try_get("gl_id").ok().flatten(),
            gl_code: r.try_get("gl_code").ok().flatten(),
            gl_name: r.try_get("gl_name").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedTaxMasters { data, total })
}

// ─────────────────────────────────────────────────────────────
// Tax Master — Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_tax_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    tally_id: Option<i32>,
    gl_id: Option<i32>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Tax name is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Tax code or name already exists".to_string()
        } else {
            format!("Failed to create tax master: {e}")
        }
    };

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO tax_master (code, name, tally_id, gl_id) VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(tally_id)
        .bind(gl_id)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO tax_master (name, tally_id, gl_id) VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(&name)
        .bind(tally_id)
        .bind(gl_id)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    };

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Tax Master — Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_tax_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    tally_id: Option<i32>,
    gl_id: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Tax name is required".to_string());
    }
    if code <= 0 {
        return Err("Tax code is required".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE tax_master SET code = $1, name = $2, tally_id = $3, gl_id = $4, updated_at = NOW() \
         WHERE id = $5",
    )
    .bind(code)
    .bind(&name)
    .bind(tally_id)
    .bind(gl_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Tax code or name already exists".to_string()
        } else {
            format!("Failed to update tax master: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Tax Master — Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_tax_master_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE tax_master SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update tax master: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_tax_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    // Slabs cascade delete via FK
    sqlx::query("DELETE FROM tax_master WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete tax master: {e}"))?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Lookups — Tally & GL (by their id, code, or code value)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn lookup_tally_by_code(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<TallyLookup>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM tally_master WHERE code = $1 AND is_active = 1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Tally lookup failed: {e}"))?;

    Ok(row.map(|r| TallyLookup {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn lookup_gl_by_code(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<GlLookup>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM general_ledger WHERE code = $1 AND is_active = 1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("GL lookup failed: {e}"))?;

    Ok(row.map(|r| GlLookup {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

// ─────────────────────────────────────────────────────────────
// Dropdown lists — all active Tally & GL ledgers (id, code, name)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_tally_ledgers(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TallyLookup>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM tally_master WHERE is_active = 1 ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Tally list failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| TallyLookup {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn get_all_gl_ledgers(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<GlLookup>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM general_ledger WHERE is_active = 1 ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("GL list failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| GlLookup {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

// ─────────────────────────────────────────────────────────────
// Generic next-code preview — MAX(code) + 1 for create dialogs.
//
// The returned value is a *suggestion* only; the user may override it,
// and the backend still auto-assigns via BIGSERIAL if no code is sent.
//
// `table` comes from the frontend, so it is validated against a fixed
// allow-list to prevent SQL injection — never interpolate it otherwise.
// ─────────────────────────────────────────────────────────────

const NEXT_CODE_TABLES: &[&str] = &[
    "tax_master",
    "tally_master",
    "general_ledger",
    "supplier_master",     // creditor + debtor (shared)
    "party_bank",
    "day_book",
    "account_groups",
    "account_categories",
    "identity_type",
    "discount_detail",
    "customer_information",
    "food_type",
    "menu_category",
    "menu_group",
    "menu_card",
    "item_group",
    "item_name",
    "plan_master",
    "employee_information",
    "employee_designation",
    "kitchen_section",
    "market_segment",
    "restaurant_table",
    "table_group",
];

#[tauri::command]
pub async fn get_next_master_code(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    table: String,
) -> Result<i64, String> {
    if !NEXT_CODE_TABLES.contains(&table.as_str()) {
        return Err(format!("Unknown table for code preview: {table}"));
    }
    let pool = acquire_pool(&state.pool, &app).await?;
    // `table` is allow-listed above, so this interpolation is safe.
    let sql = format!("SELECT COALESCE(MAX(code), 0) + 1 AS next FROM {table}");
    let next: i64 = sqlx::query_scalar(&sql)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Next code lookup failed: {e}"))?;
    Ok(next)
}

// ─────────────────────────────────────────────────────────────
// Tax Slabs
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_tax_slabs(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    tax_master_id: i32,
) -> Result<Vec<TaxSlabRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, \
                CAST(slab_from AS FLOAT8) AS slab_from, \
                CAST(slab_to AS FLOAT8) AS slab_to, \
                CAST(tax_percentage AS FLOAT8) AS tax_percentage \
         FROM tax_slab \
         WHERE tax_master_id = $1 AND is_active = 1 \
         ORDER BY slab_from ASC",
    )
    .bind(tax_master_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to get tax slabs: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| TaxSlabRow {
            id: r.try_get("id").unwrap_or(0),
            slab_from: r.try_get::<f64, _>("slab_from").unwrap_or(0.0),
            slab_to: r.try_get::<f64, _>("slab_to").unwrap_or(0.0),
            tax_percentage: r.try_get::<f64, _>("tax_percentage").unwrap_or(0.0),
        })
        .collect())
}

#[tauri::command]
pub async fn save_tax_slab(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: Option<i32>,
    tax_master_id: i32,
    slab_from: f64,
    slab_to: f64,
    tax_percentage: f64,
) -> Result<i32, String> {
    if !(0.0..=100.0).contains(&tax_percentage) {
        return Err("Tax percentage must be between 0 and 100".to_string());
    }
    if slab_to < slab_from {
        return Err("Slab 'To' must be greater than or equal to 'From'".to_string());
    }
    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(slab_id) = id {
        sqlx::query(
            "UPDATE tax_slab SET slab_from = $1, slab_to = $2, tax_percentage = $3, \
             updated_at = NOW() WHERE id = $4",
        )
        .bind(slab_from)
        .bind(slab_to)
        .bind(tax_percentage)
        .bind(slab_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update tax slab: {e}"))?;
        Ok(slab_id)
    } else {
        let new_id: i32 = sqlx::query_scalar(
            "INSERT INTO tax_slab (tax_master_id, slab_from, slab_to, tax_percentage) \
             VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(tax_master_id)
        .bind(slab_from)
        .bind(slab_to)
        .bind(tax_percentage)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to create tax slab: {e}"))?;
        Ok(new_id)
    }
}

#[tauri::command]
pub async fn delete_tax_slab(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM tax_slab WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete tax slab: {e}"))?;
    Ok(())
}
