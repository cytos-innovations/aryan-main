use crate::{acquire_pool, AppState};
use crate::utility::query::QueryState;
use serde::{Deserialize, Serialize};
use sqlx::Row;

// ─────────────────────────────────────────────────────────────
// Structs — exact schema.sql columns for menu_card (MenuCard)
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MenuCardRow {
    pub id: i32,
    pub code: i64,
    pub item_barcode: Option<String>,
    pub name: String,
    pub menu_alias: Option<String>,
    pub menu_group_id: i32,
    pub menu_group_name: Option<String>,
    pub kitchen_section_id: Option<i32>,
    pub liquor_group_id: Option<i32>,
    pub food_type_id: i32,
    pub food_type_name: Option<String>,
    pub rate_1: f64,
    pub rate_2: f64,
    pub rate_3: f64,
    pub rate_4: f64,
    pub rate_5: f64,
    pub consume_quantity: f64,
    pub excise_rate: f64,
    pub comments: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PagedMenuCards {
    pub data: Vec<MenuCardRow>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct MenuRecipeRow {
    pub id: i32,
    pub menu_id: i32,
    pub ingredient_name: String,
    pub quantity: f64,
    pub unit_id: Option<i32>,
    pub unit_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UnitSimple {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeInput {
    pub ingredient_name: String,
    pub quantity: f64,
    pub unit_id: Option<i32>,
}

// ─────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_menu_cards(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    qs: QueryState,
    menu_group_id: Option<i32>,
    food_type_id: Option<i32>,
) -> Result<PagedMenuCards, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let search_pattern = format!("%{}%", qs.search.trim());
    let offset = qs.page * qs.per_page;

    let order_col = match qs.sort_by.as_deref() {
        Some("code") => "mc.code",
        Some("name") => "mc.name",
        _ => "mc.id",
    };
    let dir = if qs.sort_dir == "asc" { "ASC" } else { "DESC" };

    let select = "SELECT mc.id, mc.code, mc.item_barcode, mc.name, mc.menu_alias, \
                         mc.menu_group_id, mg.name AS menu_group_name, \
                         mc.kitchen_section_id, mc.liquor_group_id, \
                         mc.food_type_id, ft.name AS food_type_name, \
                         CAST(mc.rate_1 AS FLOAT8) AS rate_1, \
                         CAST(mc.rate_2 AS FLOAT8) AS rate_2, \
                         CAST(mc.rate_3 AS FLOAT8) AS rate_3, \
                         CAST(mc.rate_4 AS FLOAT8) AS rate_4, \
                         CAST(mc.rate_5 AS FLOAT8) AS rate_5, \
                         CAST(mc.consume_quantity AS FLOAT8) AS consume_quantity, \
                         CAST(mc.excise_rate AS FLOAT8) AS excise_rate, \
                         mc.comments, mc.is_active \
                  FROM menu_card mc \
                  LEFT JOIN menu_group mg ON mg.id = mc.menu_group_id \
                  LEFT JOIN food_type ft ON ft.id = mc.food_type_id";

    // Build WHERE conditions dynamically
    let (where_clause, bind_count, extra_binds): (&str, usize, Vec<i32>) = match (menu_group_id, food_type_id) {
        (None, None) => ("WHERE mc.name ILIKE $1", 3, vec![]),
        (Some(gid), None) => ("WHERE mc.name ILIKE $1 AND mc.menu_group_id = $4", 4, vec![gid]),
        (None, Some(fid)) => ("WHERE mc.name ILIKE $1 AND mc.food_type_id = $4", 4, vec![fid]),
        (Some(gid), Some(fid)) => ("WHERE mc.name ILIKE $1 AND mc.menu_group_id = $4 AND mc.food_type_id = $5", 5, vec![gid, fid]),
    };

    let count_where = match (menu_group_id, food_type_id) {
        (None, None) => "WHERE mc.name ILIKE $1".to_string(),
        (Some(_), None) => "WHERE mc.name ILIKE $1 AND mc.menu_group_id = $2".to_string(),
        (None, Some(_)) => "WHERE mc.name ILIKE $1 AND mc.food_type_id = $2".to_string(),
        (Some(_), Some(_)) => "WHERE mc.name ILIKE $1 AND mc.menu_group_id = $2 AND mc.food_type_id = $3".to_string(),
    };

    // Count query
    let count_sql = format!("SELECT COUNT(*) AS count FROM menu_card mc {}", count_where);
    let mut count_q = sqlx::query(&count_sql).bind(&search_pattern);
    for b in &extra_binds {
        count_q = count_q.bind(*b);
    }
    let total_row = count_q
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Count query failed: {e}"))?;
    let total: i64 = total_row.try_get("count").unwrap_or(0);

    // Data query
    let data_sql = format!(
        "{} {} ORDER BY {} {} LIMIT $2 OFFSET $3",
        select, where_clause, order_col, dir
    );
    let mut data_q = sqlx::query(&data_sql)
        .bind(&search_pattern)
        .bind(qs.per_page)
        .bind(offset);
    for b in &extra_binds {
        data_q = data_q.bind(*b);
    }
    let _ = bind_count; // used implicitly in SQL placeholders

    let rows = data_q
        .fetch_all(&pool)
        .await
        .map_err(|e| format!("Query failed: {e}"))?;

    let data = rows
        .iter()
        .map(|r| MenuCardRow {
            id: r.try_get("id").unwrap_or(0),
            code: r.try_get("code").unwrap_or(0),
            item_barcode: r.try_get("item_barcode").ok().flatten(),
            name: r.try_get("name").unwrap_or_default(),
            menu_alias: r.try_get("menu_alias").ok().flatten(),
            menu_group_id: r.try_get("menu_group_id").unwrap_or(0),
            menu_group_name: r.try_get("menu_group_name").ok().flatten(),
            kitchen_section_id: r.try_get("kitchen_section_id").ok().flatten(),
            liquor_group_id: r.try_get("liquor_group_id").ok().flatten(),
            food_type_id: r.try_get("food_type_id").unwrap_or(0),
            food_type_name: r.try_get("food_type_name").ok().flatten(),
            rate_1: r.try_get::<f64, _>("rate_1").unwrap_or(0.0),
            rate_2: r.try_get::<f64, _>("rate_2").unwrap_or(0.0),
            rate_3: r.try_get::<f64, _>("rate_3").unwrap_or(0.0),
            rate_4: r.try_get::<f64, _>("rate_4").unwrap_or(0.0),
            rate_5: r.try_get::<f64, _>("rate_5").unwrap_or(0.0),
            consume_quantity: r.try_get::<f64, _>("consume_quantity").unwrap_or(0.0),
            excise_rate: r.try_get::<f64, _>("excise_rate").unwrap_or(0.0),
            comments: r.try_get("comments").ok().flatten(),
            is_active: r.try_get("is_active").unwrap_or(true),
        })
        .collect();

    Ok(PagedMenuCards { data, total })
}

#[tauri::command]
pub async fn create_menu_card(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    name: String,
    code: Option<i64>,
    menu_group_id: i32,
    food_type_id: i32,
    item_barcode: Option<String>,
    menu_alias: Option<String>,
    kitchen_section_id: Option<i32>,
    liquor_group_id: Option<i32>,
    rate_1: f64,
    rate_2: f64,
    rate_3: f64,
    rate_4: f64,
    rate_5: f64,
    consume_quantity: f64,
    excise_rate: f64,
    comments: Option<String>,
) -> Result<i32, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let barcode = item_barcode.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });
    let alias = menu_alias.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });
    let cmts = comments.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });

    let map_err = |e: sqlx::Error| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Barcode already exists".to_string()
        } else {
            format!("Failed to create menu card: {e}")
        }
    };

    let pool = acquire_pool(&state.pool, &app).await?;

    let new_id: i32 = if let Some(c) = code.filter(|&c| c > 0) {
        sqlx::query_scalar(
            "INSERT INTO menu_card \
             (code, name, menu_group_id, food_type_id, item_barcode, menu_alias, \
              kitchen_section_id, liquor_group_id, \
              rate_1, rate_2, rate_3, rate_4, rate_5, \
              consume_quantity, excise_rate, comments) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) \
             RETURNING id",
        )
        .bind(c)
        .bind(&name)
        .bind(menu_group_id)
        .bind(food_type_id)
        .bind(barcode)
        .bind(alias)
        .bind(kitchen_section_id)
        .bind(liquor_group_id)
        .bind(rate_1)
        .bind(rate_2)
        .bind(rate_3)
        .bind(rate_4)
        .bind(rate_5)
        .bind(consume_quantity)
        .bind(excise_rate)
        .bind(cmts)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    } else {
        sqlx::query_scalar(
            "INSERT INTO menu_card \
             (name, menu_group_id, food_type_id, item_barcode, menu_alias, \
              kitchen_section_id, liquor_group_id, \
              rate_1, rate_2, rate_3, rate_4, rate_5, \
              consume_quantity, excise_rate, comments) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) \
             RETURNING id",
        )
        .bind(&name)
        .bind(menu_group_id)
        .bind(food_type_id)
        .bind(barcode)
        .bind(alias)
        .bind(kitchen_section_id)
        .bind(liquor_group_id)
        .bind(rate_1)
        .bind(rate_2)
        .bind(rate_3)
        .bind(rate_4)
        .bind(rate_5)
        .bind(consume_quantity)
        .bind(excise_rate)
        .bind(cmts)
        .fetch_one(&pool)
        .await
        .map_err(map_err)?
    };

    Ok(new_id)
}

