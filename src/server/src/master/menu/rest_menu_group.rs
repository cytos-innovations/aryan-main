use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::Serialize;
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — new menu_group schema
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MenuGroupRow {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub category_id: Option<i32>,
    pub category_name: Option<String>,
    pub multiple_recipe: Option<String>,
    pub as_per_size: Option<String>,
    pub menu_grp_image: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct MenuGroupSimple {
    pub id: i32,
    pub code: i64,
    pub name: String,
    pub category_id: Option<i32>,
    pub category_name: Option<String>,
    pub multiple_recipe: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PagedMenuGroups {
    pub data: Vec<MenuGroupRow>,
    pub total: i64,
}

// ─────────────────────────────────────────────────────────────
// List (paginated)
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

    let select = "SELECT mg.id, mg.code, mg.name, mg.category_id, mc.name AS category_name, \
                         mg.multiple_recipe, mg.as_per_size, mg.menu_grp_image, mg.is_active \
                  FROM menu_group mg \
                  LEFT JOIN menu_category mc ON mc.id = mg.category_id";

    let (total, rows) = if let Some(cat_id) = category_id {
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM menu_group mg \
             WHERE mg.name ILIKE $1 AND mg.category_id = $2",
        )
        .bind(&search_pattern)
        .bind(cat_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count failed: {e}"))?;

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
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM menu_group mg WHERE mg.name ILIKE $1",
        )
        .bind(&search_pattern)
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count failed: {e}"))?;

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

    let data = rows.iter().map(|r| MenuGroupRow {
        id:              r.try_get("id").unwrap_or(0),
        code:            r.try_get("code").unwrap_or(0),
        name:            r.try_get("name").unwrap_or_default(),
        category_id:     r.try_get("category_id").ok().flatten(),
        category_name:   r.try_get("category_name").ok().flatten(),
        multiple_recipe: r.try_get("multiple_recipe").ok().flatten(),
        as_per_size:     r.try_get("as_per_size").ok().flatten(),
        menu_grp_image:  r.try_get("menu_grp_image").ok().flatten(),
        is_active:       r.try_get("is_active").unwrap_or(true),
    }).collect();

    Ok(PagedMenuGroups { data, total })
}

// ─────────────────────────────────────────────────────────────
// All (for dropdowns — includes category_name for menu_card)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_menu_groups(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<MenuGroupSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT mg.id, mg.code, mg.name, mg.category_id, mc.name AS category_name, mg.multiple_recipe \
         FROM menu_group mg \
         LEFT JOIN menu_category mc ON mc.id = mg.category_id \
         WHERE mg.is_active = TRUE ORDER BY mg.name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Query failed: {e}"))?;

    Ok(rows.iter().map(|r| MenuGroupSimple {
        id:              r.try_get("id").unwrap_or(0),
        code:            r.try_get("code").unwrap_or(0),
        name:            r.try_get("name").unwrap_or_default(),
        category_id:     r.try_get("category_id").ok().flatten(),
        category_name:   r.try_get("category_name").ok().flatten(),
        multiple_recipe: r.try_get("multiple_recipe").ok().flatten(),
    }).collect())
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn create_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    category_id: Option<i32>,
    multiple_recipe: Option<String>,
    as_per_size: Option<String>,
    menu_grp_image: Option<String>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    let multiple_recipe = multiple_recipe
        .map(|s| s.trim().to_string())
        .filter(|s| s == "Y" || s == "N");
    let as_per_size = as_per_size
        .map(|s| s.trim().to_string())
        .filter(|s| s == "Y" || s == "N");
    let menu_grp_image = menu_grp_image
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let map_err = |e: sqlx::Error| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            if m.contains("menu_group_name") || m.contains("_name_") {
                "A menu group with this name already exists".to_string()
            } else if m.contains("menu_group_code") || m.contains("_code_") {
                "A menu group with this code already exists".to_string()
            } else {
                "A menu group with this name or code already exists".to_string()
            }
        } else {
            format!("Failed to create group: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let resolved_code: i64 = if let Some(c) = code.filter(|&c| c > 0) {
        c
    } else {
        let max: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(code), 0) FROM menu_group")
            .fetch_one(&pool)
            .await
            .map_err(|e| format!("Failed to get max code: {e}"))?;
        max + 1
    };

    let id: i32 = {
        sqlx::query_scalar(
            "INSERT INTO menu_group (code, name, category_id, multiple_recipe, as_per_size, menu_grp_image) \
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(resolved_code)
        .bind(&name)
        .bind(category_id)
        .bind(&multiple_recipe)
        .bind(&as_per_size)
        .bind(&menu_grp_image)
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
pub async fn update_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    code: i64,
    name: String,
    category_id: Option<i32>,
    multiple_recipe: Option<String>,
    as_per_size: Option<String>,
    menu_grp_image: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Group name is required".to_string());
    }
    let multiple_recipe = multiple_recipe
        .map(|s| s.trim().to_string())
        .filter(|s| s == "Y" || s == "N");
    let as_per_size = as_per_size
        .map(|s| s.trim().to_string())
        .filter(|s| s == "Y" || s == "N");
    let menu_grp_image = menu_grp_image
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE menu_group SET \
         code = $1, name = $2, category_id = $3, \
         multiple_recipe = $4, as_per_size = $5, menu_grp_image = $6, \
         updated_at = NOW() WHERE id = $7",
    )
    .bind(code)
    .bind(&name)
    .bind(category_id)
    .bind(&multiple_recipe)
    .bind(&as_per_size)
    .bind(&menu_grp_image)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let m = e.to_string();
        if m.contains("23505") || m.contains("unique") || m.contains("duplicate") {
            "A menu group with this name already exists".to_string()
        } else {
            format!("Failed to update group: {e}")
        }
    })?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Toggle active
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Delete (cascades associated menu cards first)
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn delete_menu_group(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM menu_card WHERE menu_group_id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete associated menu cards: {e}"))?;

    sqlx::query("DELETE FROM menu_group WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete group: {e}"))?;

    Ok(())
}
