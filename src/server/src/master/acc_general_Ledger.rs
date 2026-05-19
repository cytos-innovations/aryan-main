use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct GeneralLedgerRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub grp_code: Option<i32>,
    pub group_name: Option<String>,
    pub sub_led: Option<String>,
    pub open_bal: Option<f64>,
    pub open_crdr: Option<String>,
    pub prev_bal: Option<f64>,
    pub prev_crdr: Option<String>,
    pub close_bal: Option<f64>,
    pub close_crdr: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedGeneralLedger {
    pub data: Vec<GeneralLedgerRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct AccountGroupSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_general_ledgers(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedGeneralLedger, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "gl.code",
        Some("name") => "gl.name",
        _ => "gl.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM general_ledger gl WHERE gl.name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT gl.id, gl.code, gl.name, gl.grp_code, ag.name AS group_name, \
                gl.sub_led, gl.open_bal, gl.open_crdr, \
                gl.prev_bal, gl.prev_crdr, gl.close_bal, gl.close_crdr, gl.is_active \
         FROM general_ledger gl \
         LEFT JOIN account_groups ag ON ag.id = gl.grp_code \
         WHERE gl.name ILIKE $1 \
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
        .map(|r| GeneralLedgerRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            grp_code: r.try_get("grp_code").ok().flatten(),
            group_name: r.try_get("group_name").ok().flatten(),
            sub_led: r.try_get("sub_led").ok().flatten(),
            open_bal: r.try_get("open_bal").ok().flatten(),
            open_crdr: r.try_get("open_crdr").ok().flatten(),
            prev_bal: r.try_get("prev_bal").ok().flatten(),
            prev_crdr: r.try_get("prev_crdr").ok().flatten(),
            close_bal: r.try_get("close_bal").ok().flatten(),
            close_crdr: r.try_get("close_crdr").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedGeneralLedger { data, total })
}

// ─────────────────────────────────────────────────────────────
// Dropdown data
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_account_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AccountGroupSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let rows = sqlx::query(
        "SELECT id, code, name FROM account_groups WHERE is_active = 1 ORDER BY name",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows
        .iter()
        .map(|r| AccountGroupSimple {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
        })
        .collect())
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_general_ledger(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    grp_code: Option<i32>,
    sub_led: Option<String>,
    open_bal: Option<f64>,
    open_crdr: Option<String>,
    prev_bal: Option<f64>,
    prev_crdr: Option<String>,
    close_bal: Option<f64>,
    close_crdr: Option<String>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Ledger name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Ledger code or name already exists".to_string()
        } else {
            format!("Failed to create general ledger: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO general_ledger \
             (code, name, grp_code, sub_led, open_bal, open_crdr, prev_bal, prev_crdr, close_bal, close_crdr) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(grp_code)
        .bind(sub_led.as_deref())
        .bind(open_bal)
        .bind(open_crdr.as_deref())
        .bind(prev_bal)
        .bind(prev_crdr.as_deref())
        .bind(close_bal)
        .bind(close_crdr.as_deref())
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO general_ledger \
             (name, grp_code, sub_led, open_bal, open_crdr, prev_bal, prev_crdr, close_bal, close_crdr) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
        )
        .bind(&name)
        .bind(grp_code)
        .bind(sub_led.as_deref())
        .bind(open_bal)
        .bind(open_crdr.as_deref())
        .bind(prev_bal)
        .bind(prev_crdr.as_deref())
        .bind(close_bal)
        .bind(close_crdr.as_deref())
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
pub async fn update_general_ledger(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    grp_code: Option<i32>,
    sub_led: Option<String>,
    open_bal: Option<f64>,
    open_crdr: Option<String>,
    prev_bal: Option<f64>,
    prev_crdr: Option<String>,
    close_bal: Option<f64>,
    close_crdr: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Ledger name is required".to_string());
    }
    if code <= 0 {
        return Err("Ledger code is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE general_ledger \
         SET code = $1, name = $2, grp_code = $3, sub_led = $4, \
             open_bal = $5, open_crdr = $6, prev_bal = $7, prev_crdr = $8, \
             close_bal = $9, close_crdr = $10, updated_at = NOW() \
         WHERE id = $11",
    )
    .bind(code)
    .bind(&name)
    .bind(grp_code)
    .bind(sub_led.as_deref())
    .bind(open_bal)
    .bind(open_crdr.as_deref())
    .bind(prev_bal)
    .bind(prev_crdr.as_deref())
    .bind(close_bal)
    .bind(close_crdr.as_deref())
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Ledger code or name already exists".to_string()
        } else {
            format!("Failed to update general ledger: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_general_ledger_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query(
        "UPDATE general_ledger SET is_active = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(is_active)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| format!("Failed to update general ledger: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_general_ledger(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM general_ledger WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete general ledger: {e}"))?;
    Ok(())
}
