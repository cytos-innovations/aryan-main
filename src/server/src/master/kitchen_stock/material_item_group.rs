use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::{Deserialize, Serialize};
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ItemGroupRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub payable: i32,
    pub tally_code: Option<i32>,
    pub tally_master_code: Option<i64>,
    pub tally_name: Option<String>,
    pub item_rate: Option<f64>,
    pub units_id: Option<i32>,
    pub unit_name: Option<String>,
    pub appli_service_tax: i32,
    pub res_sale_mode: i32,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct ItemGroupTaxRow {
    pub id: i32,
    pub tax_id: i32,
    pub tax_code: i64,
    pub tax_name: String,
    pub tax_percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct ItemGroupDetail {
    pub group: ItemGroupRow,
    pub taxes: Vec<ItemGroupTaxRow>,
}

#[derive(Debug, Serialize)]
pub struct PagedItemGroups {
    pub data: Vec<ItemGroupRow>,
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
pub async fn get_item_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedItemGroups, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "ig.code",
        Some("name") => "ig.name",
        _ => "ig.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM item_group ig WHERE ig.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT ig.id, ig.code, ig.name, ig.payable, ig.tally_code, tm.code AS tally_master_code, tm.name AS tally_name, \
                ig.item_rate, ig.units_id, u.name AS unit_name, \
                ig.appli_service_tax, ig.res_sale_mode, ig.is_active \
         FROM item_group ig \
         LEFT JOIN tally_master tm ON tm.id = ig.tally_code \
         LEFT JOIN units u ON u.id = ig.units_id \
         WHERE ig.name ILIKE $1 \
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

    let data = rows.iter().map(|r| ItemGroupRow {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
        payable: r.try_get("payable").unwrap_or(1),
        tally_code: r.try_get("tally_code").ok().flatten(),
        tally_master_code: r.try_get("tally_master_code").ok().flatten(),
        tally_name: r.try_get("tally_name").ok().flatten(),
        item_rate: r.try_get("item_rate").ok().flatten(),
        units_id: r.try_get("units_id").ok().flatten(),
        unit_name: r.try_get("unit_name").ok().flatten(),
        appli_service_tax: r.try_get("appli_service_tax").unwrap_or(0),
        res_sale_mode: r.try_get("res_sale_mode").unwrap_or(0),
        is_active: r.try_get("is_active").unwrap_or(1),
    }).collect();

    Ok(PagedItemGroups { data, total })
}

// ─────────────────────────────────────────────────────────────
// Get single with tax detail (for edit)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_item_group_detail(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<ItemGroupDetail, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let row = sqlx::query(
        "SELECT ig.id, ig.code, ig.name, ig.payable, ig.tally_code, tm.code AS tally_master_code, tm.name AS tally_name, \
                ig.item_rate, ig.units_id, u.name AS unit_name, \
                ig.appli_service_tax, ig.res_sale_mode, ig.is_active \
         FROM item_group ig \
         LEFT JOIN tally_master tm ON tm.id = ig.tally_code \
         LEFT JOIN units u ON u.id = ig.units_id \
         WHERE ig.id = $1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    let group = ItemGroupRow {
        id: row.try_get("id").unwrap_or(0),
        code: row.try_get("code").unwrap_or(0),
        name: row.try_get("name").unwrap_or_default(),
        payable: row.try_get("payable").unwrap_or(1),
        tally_code: row.try_get("tally_code").ok().flatten(),
        tally_master_code: row.try_get("tally_master_code").ok().flatten(),
        tally_name: row.try_get("tally_name").ok().flatten(),
        item_rate: row.try_get("item_rate").ok().flatten(),
        units_id: row.try_get("units_id").ok().flatten(),
        unit_name: row.try_get("unit_name").ok().flatten(),
        appli_service_tax: row.try_get("appli_service_tax").unwrap_or(0),
        res_sale_mode: row.try_get("res_sale_mode").unwrap_or(0),
        is_active: row.try_get("is_active").unwrap_or(1),
    };

    let tax_rows = sqlx::query(
        "SELECT igd.id, igd.tax_id, tm.code AS tax_code, tm.name AS tax_name, igd.tax_percentage \
         FROM item_group_tax_detail igd \
         JOIN tax_master tm ON tm.id = igd.tax_id \
         WHERE igd.item_group_id = $1 \
         ORDER BY igd.id",
    )
    .bind(id)
    .fetch_all(&pool)
    .await
    .unwrap_or_default();

    let taxes = tax_rows.iter().map(|r| ItemGroupTaxRow {
        id: r.try_get("id").unwrap_or(0),
        tax_id: r.try_get("tax_id").unwrap_or(0),
        tax_code: r.try_get("tax_code").unwrap_or(0),
        tax_name: r.try_get("tax_name").unwrap_or_default(),
        tax_percentage: r.try_get("tax_percentage").unwrap_or(0.0),
    }).collect();

    Ok(ItemGroupDetail { group, taxes })
}

