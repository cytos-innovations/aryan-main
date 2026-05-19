use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for menu_group
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MenuGroupRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub is_payable: bool,
    pub tally_id: Option<i64>,
    pub item_rate: f64,
    pub category_id: i32,
    pub category_name: Option<String>,
    pub applicable_service_tax: bool,
    pub restaurant_sale_mode: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct MenuGroupSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub category_id: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedMenuGroups {
    pub data: Vec<MenuGroupRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
    category_id: Option<i32>,
) -> Result<PagedMenuGroups, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "mg.code",
        Some("name") => "mg.name",
        _ => "mg.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let select = "SELECT mg.id, mg.code, mg.name, mg.is_payable, mg.tally_id, \
                         CAST(mg.item_rate AS FLOAT8) AS item_rate, \
                         mg.category_id, mc.name AS category_name, \
                         mg.applicable_service_tax, mg.restaurant_sale_mode, mg.is_active \
                  FROM menu_group mg \
                  LEFT JOIN menu_category mc ON mc.id = mg.category_id";

    let (total, rows) = if let Some(cat_id) = category_id {
        let total_row = sqlx::query(
            "SELECT COUNT(*) AS count FROM menu_group mg \
             WHERE mg.name ILIKE $1 AND mg.category_id = $2",
        )
        .bind(&search_pattern)
        .bind(cat_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count query failed: {e}"))?;
        let total: i64 = total_row.try_get("count").unwrap_or(0);

        let sql = format!(
            "{} WHERE mg.name ILIKE $1 AND mg.category_id = $4 \
             ORDER BY {} {} LIMIT $2 OFFSET $3",
            select, order_col, dir
        );
        let rows = sqlx::query(&sql)
            .bind(&search_pattern)
            .bind(qs.per_page)
            .bind(offset)
            .bind(cat_id)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Query failed: {e}"))?;
        (total, rows)
    } else {
        let total_row = sqlx::query(
            "SELECT COUNT(*) AS count FROM menu_group mg WHERE mg.name ILIKE $1",
        )
        .bind(&search_pattern)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count query failed: {e}"))?;
        let total: i64 = total_row.try_get("count").unwrap_or(0);

        let sql = format!(
            "{} WHERE mg.name ILIKE $1 ORDER BY {} {} LIMIT $2 OFFSET $3",
            select, order_col, dir
        );
        let rows = sqlx::query(&sql)
            .bind(&search_pattern)
            .bind(qs.per_page)
            .bind(offset)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("Query failed: {e}"))?;
        (total, rows)
    };

    let data = rows
        .iter()
        .map(|r| MenuGroupRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            is_payable: r.try_get("is_payable").unwrap_or(true),
            tally_id: r.try_get("tally_id").ok().flatten(),
            item_rate: r.try_get::<f64, _>("item_rate").unwrap_or(0.0),
            category_id: r.try_get("category_id").unwrap_or(0),
            category_name: r.try_get("category_name").ok().flatten(),
            applicable_service_tax: r.try_get("applicable_service_tax").unwrap_or(false),
            restaurant_sale_mode: r.try_get("restaurant_sale_mode").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedMenuGroups { data, total })
}

#[tauri::command]
pub async fn get_all_menu_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuGroupSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name, category_id FROM menu_group \
         WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| MenuGroupSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            category_id: r.try_get("category_id").unwrap_or(0),
        })
        .collect())
}

#[tauri::command]
pub async fn create_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    category_id: i32,
    is_payable: bool,
    item_rate: f64,
    applicable_service_tax: bool,
    restaurant_sale_mode: Option<String>,
    tally_id: Option<i64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let sale_mode: Option<String> = restaurant_sale_mode
        .as_deref()
        .and_then(|s| s.chars().next())
        .map(|c| c.to_string());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "INSERT INTO menu_group \
         (name, category_id, is_payable, item_rate, applicable_service_tax, \
          restaurant_sale_mode, tally_id) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(&name)
    .bind(category_id)
    .bind(is_payable)
    .bind(item_rate)
    .bind(applicable_service_tax)
    .bind(sale_mode)
    .bind(tally_id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Group name already exists".to_string()
        } else {
            format!("Failed to create group: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn update_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    category_id: i32,
    is_payable: bool,
    item_rate: f64,
    applicable_service_tax: bool,
    restaurant_sale_mode: Option<String>,
    tally_id: Option<i64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let sale_mode: Option<String> = restaurant_sale_mode
        .as_deref()
        .and_then(|s| s.chars().next())
        .map(|c| c.to_string());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE menu_group SET \
         name = $1, category_id = $2, is_payable = $3, item_rate = $4, \
         applicable_service_tax = $5, restaurant_sale_mode = $6, tally_id = $7, \
         updated_at = NOW() WHERE id = $8",
    )
    .bind(&name)
    .bind(category_id)
    .bind(is_payable)
    .bind(item_rate)
    .bind(applicable_service_tax)
    .bind(sale_mode)
    .bind(tally_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Group name already exists".to_string()
        } else {
            format!("Failed to update group: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_menu_group_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE menu_group SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update group: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM menu_group WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete group: {e}"))?;

    Ok(())
}