#[tauri::command]
pub async fn update_menu_card(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    name: String,
    menu_group_id: i32,
    food_type_id: i32,
    item_barcode: Option<String>,
    menu_alias: Option<String>,
    kitchen_section_id: Option<i32>,
    liquor_group_id: Option<i32>,
    rate_1: f64,
    rate_2: f64,
    rate_3: f64,
    rate_4: f64,
    rate_5: f64,
    consume_quantity: f64,
    excise_rate: f64,
    comments: Option<String>,
) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    let barcode = item_barcode.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });
    let alias = menu_alias.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });
    let cmts = comments.and_then(|s| {
        let t = s.trim().to_string();
        if t.is_empty() { None } else { Some(t) }
    });

    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query(
        "UPDATE menu_card SET \
         name = $1, menu_group_id = $2, food_type_id = $3, item_barcode = $4, \
         menu_alias = $5, kitchen_section_id = $6, liquor_group_id = $7, \
         rate_1 = $8, rate_2 = $9, rate_3 = $10, rate_4 = $11, rate_5 = $12, \
         consume_quantity = $13, excise_rate = $14, comments = $15, \
         updated_at = NOW() WHERE id = $16",
    )
    .bind(&name)
    .bind(menu_group_id)
    .bind(food_type_id)
    .bind(barcode)
    .bind(alias)
    .bind(kitchen_section_id)
    .bind(liquor_group_id)
    .bind(rate_1)
    .bind(rate_2)
    .bind(rate_3)
    .bind(rate_4)
    .bind(rate_5)
    .bind(consume_quantity)
    .bind(excise_rate)
    .bind(cmts)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("23505") || msg.contains("unique") || msg.contains("duplicate") {
            "Barcode already exists".to_string()
        } else {
            format!("Failed to update menu card: {e}")
        }
    })?;

    Ok(())
}

