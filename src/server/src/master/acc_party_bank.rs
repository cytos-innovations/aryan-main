use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct PartyBankRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub location: Option<String>,
    pub is_active: i32,
}

#[derive(Debug, Serialize)]
pub struct PagedPartyBanks {
    pub data: Vec<PartyBankRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_party_banks(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
) -> Result<PagedPartyBanks, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "code",
        Some("name") => "name",
        _ => "id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM party_bank WHERE name ILIKE $1",
    )
    .bind(&pattern)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Count failed: {e}"))?;

    let sql = format!(
        "SELECT id, code, name, location, is_active \
         FROM party_bank \
         WHERE name ILIKE $1 \
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
        .map(|r| PartyBankRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            name: r.try_get("name").unwrap_or_default(),
            location: r.try_get("location").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(1),
        })
        .collect();

    Ok(PagedPartyBanks { data, total })
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_party_bank(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    location: Option<String>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Bank name is required".to_string());
    }

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Bank code or name already exists".to_string()
        } else {
            format!("Failed to create party bank: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO party_bank (code, name, location) VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(location.as_deref())
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO party_bank (name, location) VALUES ($1, $2) RETURNING id",
        )
        .bind(&name)
        .bind(location.as_deref())
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
pub async fn update_party_bank(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    location: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Bank name is required".to_string());
    }
    if code <= 0 {
        return Err("Bank code is required".to_string());
    }

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE party_bank SET code = $1, name = $2, location = $3, \
         updated_at = NOW() WHERE id = $4",
    )
    .bind(code)
    .bind(&name)
    .bind(location.as_deref())
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") {
            "Bank code or name already exists".to_string()
        } else {
            format!("Failed to update party bank: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle Active / Delete
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_party_bank_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("UPDATE party_bank SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update party bank: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_party_bank(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    sqlx::query("DELETE FROM party_bank WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete party bank: {e}"))?;
    Ok(())
}