// ─────────────────────────────────────────────────────────────
// Dropdown helpers
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_tally_for_item(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM tally_master WHERE is_active = 1 ORDER BY code",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| LookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_all_units_for_item(
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
        id: r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_all_taxes_for_item(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM tax_master WHERE is_active = 1 ORDER BY code",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| LookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn lookup_tally_for_item_group(
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
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn lookup_tax_for_item_group(
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
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_item_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    payable: i32,
    tally_code: Option<i32>,
    item_rate: Option<f64>,
    units_id: Option<i32>,
    appli_service_tax: i32,
    res_sale_mode: i32,
    tax_details: Vec<TaxInput>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Item group name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Item group code or name already exists".to_string()
        } else {
            format!("Failed to create item group: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO item_group (code, name, payable, tally_code, item_rate, units_id, appli_service_tax, res_sale_mode) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        )
        .bind(c).bind(&name).bind(payable).bind(tally_code)
        .bind(item_rate).bind(units_id).bind(appli_service_tax).bind(res_sale_mode)
        .fetch_one(&pool).await.map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO item_group (name, payable, tally_code, item_rate, units_id, appli_service_tax, res_sale_mode) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        )
        .bind(&name).bind(payable).bind(tally_code)
        .bind(item_rate).bind(units_id).bind(appli_service_tax).bind(res_sale_mode)
        .fetch_one(&pool).await.map_err(map_err)?
    };

    for td in &tax_details {
        if td.tax_id > 0 {
            sqlx::query(
                "INSERT INTO item_group_tax_detail (item_group_id, tax_id, tax_percentage) \
                 VALUES ($1, $2, $3)",
            )
            .bind(id).bind(td.tax_id).bind(td.tax_percentage)
            .execute(&pool).await
            .map_err(|e| format!("Failed to save tax detail: {e}"))?;
        }
    }

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_item_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    payable: i32,
    tally_code: Option<i32>,
    item_rate: Option<f64>,
    units_id: Option<i32>,
    appli_service_tax: i32,
    res_sale_mode: i32,
    tax_details: Vec<TaxInput>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() { return Err("Item group name is required".to_string()); }
    if code <= 0 { return Err("Item group code is required".to_string()); }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE item_group SET code=$1, name=$2, payable=$3, tally_code=$4, item_rate=$5, \
         units_id=$6, appli_service_tax=$7, res_sale_mode=$8, updated_at=NOW() WHERE id=$9",
    )
    .bind(code).bind(&name).bind(payable).bind(tally_code)
    .bind(item_rate).bind(units_id).bind(appli_service_tax).bind(res_sale_mode).bind(id)
    .execute(&pool).await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") { "Item group code or name already exists".to_string() }
        else { format!("Failed to update item group: {e}") }
    })?;

    // Replace tax details
    sqlx::query("DELETE FROM item_group_tax_detail WHERE item_group_id = $1")
        .bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to clear tax details: {e}"))?;

    for td in &tax_details {
        if td.tax_id > 0 {
            sqlx::query(
                "INSERT INTO item_group_tax_detail (item_group_id, tax_id, tax_percentage) \
                 VALUES ($1, $2, $3)",
            )
            .bind(id).bind(td.tax_id).bind(td.tax_percentage)
            .execute(&pool).await
            .map_err(|e| format!("Failed to save tax detail: {e}"))?;
        }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_item_group_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE item_group SET is_active=$1, updated_at=NOW() WHERE id=$2")
        .bind(is_active).bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to update item group: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_item_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM item_group_tax_detail WHERE item_group_id = $1")
        .bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to delete tax details: {e}"))?;
    sqlx::query("DELETE FROM item_group WHERE id = $1")
        .bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to delete item group: {e}"))?;
    Ok(())
}
