use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — discount_detail table
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DiscountDetailRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub discount_percent: f64,
    pub ledger_id: Option<i64>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct DiscountDetailSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct PagedDiscountDetails {
    pub data: Vec<DiscountDetailRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_discount_details(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedDiscountDetails, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        Some("discount_percent") => "discount_percent",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total_row = sqlx::query(
        "SELECT COUNT(*) AS count FROM discount_detail WHERE name ILIKE $1",
    )
    .bind(&search_pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    let sql = format!(
        "SELECT id, code, name, \
                CAST(discount_percent AS FLOAT8) AS discount_percent, \
                ledger_id, is_active \
         FROM discount_detail WHERE name ILIKE $1 \
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
        .map(|r| DiscountDetailRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            discount_percent: r.try_get::<f64, _>("discount_percent").unwrap_or(0.0),
            ledger_id: r.try_get("ledger_id").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedDiscountDetails { data, total })
}

#[tauri::command]
pub async fn get_all_discount_details(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<DiscountDetailSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, code, name FROM discount_detail WHERE is_active = TRUE ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| DiscountDetailSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

#[tauri::command]
pub async fn create_discount_detail(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    code: Option<i64>,
    name: String,
    discount_percent: f64,
    ledger_id: Option<i64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    if !(0.0..=100.0).contains(&discount_percent) {
        return Err("Discount percent must be between 0 and 100".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(lid) = ledger_id {
        let check = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM general_ledger WHERE code = $1)",
        )
        .bind(lid)
        .fetch_one(&pool)
        .await;

        match check {
            Ok(false) => return Err(format!("GL code {lid} does not exist in general ledger")),
            Err(e) => {
                let msg = e.to_string();
                if !msg.contains("relation") && !msg.contains("does not exist") {
                    return Err(format!("Failed to validate GL code: {e}"));
                }
            }
            Ok(true) => {}
        }
    }

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Code or discount name already exists".to_string()
        } else {
            format!("Failed to create discount detail: {e}")
        }
    };

    if let Some(code_val) = code {
        sqlx::query(
            "INSERT INTO discount_detail (code, name, discount_percent, ledger_id) \
             VALUES ($1, $2, $3, $4)",
        )
        .bind(code_val)
        .bind(&name)
        .bind(discount_percent)
        .bind(ledger_id)
        .execute(&pool)
        .await
        .map_err(map_err)?;
    } else {
        sqlx::query(
            "INSERT INTO discount_detail (name, discount_percent, ledger_id) \
             VALUES ($1, $2, $3)",
        )
        .bind(&name)
        .bind(discount_percent)
        .bind(ledger_id)
        .execute(&pool)
        .await
        .map_err(map_err)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn update_discount_detail(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    discount_percent: f64,
    ledger_id: Option<i64>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    if !(0.0..=100.0).contains(&discount_percent) {
        return Err("Discount percent must be between 0 and 100".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    if let Some(lid) = ledger_id {
        let check = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM general_ledger WHERE code = $1)",
        )
        .bind(lid)
        .fetch_one(&pool)
        .await;

        match check {
            Ok(false) => return Err(format!("GL code {lid} does not exist in general ledger")),
            Err(e) => {
                let msg = e.to_string();
                if !msg.contains("relation") && !msg.contains("does not exist") {
                    return Err(format!("Failed to validate GL code: {e}"));
                }
            }
            Ok(true) => {}
        }
    }

    sqlx::query(
        "UPDATE discount_detail \
         SET name = $1, discount_percent = $2, ledger_id = $3, updated_at = NOW() \
         WHERE id = $4",
    )
    .bind(&name)
    .bind(discount_percent)
    .bind(ledger_id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Discount name already exists".to_string()
        } else {
            format!("Failed to update discount detail: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_discount_detail_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE discount_detail SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update discount detail: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_discount_detail(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM discount_detail WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete discount detail: {e}"))?;

    Ok(())
}