#[tauri::command]
pub async fn toggle_menu_card_active(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
    is_active: bool,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("UPDATE menu_card SET is_active = $1, updated_at = NOW() WHERE id = $2")
        .bind(is_active)
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to update menu card: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_menu_card(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: i32,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM menu_card WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to delete menu card: {e}"))?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Recipe commands
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct IngredientSuggestion {
    pub id: i32,
    pub name: String,
}

#[tauri::command]
pub async fn search_ingredient_items(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    query: String,
) -> Result<Vec<IngredientSuggestion>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;
    let pattern = format!("%{}%", query.trim());

    let rows = sqlx::query(
        "SELECT id, name FROM item_name \
         WHERE name ILIKE $1 AND is_active = 1 \
         ORDER BY name ASC LIMIT 20",
    )
    .bind(&pattern)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to search ingredients: {e}"))?;

    Ok(rows.iter().map(|r| IngredientSuggestion {
        id:   r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_all_units_for_recipe(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<UnitSimple>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT id, name FROM units WHERE is_active = 1 ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch units: {e}"))?;

    Ok(rows.iter().map(|r| UnitSimple {
        id:   r.try_get("id").unwrap_or(0),
        name: r.try_get("name").unwrap_or_default(),
    }).collect())
}

#[tauri::command]
pub async fn get_menu_recipes(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    menu_id: i32,
) -> Result<Vec<MenuRecipeRow>, String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    let rows = sqlx::query(
        "SELECT mr.id, mr.menu_id, mr.ingredient_name, \
                CAST(mr.quantity AS FLOAT8) AS quantity, \
                mr.unit_id, u.name AS unit_name \
         FROM menu_recipe mr \
         LEFT JOIN units u ON u.id = mr.unit_id \
         WHERE mr.menu_id = $1 \
         ORDER BY mr.id ASC",
    )
    .bind(menu_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch recipes: {e}"))?;

    Ok(rows.iter().map(|r| MenuRecipeRow {
        id:              r.try_get("id").unwrap_or(0),
        menu_id:         r.try_get("menu_id").unwrap_or(0),
        ingredient_name: r.try_get("ingredient_name").unwrap_or_default(),
        quantity:        r.try_get::<f64, _>("quantity").unwrap_or(0.0),
        unit_id:         r.try_get("unit_id").ok().flatten(),
        unit_name:       r.try_get("unit_name").ok().flatten(),
    }).collect())
}

#[tauri::command]
pub async fn save_menu_recipes(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    menu_id: i32,
    recipes: Vec<RecipeInput>,
) -> Result<(), String> {
    let pool = acquire_pool(&state.pool, &app).await?;

    sqlx::query("DELETE FROM menu_recipe WHERE menu_id = $1")
        .bind(menu_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to clear recipes: {e}"))?;

    for r in &recipes {
        let name = r.ingredient_name.trim().to_string();
        if name.is_empty() || r.quantity <= 0.0 {
            continue;
        }
        sqlx::query(
            "INSERT INTO menu_recipe (menu_id, ingredient_name, quantity, unit_id) \
             VALUES ($1, $2, $3, $4)",
        )
        .bind(menu_id)
        .bind(&name)
        .bind(r.quantity)
        .bind(r.unit_id)
        .execute(&pool)
        .await
        .map_err(|e| format!("Failed to insert recipe row: {e}"))?;
    }

    Ok(())
}
