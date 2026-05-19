use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ItemNameRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub item_group_id: Option<i32>,
    pub item_group_code: Option<i64>,
    pub item_group_name: Option<String>,
    pub item_rate_1: Option<f64>,
    pub item_rate_2: Option<f64>,
    pub item_rate_3: Option<f64>,
    pub kitchen_section_id: Option<i32>,
    pub kitchen_section_code: Option<i64>,
    pub kitchen_section_name: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedItemNames {
    pub data: Vec<ItemNameRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct NameLookupResult {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_item_names(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedItemNames, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "n.code",
        Some("name") => "n.name",
        _ => "n.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM item_name n WHERE n.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT n.id, n.code, n.name, n.item_group_id, ig.code AS item_group_code, ig.name AS item_group_name, \
                n.item_rate_1, n.item_rate_2, n.item_rate_3, \
                n.kitchen_section_id, ks.code AS kitchen_section_code, ks.name AS kitchen_section_name, n.is_active \
         FROM item_name n \
         LEFT JOIN item_group ig ON ig.id = n.item_group_id \
         LEFT JOIN kitchen_section ks ON ks.id = n.kitchen_section_id \
         WHERE n.name ILIKE $1 \
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

    let data = rows.iter().map(|r| ItemNameRow {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
        item_group_id: r.try_get("item_group_id").ok().flatten(),
        item_group_code: r.try_get("item_group_code").ok().flatten(),
        item_group_name: r.try_get("item_group_name").ok().flatten(),
        item_rate_1: r.try_get("item_rate_1").ok().flatten(),
        item_rate_2: r.try_get("item_rate_2").ok().flatten(),
        item_rate_3: r.try_get("item_rate_3").ok().flatten(),
        kitchen_section_id: r.try_get("kitchen_section_id").ok().flatten(),
        kitchen_section_code: r.try_get("kitchen_section_code").ok().flatten(),
        kitchen_section_name: r.try_get("kitchen_section_name").ok().flatten(),
        is_active: r.try_get("is_active").unwrap_or(1),
    }).collect();

    Ok(PagedItemNames { data, total })
}

// ─────────────────────────────────────────────────────────────
// Dropdown helpers
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_item_groups_for_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<NameLookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM item_group WHERE is_active = 1 ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| NameLookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_all_kitchen_sections_for_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<NameLookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM kitchen_section WHERE is_active = true ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;
    Ok(rows.iter().map(|r| NameLookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn lookup_item_group_for_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<NameLookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM item_group WHERE code = $1 AND is_active = 1 LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Lookup failed: {e}"))?;
    Ok(row.map(|r| NameLookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

#[tauri::command]
pub async fn lookup_kitchen_section_for_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: i64,
) -> Result<Option<NameLookupResult>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let row = sqlx::query(
        "SELECT id, code, name FROM kitchen_section WHERE code = $1 AND is_active = true LIMIT 1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| format!("Lookup failed: {e}"))?;
    Ok(row.map(|r| NameLookupResult {
        id: r.try_get("id").unwrap_or(0),
        code: r.try_get("code").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }))
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_item_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    item_group_id: Option<i32>,
    item_rate_1: Option<f64>,
    item_rate_2: Option<f64>,
    item_rate_3: Option<f64>,
    kitchen_section_id: Option<i32>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() { return Err("Item name is required".to_string()); }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") { "Item code or name already exists".to_string() }
        else { format!("Failed to create item name: {e}") }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO item_name (code, name, item_group_id, item_rate_1, item_rate_2, item_rate_3, kitchen_section_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        )
        .bind(c).bind(&name).bind(item_group_id)
        .bind(item_rate_1).bind(item_rate_2).bind(item_rate_3).bind(kitchen_section_id)
        .fetch_one(&pool).await.map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO item_name (name, item_group_id, item_rate_1, item_rate_2, item_rate_3, kitchen_section_id) \
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(&name).bind(item_group_id)
        .bind(item_rate_1).bind(item_rate_2).bind(item_rate_3).bind(kitchen_section_id)
        .fetch_one(&pool).await.map_err(map_err)?
    };

    Ok(id)
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn update_item_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    item_group_id: Option<i32>,
    item_rate_1: Option<f64>,
    item_rate_2: Option<f64>,
    item_rate_3: Option<f64>,
    kitchen_section_id: Option<i32>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() { return Err("Item name is required".to_string()); }
    if code <= 0 { return Err("Item code is required".to_string()); }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE item_name SET code=$1, name=$2, item_group_id=$3, item_rate_1=$4, \
         item_rate_2=$5, item_rate_3=$6, kitchen_section_id=$7, updated_at=NOW() WHERE id=$8",
    )
    .bind(code).bind(&name).bind(item_group_id)
    .bind(item_rate_1).bind(item_rate_2).bind(item_rate_3).bind(kitchen_section_id).bind(id)
    .execute(&pool).await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") { "Item code or name already exists".to_string() }
        else { format!("Failed to update item name: {e}") }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_item_name_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE item_name SET is_active=$1, updated_at=NOW() WHERE id=$2")
        .bind(is_active).bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to update item name: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_item_name(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM item_name WHERE id = $1")
        .bind(id).execute(&pool).await
        .map_err(|e| format!("Failed to delete item name: {e}"))?;
    Ok(())
}
