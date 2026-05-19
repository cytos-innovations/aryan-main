use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for table_group
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct KitchenSectionSimple {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct TableGroupRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub applicable_rate: i32,
    pub service_printer_name: Option<String>,
    pub allow_incentive: String,
    pub is_home_delivery: String,
    pub is_tax_applicable: String,
    pub is_takeaway_enabled: String,
    pub is_print_enabled: String,
    pub printer_location: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct TableGroupSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub applicable_rate: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedTableGroups {
    pub data: Vec<TableGroupRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

fn yn_flag(s: &str) -> String {
    match s.trim().to_uppercase().as_str() {
        "Y" => "Y".to_string(),
        _ => "N".to_string(),
    }
}

fn trim_opt(s: Option<String>) -> Option<String> {
    s.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_kitchen_sections(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<KitchenSectionSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, name FROM kitchen_section WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| KitchenSectionSimple {
            id: r.try_get("id").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn get_table_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedTableGroups, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        Some("applicable_rate") => "applicable_rate",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM table_group WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, applicable_rate, service_printer_name, allow_incentive, \
         is_home_delivery, is_tax_applicable, is_takeaway_enabled, is_print_enabled, \
         printer_location, is_active \
         FROM table_group WHERE name ILIKE $1 \
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
        .map(|r| TableGroupRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            applicable_rate: r.try_get("applicable_rate").unwrap_or(1),
            service_printer_name: r
                .try_get::<Option<String>, _>("service_printer_name")
                .ok()
                .flatten()
                .map(|s| s.trim().to_string()),
            allow_incentive: r
                .try_get::<String, _>("allow_incentive")
                .unwrap_or_else(|_| "N".to_string())
                .trim()
                .to_string(),
            is_home_delivery: r
                .try_get::<String, _>("is_home_delivery")
                .unwrap_or_else(|_| "N".to_string())
                .trim()
                .to_string(),
            is_tax_applicable: r
                .try_get::<String, _>("is_tax_applicable")
                .unwrap_or_else(|_| "N".to_string())
                .trim()
                .to_string(),
            is_takeaway_enabled: r
                .try_get::<String, _>("is_takeaway_enabled")
                .unwrap_or_else(|_| "N".to_string())
                .trim()
                .to_string(),
            is_print_enabled: r
                .try_get::<String, _>("is_print_enabled")
                .unwrap_or_else(|_| "N".to_string())
                .trim()
                .to_string(),
            printer_location: r
                .try_get::<Option<String>, _>("printer_location")
                .ok()
                .flatten()
                .map(|s| s.trim().to_string()),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedTableGroups { data, total })
}

#[tauri::command]
pub async fn get_all_table_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<TableGroupSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name, applicable_rate FROM table_group \
         WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| TableGroupSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            applicable_rate: r.try_get("applicable_rate").unwrap_or(1),
        })
        .collect())
}

#[tauri::command]
pub async fn create_table_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    name: String,
    applicable_rate: i32,
    service_printer_name: Option<String>,
    allow_incentive: String,
    is_home_delivery: String,
    is_tax_applicable: String,
    is_takeaway_enabled: String,
    is_print_enabled: String,
    printer_location: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    if !(1..=5).contains(&applicable_rate) {
        return Err("Rate must be between 1 and 5".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(code_val) = code {
        sqlx::query(
            "INSERT INTO table_group \
             (code, name, applicable_rate, service_printer_name, allow_incentive, \
              is_home_delivery, is_tax_applicable, is_takeaway_enabled, \
              is_print_enabled, printer_location) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        )
        .bind(code_val)
        .bind(&name)
        .bind(applicable_rate)
        .bind(trim_opt(service_printer_name))
        .bind(yn_flag(&allow_incentive))
        .bind(yn_flag(&is_home_delivery))
        .bind(yn_flag(&is_tax_applicable))
        .bind(yn_flag(&is_takeaway_enabled))
        .bind(yn_flag(&is_print_enabled))
        .bind(trim_opt(printer_location))
        .execute(&pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
                "Code or group name already exists".to_string()
            } else {
                format!("Failed to create table group: {e}")
            }
        })?;
    } else {
        sqlx::query(
            "INSERT INTO table_group \
             (name, applicable_rate, service_printer_name, allow_incentive, \
              is_home_delivery, is_tax_applicable, is_takeaway_enabled, \
              is_print_enabled, printer_location) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(&name)
        .bind(applicable_rate)
        .bind(trim_opt(service_printer_name))
        .bind(yn_flag(&allow_incentive))
        .bind(yn_flag(&is_home_delivery))
        .bind(yn_flag(&is_tax_applicable))
        .bind(yn_flag(&is_takeaway_enabled))
        .bind(yn_flag(&is_print_enabled))
        .bind(trim_opt(printer_location))
        .execute(&pool)
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
                "Table group name already exists".to_string()
            } else {
                format!("Failed to create table group: {e}")
            }
        })?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_table_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: Option<i64>,
    name: String,
    applicable_rate: i32,
    service_printer_name: Option<String>,
    allow_incentive: String,
    is_home_delivery: String,
    is_tax_applicable: String,
    is_takeaway_enabled: String,
    is_print_enabled: String,
    printer_location: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    if !(1..=5).contains(&applicable_rate) {
        return Err("Rate must be between 1 and 5".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    // COALESCE keeps the existing code when $1 is NULL
    sqlx::query(
        "UPDATE table_group SET \
         code = COALESCE($1, code), \
         name = $2, applicable_rate = $3, service_printer_name = $4, \
         allow_incentive = $5, is_home_delivery = $6, is_tax_applicable = $7, \
         is_takeaway_enabled = $8, is_print_enabled = $9, printer_location = $10, \
         updated_at = NOW() WHERE id = $11",
    )
    .bind(code)
    .bind(&name)
    .bind(applicable_rate)
    .bind(trim_opt(service_printer_name))
    .bind(yn_flag(&allow_incentive))
    .bind(yn_flag(&is_home_delivery))
    .bind(yn_flag(&is_tax_applicable))
    .bind(yn_flag(&is_takeaway_enabled))
    .bind(yn_flag(&is_print_enabled))
    .bind(trim_opt(printer_location))
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Code or group name already exists".to_string()
        } else {
            format!("Failed to update table group: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_table_group_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE table_group SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update table group: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_table_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM table_group WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete table group: {e}"))?;

    Ok(())
}
