mod utility;
mod master;
mod transaction;
mod bill;

use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, Executor};
use std::{fs, sync::Arc, time::Duration};
use tauri::Manager;
use tokio::sync::Mutex;

use utility::auth::{current_permissions, get_accessible_applications, login};
use utility::company_details::{get_company_details, save_company_details};
use utility::query::{
    change_user_password, create_user, delete_user, get_dashboard_stats, get_users,
    toggle_user_active, update_user,
};
use utility::user_access::{
    get_all_applications, get_all_apps_with_assignment, get_all_users,
    get_applications_for_user, get_user_access, set_user_applications, set_user_permissions,
    get_user_discount_cap, save_user_discount_cap,
};

use master::menu::rest_menu_category::{
    create_menu_category, delete_menu_category, get_all_menu_categories, get_menu_categories,
    toggle_menu_category_active, update_menu_category,
    get_menu_category_detail,
    get_all_units_for_menu_category,
    lookup_tally_for_menu_category,
    lookup_tax_for_menu_category,
};
use master::menu::rest_menu_type::{
    create_food_type, delete_food_type, get_all_food_types, get_food_types,
    toggle_food_type_active, update_food_type,
};
use master::menu::rest_menu_group::{
    create_menu_group, delete_menu_group, get_all_menu_groups, get_menu_groups,
    toggle_menu_group_active, update_menu_group,
};
use master::menu::rest_menu_main::{
    create_menu_card, delete_menu_card, get_menu_cards, toggle_menu_card_active, update_menu_card,
    get_all_units_for_recipe, get_menu_recipes, save_menu_recipes, search_ingredient_items,
};
use master::menu::rest_kitchen_section::{
    get_kitchen_section_list, create_kitchen_section, update_kitchen_section,
    toggle_kitchen_section_active, delete_kitchen_section,
};
use master::table::rest_table_group::{
    create_table_group, delete_table_group, get_all_table_groups, get_kitchen_sections,
    get_table_groups, toggle_table_group_active, update_table_group,
};
use master::table::rest_table_main::{
    create_restaurant_table, delete_restaurant_table, get_restaurant_tables,
    toggle_restaurant_table_active, update_restaurant_table,
};
use master::messages::rest_bill_msg::{
    create_bill_message, delete_bill_message, get_bill_messages,
    toggle_bill_message_active, update_bill_message,
};
use master::messages::rest_kot_msg::{
    create_kot_message, delete_kot_message, get_kot_messages,
    toggle_kot_message_active, update_kot_message,
};

use master::lodge_discount_info::{
    create_discount_detail, delete_discount_detail, get_all_discount_details,
    get_discount_details, toggle_discount_detail_active, update_discount_detail,
};
use master::lodge_identity::{
    create_identity_type, delete_identity_type, get_all_identity_types,
    get_identity_types, toggle_identity_type_active, update_identity_type,
};
use master::lodge_market_segment::{
    create_market_segment, delete_market_segment, get_all_market_segments,
    get_market_segments, toggle_market_segment_active, update_market_segment,
};
use master::lodge_plan::{
    create_plan_master, delete_plan_master, get_all_plan_masters,
    get_plan_masters, toggle_plan_master_active, update_plan_master,
};
use master::lodge_customer_info::{
    get_customer_informations, create_customer_information, update_customer_information,
    toggle_customer_information_active, delete_customer_information,
    search_states, search_cities,
    save_customer_document, get_customer_documents, get_customer_document_data,
    delete_customer_document,
};
use master::acc_tax_master::{
    get_tax_masters, create_tax_master, update_tax_master,
    toggle_tax_master_active, delete_tax_master,
    lookup_tally_by_code, lookup_gl_by_code,
    get_tax_slabs, save_tax_slab, delete_tax_slab,
};
use master::party_ledger::acc_creditor::{
    get_creditors, create_creditor, update_creditor,
    toggle_creditor_active, delete_creditor,
};
use master::party_ledger::acc_debtor::{
    get_debtors, create_debtor, update_debtor,
    toggle_debtor_active, delete_debtor,
};
use master::acc_tally_master::{
    get_tally_masters, get_all_tally_masters, create_tally_master,
    update_tally_master, toggle_tally_master_active, delete_tally_master,
};
use master::account_groups::acc_account_categories::{
    get_account_categories, create_account_category, update_account_category,
    toggle_account_category_active, delete_account_category,
};
use master::account_groups::acc_account_groups::{
    get_account_groups, get_all_account_categories, create_account_group,
    update_account_group, toggle_account_group_active, delete_account_group,
};
use master::kitchen_stock::material_item_group::{
    get_item_groups, get_item_group_detail,
    get_all_tally_for_item, get_all_units_for_item, get_all_taxes_for_item,
    lookup_tally_for_item_group, lookup_tax_for_item_group,
    create_item_group, update_item_group, toggle_item_group_active, delete_item_group,
};
use master::kitchen_stock::material_item_name::{
    get_item_names,
    get_all_item_groups_for_name, get_all_kitchen_sections_for_name,
    lookup_item_group_for_name, lookup_kitchen_section_for_name,
    create_item_name, update_item_name, toggle_item_name_active, delete_item_name,
};
use master::acc_day_book::{
    get_day_books, get_all_groups_for_daybook, get_all_ledgers_for_daybook,
    create_day_book, update_day_book, toggle_day_book_active, delete_day_book,
};
use master::acc_party_bank::{
    get_party_banks, create_party_bank, update_party_bank,
    toggle_party_bank_active, delete_party_bank,
};
use master::acc_general_Ledger::{
    get_general_ledgers, get_all_account_groups, create_general_ledger,
    update_general_ledger, toggle_general_ledger_active, delete_general_ledger,
};
use master::employee::acc_designation::{
    get_designations, get_all_designations, create_designation,
    update_designation, toggle_designation_active, delete_designation,
};
use master::employee::acc_employee_info::{
    get_employees, create_employee, update_employee,
    toggle_employee_active, delete_employee,
};

use transaction::rest_cal_insentive::{
    get_cal_incentives, get_menu_cards_simple,
    create_cal_incentive, update_cal_incentive,
    toggle_cal_incentive_active, delete_cal_incentive,
};

use bill::{
    // Lookup
    get_tables_for_billing,
    get_menu_for_billing,
    get_active_sessions,
    get_floor_view,
    get_restaurant_dashboard,
    // Session lifecycle
    open_order_session,
    get_order_session,
    get_session_detail,
    update_session_info,
    cancel_order_session,
    // Order items
    get_order_items,
    add_order_item,
    update_order_item_qty,
    cancel_order_item,
    cancel_order_item_with_reason,
    // KOT
    generate_kot,
    get_kot_list,
    // Table shift / item transfer
    shift_table_full,
    transfer_order_items,
    transfer_order_items_with_qty,
    // Bill & payment
    get_bill_summary,
    generate_bill,
    settle_bill,
    get_payment_methods,
    // Reservations
    get_reservations,
    get_reservation_by_id,
    create_reservation,
    update_reservation,
    update_reservation_status,
    cancel_reservation,
    expire_no_show_reservations,
    get_employees_for_billing,
    // Bill reprint
    search_settled_bills,
    get_bill_for_reprint,
    // Customer / waiter party
    search_customers,
    quick_create_customer,
    update_session_party,
    get_customer_due_by_mobile,
    // KOT messages / item modifiers
    search_kot_messages,
    add_order_item_modifier,
    clear_order_item_modifiers,
};

// ─────────────────────────────────────────────────────────────
// Shared structs
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
    pub database: String,
}

impl DbConfig {
    fn to_url(&self) -> String {
        let user = urlencode(&self.user);
        let pass = urlencode(&self.password);
        let db = urlencode(&self.database);
        format!(
            "postgres://{}:{}@{}:{}/{}",
            user, pass, self.host, self.port, db
        )
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApplicationInfo {
    pub id: i32,
    pub code: String,
    pub application_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub id: i32,
    pub username: String,
    pub is_super: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResult {
    pub user: UserInfo,
    pub application: ApplicationInfo,
    pub permissions: Vec<String>,
}

// ─────────────────────────────────────────────────────────────
// Shared app state
// ─────────────────────────────────────────────────────────────

pub struct AppState {
    pub pool: Arc<Mutex<Option<PgPool>>>,
}

// ─────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────

fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("failed to create app data dir: {e}"))?;
    }
    Ok(dir.join("db-config.json"))
}

fn get_stored_config(app: &tauri::AppHandle) -> Result<DbConfig, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Err("No database configuration found. Please complete setup first.".to_string());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("failed to read config: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("failed to parse config: {e}"))
}

// ─────────────────────────────────────────────────────────────
// Pool + schema
// ─────────────────────────────────────────────────────────────

pub(crate) async fn acquire_pool(
    pool_state: &Arc<Mutex<Option<PgPool>>>,
    app: &tauri::AppHandle,
) -> Result<PgPool, String> {
    let mut guard = pool_state.lock().await;
    if let Some(pool) = guard.as_ref() {
        return Ok(pool.clone());
    }
    let config = get_stored_config(app)?;

    // Detect the local system timezone name (IANA format, e.g. "Asia/Kolkata").
    // Falls back to "UTC" if detection fails so the app never refuses to start.
    let tz_name = iana_time_zone::get_timezone().unwrap_or_else(|_| "UTC".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(10))
        .after_connect(move |conn, _meta| {
            let tz = tz_name.clone();
            Box::pin(async move {
                conn.execute(
                    sqlx::query(&format!("SET TIME ZONE '{}'", tz))
                ).await?;
                Ok(())
            })
        })
        .connect(&config.to_url())
        .await
        .map_err(|e| format!("Database connection failed: {e}"))?;

    init_schema(&pool).await?;

    *guard = Some(pool.clone());
    Ok(pool)
}

async fn init_schema(pool: &PgPool) -> Result<(), String> {
    // One-time migration: drop old permissions schema (permission_code → permission_name)
    let old_schema: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'permissions' AND column_name = 'permission_code'
        )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if old_schema {
        sqlx::query("DROP TABLE IF EXISTS user_permissions CASCADE").execute(pool).await.ok();
        sqlx::query("DROP TABLE IF EXISTS permissions CASCADE").execute(pool).await.ok();
    }

    // Migration: remove application_id from permissions (permissions are now global)
    let has_app_id_col: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'permissions' AND column_name = 'application_id'
        )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if has_app_id_col {
        sqlx::query("DROP TABLE IF EXISTS user_permissions CASCADE").execute(pool).await.ok();
        sqlx::query("DROP TABLE IF EXISTS permissions CASCADE").execute(pool).await.ok();
    }

    // Remove duplicate permission rows left over from old per-app seeding.
    // First remap user_permissions to the surviving (lowest) id so no assignments are lost,
    // then delete the duplicates and ensure a unique index exists.
    sqlx::query(
        "UPDATE user_permissions up \
         SET permission_id = p_keep.min_id \
         FROM permissions p \
         JOIN (SELECT permission_name, MIN(id) AS min_id \
               FROM permissions GROUP BY permission_name) p_keep \
           ON p.permission_name = p_keep.permission_name AND p.id <> p_keep.min_id \
         WHERE up.permission_id = p.id",
    )
    .execute(pool)
    .await
    .ok();

    sqlx::query(
        "DELETE FROM permissions \
         WHERE id NOT IN (SELECT MIN(id) FROM permissions GROUP BY permission_name)",
    )
    .execute(pool)
    .await
    .ok();

    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS permissions_permission_name_key \
         ON permissions (permission_name)",
    )
    .execute(pool)
    .await
    .ok();

    // Drop old incorrectly-structured menu tables (schema.sql is source of truth)
    let drop_stmts = [
        "DROP TABLE IF EXISTS menu_items CASCADE",
        "DROP TABLE IF EXISTS menu_groups CASCADE",
        "DROP TABLE IF EXISTS menu_types CASCADE",
        "DROP TABLE IF EXISTS menu_categories CASCADE",
    ];
    for stmt in drop_stmts {
        sqlx::query(stmt)
            .execute(pool)
            .await
            .map_err(|e| format!("Drop error: {e}"))?;
    }

    // Migrate tax_slab: old schema used slab_code/slab_name; new uses slab_from/slab_to
    let old_tax_slab: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tax_slab' AND column_name = 'slab_code'
        )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if old_tax_slab {
        sqlx::query("DROP TABLE IF EXISTS tax_slab CASCADE").execute(pool).await.ok();
    }

    // Migrate employee_information.code: BIGSERIAL → VARCHAR(20), drop emp_no
    let emp_code_is_bigint: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'employee_information'
              AND column_name = 'code'
              AND data_type = 'bigint'
        )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if emp_code_is_bigint {
        sqlx::query(
            "ALTER TABLE employee_information ALTER COLUMN code DROP DEFAULT",
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Migration failed (emp code drop default): {e}"))?;

        sqlx::query(
            "ALTER TABLE employee_information \
             ALTER COLUMN code TYPE VARCHAR(20) USING code::TEXT",
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Migration failed (emp code type): {e}"))?;
    }

    let emp_no_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'employee_information' AND column_name = 'emp_no'
        )",
    )
    .fetch_one(pool)
    .await
    .unwrap_or(false);

    if emp_no_exists {
        sqlx::query("ALTER TABLE employee_information DROP COLUMN emp_no")
            .execute(pool)
            .await
            .map_err(|e| format!("Migration failed (drop emp_no): {e}"))?;
    }

    // ── Migrate restaurant_table: add billing status columns ──────
    for col_sql in [
        "ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS current_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'",
        "ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS current_order_session_id INTEGER",
        "ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS occupied_since TIMESTAMP",
    ] {
        sqlx::query(col_sql).execute(pool).await.ok();
    }

    // ── Migrate order_session: add delivery address (captured at settle) ──
    sqlx::query("ALTER TABLE order_session ADD COLUMN IF NOT EXISTS delivery_address TEXT")
        .execute(pool).await.ok();

    let stmts = [
        // Core auth tables
        r#"CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            user_name     VARCHAR(50)  UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_super      INTEGER      NOT NULL DEFAULT 0,
            last_login    TIMESTAMPTZ,
            is_active     INTEGER      NOT NULL DEFAULT 1,
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            created_by    INTEGER,
            updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_by    INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS applications (
            id               SERIAL PRIMARY KEY,
            code             VARCHAR(50)  UNIQUE NOT NULL,
            application_name VARCHAR(100) NOT NULL,
            is_active        INTEGER      NOT NULL DEFAULT 1,
            created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            created_by       INTEGER,
            updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_by       INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS user_applications (
            id             SERIAL PRIMARY KEY,
            user_id        INTEGER NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
            application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
            is_active      INTEGER NOT NULL DEFAULT 1,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by     INTEGER,
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by     INTEGER,
            UNIQUE(user_id, application_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS permissions (
            id              SERIAL PRIMARY KEY,
            permission_name VARCHAR(200) NOT NULL,
            action          VARCHAR(50)  NOT NULL,
            description     TEXT,
            is_active       INTEGER      NOT NULL DEFAULT 1,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            created_by      INTEGER,
            updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_by      INTEGER,
            UNIQUE(permission_name)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS user_permissions (
            id            SERIAL PRIMARY KEY,
            user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by    INTEGER,
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by    INTEGER,
            UNIQUE(user_id, permission_id)
        )"#,
        // Menu tables — strict schema.sql structure
        r#"CREATE TABLE IF NOT EXISTS food_type (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50)  NOT NULL UNIQUE,
            is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS menu_category (
            id                   SERIAL PRIMARY KEY,
            code                 BIGSERIAL UNIQUE,
            category_type        CHAR(1),
            name                 VARCHAR(30) NOT NULL UNIQUE,
            tally_code           INTEGER,
            allow_discount       BOOLEAN      NOT NULL DEFAULT FALSE,
            max_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
            auto_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
            unit_id              INTEGER,
            is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by           INTEGER,
            updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by           INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS menu_category_tax_detail (
            id             SERIAL PRIMARY KEY,
            category_id    INTEGER REFERENCES menu_category(id) ON DELETE CASCADE,
            tax_id         INTEGER,
            tax_percentage NUMERIC(10,4) NOT NULL DEFAULT 0,
            is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
            created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by     INTEGER,
            updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by     INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS menu_group (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            name            VARCHAR(50)  NOT NULL UNIQUE,
            category_id     INTEGER      REFERENCES menu_category(id),
            multiple_recipe CHAR(1),
            as_per_size     CHAR(1),
            menu_grp_image  TEXT,
            is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS menu_card (
            id                 SERIAL PRIMARY KEY,
            code               BIGSERIAL UNIQUE,
            item_barcode       VARCHAR(100) UNIQUE,
            name               VARCHAR(250) NOT NULL,
            menu_alias         VARCHAR(250),
            menu_group_id      INTEGER      NOT NULL REFERENCES menu_group(id),
            kitchen_section_id INTEGER,
            liquor_group_id    INTEGER,
            food_type_id       INTEGER      NOT NULL REFERENCES food_type(id),
            rate_1             NUMERIC(12,2) NOT NULL DEFAULT 0,
            rate_2             NUMERIC(12,2) NOT NULL DEFAULT 0,
            rate_3             NUMERIC(12,2) NOT NULL DEFAULT 0,
            rate_4             NUMERIC(12,2) NOT NULL DEFAULT 0,
            rate_5             NUMERIC(12,2) NOT NULL DEFAULT 0,
            consume_quantity   NUMERIC(12,2) NOT NULL DEFAULT 0,
            excise_rate        NUMERIC(12,2) NOT NULL DEFAULT 0,
            comments           TEXT,
            is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by         INTEGER,
            updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by         INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS cal_incentive (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            menu_card_id    INTEGER NOT NULL REFERENCES menu_card(id) ON DELETE CASCADE,
            sunday_inc      NUMERIC(10,4) NOT NULL DEFAULT 0,
            monday_inc      NUMERIC(10,4) NOT NULL DEFAULT 0,
            tuesday_inc     NUMERIC(10,4) NOT NULL DEFAULT 0,
            wednesday_inc   NUMERIC(10,4) NOT NULL DEFAULT 0,
            thursday_inc    NUMERIC(10,4) NOT NULL DEFAULT 0,
            friday_inc      NUMERIC(10,4) NOT NULL DEFAULT 0,
            saturday_inc    NUMERIC(10,4) NOT NULL DEFAULT 0,
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        // ── Table / Messages tables ──────────────────────────────────
        r#"CREATE TABLE IF NOT EXISTS kitchen_section (
            id               SERIAL PRIMARY KEY,
            code             BIGSERIAL UNIQUE,
            name             VARCHAR(50)  NOT NULL UNIQUE,
            is_print_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
            printer_name     VARCHAR(50),
            printer_type     VARCHAR(20),
            is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by       INTEGER,
            updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by       INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS table_group (
            id                  SERIAL PRIMARY KEY,
            code                BIGSERIAL UNIQUE,
            name                VARCHAR(50)  NOT NULL UNIQUE,
            allow_incentive     CHAR(1)      NOT NULL DEFAULT 'N',
            is_home_delivery    CHAR(1)      NOT NULL DEFAULT 'N',
            is_takeaway_enabled CHAR(1)      NOT NULL DEFAULT 'N',
            is_tax_applicable   CHAR(1)      NOT NULL DEFAULT 'N',
            printer_location    VARCHAR(50),
            is_print_enabled    CHAR(1)      NOT NULL DEFAULT 'N',
            service_printer_name VARCHAR(50),
            applicable_rate     INTEGER      NOT NULL DEFAULT 1
                                 CHECK(applicable_rate IN (1, 2, 3, 4, 5)),
            is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by          INTEGER,
            updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by          INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS restaurant_table (
            id                       SERIAL PRIMARY KEY,
            code                     BIGSERIAL UNIQUE,
            table_name               VARCHAR(50)  NOT NULL,
            is_home_delivery         CHAR(1)      NOT NULL DEFAULT 'N',
            table_lock_status        VARCHAR(50),
            outlet_name              VARCHAR(50),
            is_tax_applicable        CHAR(1)      NOT NULL DEFAULT 'N',
            applicable_rate          INTEGER      NOT NULL DEFAULT 1
                                     CHECK(applicable_rate IN (1, 2, 3, 4, 5)),
            table_group_id           INTEGER      REFERENCES table_group(id),
            current_status           VARCHAR(30)  NOT NULL DEFAULT 'AVAILABLE',
            current_order_session_id INTEGER,
            occupied_since           TIMESTAMP,
            is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by               INTEGER,
            updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by               INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS bill_message (
            id           SERIAL PRIMARY KEY,
            code         BIGSERIAL UNIQUE,
            message_text VARCHAR(50)  NOT NULL,
            valid_from   TIMESTAMP,
            valid_to     TIMESTAMP,
            is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by   INTEGER,
            updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by   INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS kot_message (
            id          SERIAL PRIMARY KEY,
            code        BIGSERIAL UNIQUE,
            kot_message VARCHAR(25)  NOT NULL,
            is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by  INTEGER,
            updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by  INTEGER
        )"#,
        // ── Lodge tables ─────────────────────────────────────────────
        r#"CREATE TABLE IF NOT EXISTS discount_detail (
            id               SERIAL PRIMARY KEY,
            code             BIGSERIAL UNIQUE,
            name             VARCHAR(50)       NOT NULL,
            discount_percent DOUBLE PRECISION  NOT NULL DEFAULT 0,
            ledger_id        BIGINT,
            is_active        BOOLEAN           NOT NULL DEFAULT TRUE,
            created_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by       INTEGER,
            updated_at       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by       INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS identity_type (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50)  NOT NULL UNIQUE,
            is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS market_segment (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50)  NOT NULL UNIQUE,
            is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS plan_master (
            id           SERIAL PRIMARY KEY,
            code         BIGSERIAL UNIQUE,
            name         VARCHAR(50)    NOT NULL UNIQUE,
            tariff       NUMERIC(12,2)  NOT NULL DEFAULT 0,
            plan_details TEXT,
            is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
            created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by   INTEGER,
            updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by   INTEGER
        )"#,
        // ── Customer tables (state/city must come before customer_information FK) ──
        r#"CREATE TABLE IF NOT EXISTS state_master (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(30),
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS city_master (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(40),
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS customer_information (
            id                   SERIAL PRIMARY KEY,
            code                 BIGSERIAL UNIQUE,
            prefix               VARCHAR(10),
            customer_name        VARCHAR(50),
            address_line1        VARCHAR(100),
            address_line2        VARCHAR(100),
            address_line3        VARCHAR(100),
            mobile_no1           VARCHAR(15),
            mobile_no2           VARCHAR(15),
            email_id             VARCHAR(50),
            dob                  TIMESTAMP,
            state_id             INTEGER REFERENCES state_master(id),
            city_id              INTEGER,
            zip_code             VARCHAR(20),
            user_id              INTEGER REFERENCES users(id),
            ledger_id            BIGINT  REFERENCES market_segment(id),
            nationality          VARCHAR(10),
            pan_card             VARCHAR(50),
            passport_no          VARCHAR(50),
            passport_issue_date  TIMESTAMP,
            passport_expiry_date TIMESTAMP,
            visa_no              VARCHAR(50),
            visa_issue_date      TIMESTAMP,
            visa_expiry_date     TIMESTAMP,
            is_active            INTEGER   NOT NULL DEFAULT 1,
            created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by           INTEGER,
            updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by           INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS customer_detail (
            cust_id         INTEGER REFERENCES customer_information(id),
            document_detail BYTEA,
            file_name       TEXT,
            content_type    TEXT,
            size            NUMERIC(18,0),
            document_id     VARCHAR(50),
            user_id         INTEGER REFERENCES users(id),
            is_active       INTEGER   NOT NULL DEFAULT 1,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        // ── Account tables ───────────────────────────────────────────
        r#"CREATE TABLE IF NOT EXISTS account_categories (
            id            SERIAL PRIMARY KEY,
            code          BIGSERIAL UNIQUE,
            name          VARCHAR(100) NOT NULL UNIQUE,
            category_type VARCHAR(20),
            is_active     INTEGER   NOT NULL DEFAULT 1,
            created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by    INTEGER,
            updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by    INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS account_groups (
            id          SERIAL PRIMARY KEY,
            code        BIGSERIAL UNIQUE,
            name        VARCHAR(50) NOT NULL,
            category_id INTEGER REFERENCES account_categories(id),
            is_active   INTEGER   NOT NULL DEFAULT 1,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by  INTEGER,
            updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by  INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS tally_master (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(100),
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS general_ledger (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(100),
            prev_bal   DOUBLE PRECISION,
            prev_crdr  CHAR(1),
            close_bal  DOUBLE PRECISION,
            close_crdr CHAR(1),
            open_bal   DOUBLE PRECISION,
            open_crdr  CHAR(1),
            grp_code   INTEGER,
            sub_led    CHAR(1),
            book_flg   CHAR(1),
            sg_flg     CHAR(1),
            flag       CHAR(1),
            user_id    VARCHAR(20),
            company_sr INTEGER,
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS tax_master (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50) NOT NULL,
            tally_id   INTEGER REFERENCES tally_master(id),
            gl_id      INTEGER REFERENCES general_ledger(id),
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            UNIQUE(name)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS tax_slab (
            id             SERIAL PRIMARY KEY,
            tax_master_id  INTEGER NOT NULL REFERENCES tax_master(id) ON DELETE CASCADE,
            slab_from      DOUBLE PRECISION NOT NULL DEFAULT 0,
            slab_to        DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_active      INTEGER   NOT NULL DEFAULT 1,
            created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by     INTEGER,
            updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by     INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS employee_designation (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50) NOT NULL UNIQUE,
            salary     DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS employee_information (
            id            SERIAL PRIMARY KEY,
            code          BIGSERIAL UNIQUE,
            name          VARCHAR(50) NOT NULL,
            add1          VARCHAR(100),
            add2          VARCHAR(100),
            add3          VARCHAR(100),
            desig_id      INTEGER REFERENCES employee_designation(id),
            department    VARCHAR(50),
            esi_no        VARCHAR(50),
            pf_no         VARCHAR(50),
            doj           DATE,
            dol           DATE,
            sl_total      DOUBLE PRECISION NOT NULL DEFAULT 0,
            sl_bal        DOUBLE PRECISION NOT NULL DEFAULT 0,
            cl_total      DOUBLE PRECISION NOT NULL DEFAULT 0,
            cl_bal        DOUBLE PRECISION NOT NULL DEFAULT 0,
            spl_total     DOUBLE PRECISION NOT NULL DEFAULT 0,
            spl_bal       DOUBLE PRECISION NOT NULL DEFAULT 0,
            con_person_no VARCHAR(20),
            emer_ph_no    VARCHAR(20),
            resi_ph_no    VARCHAR(20),
            advance_tot   DOUBLE PRECISION NOT NULL DEFAULT 0,
            target        DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_active     INTEGER   NOT NULL DEFAULT 1,
            created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by    INTEGER,
            updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by    INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS day_book (
            id           SERIAL PRIMARY KEY,
            code         BIGSERIAL UNIQUE,
            name         VARCHAR(50) NOT NULL,
            group_code   INTEGER REFERENCES account_groups(id),
            gen_leg_code INTEGER REFERENCES general_ledger(id),
            is_active    INTEGER   NOT NULL DEFAULT 1,
            created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by   INTEGER,
            updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by   INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS party_bank (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(50) NOT NULL,
            location   VARCHAR(100),
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS units (
            id         SERIAL PRIMARY KEY,
            code       BIGSERIAL UNIQUE,
            name       VARCHAR(30) NOT NULL UNIQUE,
            is_active  INTEGER   NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )"#,
        // ── Company Details (singleton config, always id = 1) ─────────
        r#"CREATE TABLE IF NOT EXISTS company_details (
            id INTEGER PRIMARY KEY DEFAULT 1,
            company_name VARCHAR(150),
            company_logo BYTEA,
            logo_file_name TEXT,
            logo_name TEXT,
            address_line1 VARCHAR(255),
            address_line2 VARCHAR(50),
            address_line3 VARCHAR(50),
            phone_no1 VARCHAR(15),
            phone_no2 VARCHAR(15),
            fax_no VARCHAR(15),
            email_id VARCHAR(30),
            sms_active CHAR(1),
            xp_version_yn CHAR(1),
            sms_user_name VARCHAR(30),
            sms_password VARCHAR(30),
            sms_sender VARCHAR(30),
            receiver_email1 VARCHAR(30),
            receiver_email2 VARCHAR(30),
            licenses_no VARCHAR(50),
            licenses_date TIMESTAMP,
            registration_key VARCHAR(30),
            gst_serial_no VARCHAR(50),
            multi_user CHAR(1),
            vat_tin_no VARCHAR(30),
            service_tax_no VARCHAR(30),
            cst_no VARCHAR(30),
            luxury_tax_no VARCHAR(30),
            pan_no VARCHAR(30),
            database_name VARCHAR(15),
            dsn_name VARCHAR(50),
            database_path VARCHAR(50),
            parent CHAR(10),
            it_pan_no VARCHAR(15),
            print_option VARCHAR(10),
            gst_no VARCHAR(30),
            sac_no VARCHAR(30),
            bank_detail VARCHAR(50),
            bill_heading VARCHAR(50),
            special_message VARCHAR(100),
            check_out_12_24 CHAR(1),
            print_company_name_bill CHAR(1),
            print_address_yn CHAR(1),
            print_after_save_kot CHAR(1),
            print_bill_yn CHAR(1),
            print_no_of_person_bill CHAR(1),
            print_detail_bill CHAR(1),
            time_on_bill_yn CHAR(1),
            allow_delay CHAR(1),
            page_length_bill VARCHAR(10),
            no_of_line_kot VARCHAR(10),
            allow_sharing_yn CHAR(1),
            service_tax_per DOUBLE PRECISION,
            reprint_yn CHAR(1),
            kot_cancel CHAR(1),
            no_of_line_forward INTEGER,
            no_of_line_backward INTEGER,
            mail_active_yn CHAR(1),
            mail_id VARCHAR(30),
            mail_password VARCHAR(30),
            mail_head VARCHAR(100),
            mail_body VARCHAR(250),
            send_mail_guest_yn CHAR(1),
            send_mail_company_yn CHAR(1),
            sale_ref_no_yn CHAR(1),
            print_room_tariff_bill_yn CHAR(1),
            per_head_tariff_bill_yn CHAR(1),
            multi_room_tariff_total_pax CHAR(1),
            tax_after_discount_yn CHAR(1),
            mobile_no1 VARCHAR(15),
            mobile_no2 VARCHAR(15),
            mobile_no3 VARCHAR(15),
            total_discount_gl_code VARCHAR(20),
            extra_person INTEGER,
            check_out_time TIMESTAMP,
            checkout_yn CHAR(1),
            room_service VARCHAR(50),
            check_in_time TIMESTAMP,
            restaurant_sale VARCHAR(50),
            tally_voucher_type VARCHAR(50),
            luxury_tax_master_code INTEGER,
            bill_settlement_yn CHAR(1),
            service_tax_master_code INTEGER,
            print_sale_crystal_report_yn CHAR(1),
            call_record_filepath VARCHAR(100),
            auto_ref_no_yn CHAR(1),
            phone_call_group_id VARCHAR(15),
            detail_bill_report_yn CHAR(1),
            phone_call_item_id VARCHAR(15),
            separate_bill_no_yn CHAR(1),
            total_discount_tally_code VARCHAR(15),
            capillary_file_yn CHAR(1),
            room_service_direct_per VARCHAR(15),
            locking_system_yn CHAR(1),
            locking_authorization VARCHAR(15),
            default_ledger_id VARCHAR(15),
            default_guest_id VARCHAR(15),
            time_for_wifi VARCHAR(20),
            ip_address_for_wifi VARCHAR(30),
            port_no_for_wifi VARCHAR(30),
            user_name_for_wifi VARCHAR(30),
            password_for_wifi VARCHAR(30),
            extra_bed_group_id VARCHAR(20),
            print_gst_serial_no_yn CHAR(1),
            backup_path_name VARCHAR(5),
            separate_rest_direct_yn CHAR(1),
            service_place VARCHAR(50),
            print_company_logo_yn CHAR(1),
            company_name2 VARCHAR(150),
            name2 VARCHAR(100),
            start_date DATE,
            end_date DATE,
            fssai_no VARCHAR(50),
            print_name_address CHAR(1) DEFAULT 'N',
            receiver_email3 VARCHAR(30),
            cash_drawer_yn CHAR(1) DEFAULT 'N',
            otp_rate_change_yn CHAR(1) DEFAULT 'N',
            direct_bill_yn CHAR(1) DEFAULT 'N',
            time_format VARCHAR(2) DEFAULT '12',
            cancellation_message_yn CHAR(1) DEFAULT 'N',
            print_token_yn CHAR(1) DEFAULT 'N',
            print_bill_footer_yn CHAR(1) DEFAULT 'N',
            printer_setting VARCHAR(5) DEFAULT 'TH',
            parcel_sec_code INTEGER DEFAULT 1,
            non_chargeable INTEGER DEFAULT 0,
            partner_company_name VARCHAR(150),
            partner_address1 VARCHAR(255),
            partner_address2 VARCHAR(255),
            partner_address3 VARCHAR(255),
            partner_phone1 VARCHAR(15),
            partner_phone2 VARCHAR(15),
            partner_email VARCHAR(50),
            end_of_report VARCHAR(100),
            waiter_yn CHAR(1) DEFAULT 'Y',
            covers_yn CHAR(1) DEFAULT 'Y',
            outlet_printer_food INTEGER DEFAULT 1,
            outlet_printer_liquor INTEGER DEFAULT 0,
            max_qty INTEGER DEFAULT 0,
            modify_current_bill_yn CHAR(1) DEFAULT 'N',
            modify_settled_bill_yn CHAR(1) DEFAULT 'N',
            complementary_yn CHAR(1) DEFAULT 'N',
            bill_closed_yn CHAR(1) DEFAULT 'N',
            print_table_no_yn CHAR(1) DEFAULT 'N',
            include_tax_yn CHAR(1) DEFAULT 'Y',
            allow_lodge_posting CHAR(1) DEFAULT 'N',
            domain_name VARCHAR(50),
            pay_upi_id VARCHAR(100),
            print_receipt_no_yn CHAR(1) DEFAULT 'N',
            sale_ratewise_yn CHAR(1) DEFAULT 'N',
            sale_jv_ledger VARCHAR(100),
            jv_ledger VARCHAR(100),
            roundoff_ledger VARCHAR(100),
            barcode_yn CHAR(1) DEFAULT 'N',
            search_type INTEGER DEFAULT 1,
            online_order_yn CHAR(1) DEFAULT 'N',
            online_merchant_id VARCHAR(30),
            online_direct_bill CHAR(1) DEFAULT 'N',
            time_on_kot_yn CHAR(1) DEFAULT 'Y',
            multiple_order_yn CHAR(1) DEFAULT 'N',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            CONSTRAINT company_details_single_row CHECK (id = 1)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS menu_recipe (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            menu_id         INTEGER NOT NULL REFERENCES menu_card(id) ON DELETE CASCADE,
            ingredient_name VARCHAR(255) NOT NULL,
            quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
            unit_id         INTEGER REFERENCES units(id),
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS item_group (
            id                SERIAL PRIMARY KEY,
            code              BIGSERIAL UNIQUE,
            name              VARCHAR(50) NOT NULL UNIQUE,
            payable           INTEGER   NOT NULL DEFAULT 1,
            tally_code        INTEGER   REFERENCES tally_master(id),
            item_rate         DOUBLE PRECISION,
            units_id          INTEGER   REFERENCES units(id),
            appli_service_tax INTEGER   NOT NULL DEFAULT 0,
            res_sale_mode     INTEGER   NOT NULL DEFAULT 0,
            is_active         INTEGER   NOT NULL DEFAULT 1,
            created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by        INTEGER,
            updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by        INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS item_group_tax_detail (
            id            SERIAL PRIMARY KEY,
            item_group_id INTEGER NOT NULL REFERENCES item_group(id) ON DELETE CASCADE,
            tax_id        INTEGER NOT NULL REFERENCES tax_master(id),
            tax_percentage DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_active     INTEGER   NOT NULL DEFAULT 1,
            created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by    INTEGER,
            updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by    INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS item_name (
            id                 SERIAL PRIMARY KEY,
            code               BIGSERIAL UNIQUE,
            name               VARCHAR(50) NOT NULL,
            item_group_id      INTEGER   REFERENCES item_group(id),
            item_rate_1        DOUBLE PRECISION,
            item_rate_2        DOUBLE PRECISION,
            item_rate_3        DOUBLE PRECISION,
            kitchen_section_id INTEGER   REFERENCES kitchen_section(id),
            is_active          INTEGER   NOT NULL DEFAULT 1,
            created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by         INTEGER,
            updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by         INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS supplier_master (
            id           SERIAL PRIMARY KEY,
            code         BIGSERIAL UNIQUE,
            name         VARCHAR(50)      NOT NULL,
            address1     VARCHAR(150),
            address2     VARCHAR(150),
            mobile_no1   VARCHAR(12),
            mobile_no2   VARCHAR(12),
            email_id     VARCHAR(30),
            opening_bal  DOUBLE PRECISION NOT NULL DEFAULT 0,
            opening_crdr VARCHAR(1)       NOT NULL DEFAULT 'D',
            closing_bal  DOUBLE PRECISION NOT NULL DEFAULT 0,
            closing_crdr VARCHAR(1)       NOT NULL DEFAULT 'D',
            cust_type    VARCHAR(1)       NOT NULL,
            tally_id     INTEGER REFERENCES tally_master(id),
            market_id    INTEGER REFERENCES market_segment(id),
            gst_percent  DOUBLE PRECISION NOT NULL DEFAULT 0,
            company_sr   INTEGER,
            is_active    INTEGER   NOT NULL DEFAULT 1,
            created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by   INTEGER,
            updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by   INTEGER
        )"#,
        // ── Billing / transaction tables ──────────────────────────────
        r#"CREATE TABLE IF NOT EXISTS order_session (
            id                     SERIAL PRIMARY KEY,
            code                   BIGSERIAL UNIQUE,
            order_no               VARCHAR(30) UNIQUE,
            token_no               VARCHAR(30),
            table_id               INTEGER REFERENCES restaurant_table(id),
            table_group_id         INTEGER REFERENCES table_group(id),
            order_type             VARCHAR(20),
            customer_id            INTEGER REFERENCES customer_information(id),
            customer_name          VARCHAR(100),
            customer_mobile        VARCHAR(20),
            waiter_id              INTEGER REFERENCES employee_information(id),
            covers                 INTEGER     NOT NULL DEFAULT 1,
            session_status         VARCHAR(30) NOT NULL DEFAULT 'OPEN',
            bill_print_count       INTEGER     NOT NULL DEFAULT 0,
            opened_at              TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
            bill_printed_at        TIMESTAMP,
            settled_at             TIMESTAMP,
            total_occupancy_minutes INTEGER    NOT NULL DEFAULT 0,
            reservation_id         INTEGER,
            remarks                TEXT,
            is_active              INTEGER   NOT NULL DEFAULT 1,
            created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by             INTEGER,
            updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by             INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS order_item (
            id                   SERIAL PRIMARY KEY,
            code                 BIGSERIAL UNIQUE,
            order_session_id     INTEGER NOT NULL REFERENCES order_session(id) ON DELETE CASCADE,
            menu_id              INTEGER REFERENCES menu_card(id),
            item_name            VARCHAR(250) NOT NULL,
            quantity             NUMERIC(12,3) NOT NULL DEFAULT 1,
            rate                 NUMERIC(12,2) NOT NULL DEFAULT 0,
            gross_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            discount_percent     NUMERIC(12,2) NOT NULL DEFAULT 0,
            discount_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            tax_name             VARCHAR(100),
            tax_percentage       NUMERIC(12,4) NOT NULL DEFAULT 0,
            tax_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
            taxable_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
            final_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            food_type_id         INTEGER REFERENCES food_type(id),
            kitchen_section_id   INTEGER REFERENCES kitchen_section(id),
            kot_status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
            item_status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
            kot_id               INTEGER,
            special_instruction  TEXT,
            remarks              TEXT,
            ordered_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            cancelled_at         TIMESTAMP,
            cancelled_by         INTEGER REFERENCES users(id),
            is_active            INTEGER   NOT NULL DEFAULT 1,
            created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by           INTEGER,
            updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by           INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS order_item_modifier (
            id             SERIAL PRIMARY KEY,
            order_item_id  INTEGER NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,
            modifier_name  VARCHAR(100) NOT NULL,
            modifier_rate  NUMERIC(12,2) NOT NULL DEFAULT 0,
            is_active      INTEGER   NOT NULL DEFAULT 1,
            created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by     INTEGER,
            updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by     INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS kot_master (
            id                 SERIAL PRIMARY KEY,
            code               BIGSERIAL UNIQUE,
            kot_no             VARCHAR(30) UNIQUE,
            order_session_id   INTEGER REFERENCES order_session(id),
            table_id           INTEGER REFERENCES restaurant_table(id),
            kitchen_section_id INTEGER REFERENCES kitchen_section(id),
            waiter_id          INTEGER REFERENCES employee_information(id),
            waiter_name        VARCHAR(100),
            kot_status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            is_printed         BOOLEAN     NOT NULL DEFAULT FALSE,
            printed_at         TIMESTAMP,
            remarks            TEXT,
            created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by         INTEGER,
            updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by         INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS kot_item (
            id             SERIAL PRIMARY KEY,
            code           BIGSERIAL UNIQUE,
            kot_id         INTEGER NOT NULL REFERENCES kot_master(id) ON DELETE CASCADE,
            order_item_id  INTEGER REFERENCES order_item(id),
            quantity       NUMERIC(12,3) NOT NULL DEFAULT 1,
            item_status    VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
            is_active      INTEGER   NOT NULL DEFAULT 1,
            created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by     INTEGER,
            updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by     INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS bill_master (
            id                 SERIAL PRIMARY KEY,
            code               BIGSERIAL UNIQUE,
            bill_no            VARCHAR(30) UNIQUE,
            order_session_id   INTEGER REFERENCES order_session(id),
            table_id           INTEGER REFERENCES restaurant_table(id),
            customer_id        INTEGER REFERENCES customer_information(id),
            bill_status        VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
            food_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
            liquor_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            gross_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
            discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
            taxable_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
            tax_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            round_off          NUMERIC(12,2) NOT NULL DEFAULT 0,
            net_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            paid_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
            due_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            write_off_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
            bill_print_count   INTEGER       NOT NULL DEFAULT 0,
            printed_at         TIMESTAMP,
            settled_at         TIMESTAMP,
            remarks            TEXT,
            is_active          INTEGER   NOT NULL DEFAULT 1,
            created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by         INTEGER,
            updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by         INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS bill_item (
            id                 SERIAL PRIMARY KEY,
            code               BIGSERIAL UNIQUE,
            bill_id            INTEGER NOT NULL REFERENCES bill_master(id) ON DELETE CASCADE,
            order_item_id      INTEGER REFERENCES order_item(id),
            menu_id            INTEGER REFERENCES menu_card(id),
            item_name          VARCHAR(250) NOT NULL,
            quantity           NUMERIC(12,3) NOT NULL DEFAULT 0,
            rate               NUMERIC(12,2) NOT NULL DEFAULT 0,
            gross_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
            discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
            tax_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
            final_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
            kitchen_section_id INTEGER REFERENCES kitchen_section(id),
            is_active          INTEGER   NOT NULL DEFAULT 1,
            created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by         INTEGER,
            updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by         INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS bill_tax_detail (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            bill_id         INTEGER NOT NULL REFERENCES bill_master(id) ON DELETE CASCADE,
            tax_id          INTEGER REFERENCES tax_master(id),
            tax_name        VARCHAR(100),
            tax_percentage  NUMERIC(12,4) NOT NULL DEFAULT 0,
            taxable_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
            tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            is_active       INTEGER   NOT NULL DEFAULT 1,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS payment_master (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            bill_id         INTEGER NOT NULL REFERENCES bill_master(id),
            payment_type    VARCHAR(20)   NOT NULL,
            payment_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
            reference_no    VARCHAR(100),
            remarks         TEXT,
            is_active       INTEGER   NOT NULL DEFAULT 1,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS payment_part_detail (
            id            SERIAL PRIMARY KEY,
            code          BIGSERIAL UNIQUE,
            payment_id    INTEGER NOT NULL REFERENCES payment_master(id) ON DELETE CASCADE,
            payment_mode  VARCHAR(20)   NOT NULL,
            amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
            reference_no  VARCHAR(100),
            is_active     INTEGER   NOT NULL DEFAULT 1,
            created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by    INTEGER,
            updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by    INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS settlement_master (
            id                  SERIAL PRIMARY KEY,
            code                BIGSERIAL UNIQUE,
            bill_id             INTEGER NOT NULL REFERENCES bill_master(id),
            settlement_type     VARCHAR(20)   NOT NULL,
            settled_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            pending_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
            write_off_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
            settlement_remarks  TEXT,
            settled_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_active           INTEGER   NOT NULL DEFAULT 1,
            created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by          INTEGER,
            updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by          INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS customer_due_ledger (
            id              SERIAL PRIMARY KEY,
            code            BIGSERIAL UNIQUE,
            customer_id     INTEGER REFERENCES customer_information(id),
            bill_id         INTEGER REFERENCES bill_master(id),
            total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
            paid_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
            pending_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
            due_status      VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
            due_date        TIMESTAMP,
            remarks         TEXT,
            is_active       INTEGER   NOT NULL DEFAULT 1,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS order_status_history (
            id               SERIAL PRIMARY KEY,
            code             BIGSERIAL UNIQUE,
            order_session_id INTEGER REFERENCES order_session(id),
            status_name      VARCHAR(50) NOT NULL,
            remarks          TEXT,
            is_active        INTEGER   NOT NULL DEFAULT 1,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by       INTEGER,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by       INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS table_session_history (
            id               SERIAL PRIMARY KEY,
            code             BIGSERIAL UNIQUE,
            table_id         INTEGER REFERENCES restaurant_table(id),
            order_session_id INTEGER REFERENCES order_session(id),
            opened_at        TIMESTAMP,
            closed_at        TIMESTAMP,
            total_minutes    INTEGER NOT NULL DEFAULT 0,
            is_active        INTEGER   NOT NULL DEFAULT 1,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by       INTEGER,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by       INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS reservation_master (
            id                  SERIAL PRIMARY KEY,
            code                BIGSERIAL UNIQUE,
            reservation_no      VARCHAR(30) UNIQUE,
            table_id            INTEGER REFERENCES restaurant_table(id),
            customer_id         INTEGER REFERENCES customer_information(id),
            customer_name       VARCHAR(100),
            customer_mobile     VARCHAR(20),
            guest_count         INTEGER     NOT NULL DEFAULT 1,
            reservation_date    DATE,
            reservation_time    TIME,
            reservation_status  VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
            notes               TEXT,
            arrived_at          TIMESTAMP,
            expires_at          TIMESTAMP,
            order_session_id    INTEGER REFERENCES order_session(id),
            bill_id             INTEGER REFERENCES bill_master(id),
            is_active           INTEGER   NOT NULL DEFAULT 1,
            created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by          INTEGER,
            updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by          INTEGER
        )"#,
        r#"CREATE TABLE IF NOT EXISTS user_discount_cap (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            food_discount   NUMERIC(5,2) NOT NULL DEFAULT 100,
            liquor_discount NUMERIC(5,2) NOT NULL DEFAULT 100,
            total_discount  NUMERIC(5,2) NOT NULL DEFAULT 100,
            is_active       INTEGER   NOT NULL DEFAULT 1,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by      INTEGER,
            updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_by      INTEGER,
            UNIQUE(user_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS kot_item_void_log (
            id                SERIAL PRIMARY KEY,
            order_item_id     INTEGER NOT NULL REFERENCES order_item(id),
            order_session_id  INTEGER NOT NULL REFERENCES order_session(id),
            kot_id            INTEGER          REFERENCES kot_master(id),
            table_id          INTEGER          REFERENCES restaurant_table(id),
            user_id           INTEGER          REFERENCES users(id),
            voided_by         VARCHAR(100),
            item_name         VARCHAR(250) NOT NULL,
            quantity_voided   NUMERIC(12,3) NOT NULL,
            void_reason       TEXT NOT NULL,
            void_type         VARCHAR(20) NOT NULL DEFAULT 'REMOVE',
            previous_quantity NUMERIC(12,3),
            new_quantity      NUMERIC(12,3),
            is_active         INTEGER     NOT NULL DEFAULT 1,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by        INTEGER REFERENCES users(id),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by        INTEGER REFERENCES users(id)
        )"#,
    ];

    for stmt in stmts {
        sqlx::query(stmt)
            .execute(pool)
            .await
            .map_err(|e| format!("Schema init error: {e}"))?;
    }

    // Migrations: add columns that may not exist in older deployments
    sqlx::query(
        "ALTER TABLE reservation_master ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 120",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Migration error (duration_minutes): {e}"))?;

    sqlx::query(
        "ALTER TABLE reservation_master ADD COLUMN IF NOT EXISTS preferred_waiter_id INTEGER",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Migration error (preferred_waiter_id): {e}"))?;

    sqlx::query(
        "ALTER TABLE order_session ADD COLUMN IF NOT EXISTS reservation_id INTEGER",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Migration error (order_session.reservation_id): {e}"))?;

    seed_applications(pool).await?;
    seed_module_permissions(pool).await?;
    sync_sequences(pool).await?;

    Ok(())
}

async fn sync_sequences(pool: &PgPool) -> Result<(), String> {
    let tables: &[(&str, &str, &str)] = &[
        ("food_type",          "food_type_id_seq",          "food_type_code_seq"),
        ("menu_category",      "menu_category_id_seq",      "menu_category_code_seq"),
        ("menu_group",         "menu_group_id_seq",         "menu_group_code_seq"),
        ("menu_card",          "menu_card_id_seq",          "menu_card_code_seq"),
        ("kitchen_section",    "kitchen_section_id_seq",    "kitchen_section_code_seq"),
        ("table_group",        "table_group_id_seq",        "table_group_code_seq"),
        ("restaurant_table",   "restaurant_table_id_seq",   "restaurant_table_code_seq"),
        ("bill_message",       "bill_message_id_seq",       "bill_message_code_seq"),
        ("kot_message",        "kot_message_id_seq",        "kot_message_code_seq"),
    ];

    for (table, id_seq, code_seq) in tables {
        let sql = format!(
            "SELECT setval('{id_seq}', GREATEST((SELECT COALESCE(MAX(id), 1) FROM {table}), 1)); \
             SELECT setval('{code_seq}', GREATEST((SELECT COALESCE(MAX(code), 1) FROM {table}), 1));"
        );
        sqlx::raw_sql(&sql)
            .execute(pool)
            .await
            .map_err(|e| format!("Sequence sync failed for {table}: {e}"))?;
    }

    Ok(())
}

async fn seed_applications(pool: &PgPool) -> Result<(), String> {
    let apps: &[(i32, &str, &str)] = &[
        (1, "1", "Lodge Management System"),
        (2, "2", "Restaurant Management System"),
        (3, "3", "Material Management System"),
        (4, "4", "Account Management System"),
    ];

    for (id, code, name) in apps {
        sqlx::query(
            "INSERT INTO applications (id, code, application_name) \
             OVERRIDING SYSTEM VALUE \
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(code)
        .bind(name)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to seed application '{code}': {e}"))?;
    }

    // Advance the sequence past the manually inserted IDs
    sqlx::query("SELECT setval('applications_id_seq', (SELECT MAX(id) FROM applications))")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to advance applications sequence: {e}"))?;

    Ok(())
}

async fn seed_module_permissions(pool: &PgPool) -> Result<(), String> {
    use sqlx::Row;

    // Each entry: (permission_name, action, description)
    // permission_name format: "module:feature:action"  e.g. "menu-category:view"
    // action values: view | add | update | delete | print

    let universal: &[(&str, &str, &str)] = &[
        ("dashboard:view",       "view",   "View the main dashboard with system overview"),
        ("users:view",           "view",   "View list of all system users"),
        ("users:add",            "add",    "Add new user accounts to the system"),
        ("users:update",         "update", "Edit and update existing user accounts"),
        ("users:delete",         "delete", "Permanently delete user accounts"),
        ("users:print",          "print",  "Print user account reports"),
        ("user-access:view",     "view",   "View user roles and permission assignments"),
        ("user-access:update",   "update", "Manage and update user permission assignments"),
        ("company-details:view",   "view",   "View company details configuration"),
        ("company-details:update", "update", "Update company details configuration"),
    ];

    let restaurant: &[(&str, &str, &str)] = &[
        ("menu-category:view",   "view",   "View list of all menu categories"),
        ("menu-category:add",    "add",    "Add new menu category"),
        ("menu-category:update", "update", "Edit existing menu category details"),
        ("menu-category:delete", "delete", "Delete menu category from the system"),
        ("menu-category:print",  "print",  "Print menu category report"),
        ("food-type:view",       "view",   "View list of all food types"),
        ("food-type:add",        "add",    "Add new food type"),
        ("food-type:update",     "update", "Edit existing food type details"),
        ("food-type:delete",     "delete", "Delete food type from the system"),
        ("food-type:print",      "print",  "Print food type report"),
        ("menu-group:view",      "view",   "View list of all menu groups"),
        ("menu-group:add",       "add",    "Add new menu group"),
        ("menu-group:update",    "update", "Edit existing menu group details"),
        ("menu-group:delete",    "delete", "Delete menu group from the system"),
        ("menu-group:print",     "print",  "Print menu group report"),
        ("menu-card:view",       "view",   "View list of all menu card items"),
        ("menu-card:add",        "add",    "Add new item to the menu card"),
        ("menu-card:update",     "update", "Edit existing menu card item details"),
        ("menu-card:delete",     "delete", "Delete menu card item from the system"),
        ("menu-card:print",      "print",  "Print menu card report"),
        ("table-group:view",     "view",   "View list of all table groups"),
        ("table-group:add",      "add",    "Add new table group"),
        ("table-group:update",   "update", "Edit existing table group details"),
        ("table-group:delete",   "delete", "Delete table group from the system"),
        ("restaurant-table:view",   "view",   "View list of all restaurant tables"),
        ("restaurant-table:add",    "add",    "Add new restaurant table"),
        ("restaurant-table:update", "update", "Edit existing restaurant table details"),
        ("restaurant-table:delete", "delete", "Delete restaurant table from the system"),
        ("bill-message:view",    "view",   "View list of all bill messages"),
        ("bill-message:add",     "add",    "Add new bill message"),
        ("bill-message:update",  "update", "Edit existing bill message"),
        ("bill-message:delete",  "delete", "Delete bill message from the system"),
        ("kot-message:view",     "view",   "View list of all KOT messages"),
        ("kot-message:add",      "add",    "Add new KOT message"),
        ("kot-message:update",   "update", "Edit existing KOT message"),
        ("kot-message:delete",   "delete", "Delete KOT message from the system"),
        ("kitchen-section:view",   "view",   "View list of all kitchen sections"),
        ("kitchen-section:add",    "add",    "Add new kitchen section"),
        ("kitchen-section:update", "update", "Edit existing kitchen section"),
        ("kitchen-section:delete", "delete", "Delete kitchen section from the system"),
        // Restaurant transactions
        ("cal-incentive:view",   "view",   "View cal incentive entries"),
        ("cal-incentive:add",    "add",    "Add new cal incentive entry"),
        ("cal-incentive:update", "update", "Edit existing cal incentive entry"),
        ("cal-incentive:delete", "delete", "Delete cal incentive entry"),
        ("cal-incentive:print",  "print",  "Print cal incentive report"),
        // Billing module
        ("billing:view",         "view",   "Access the billing/order entry screen"),
        ("billing:new-order",    "add",    "Open a new order session"),
        ("billing:add-item",     "add",    "Add items to an order"),
        ("billing:cancel-item",  "update", "Cancel an ordered item"),
        ("billing:generate-kot", "update", "Generate Kitchen Order Ticket"),
        ("billing:generate-bill","print",  "Generate and print the bill"),
        ("billing:settle",       "update", "Record payment and settle a bill"),
        ("billing:cancel-order", "delete", "Cancel an entire order session"),
    ];

    let lodge: &[(&str, &str, &str)] = &[
        ("lodge-customer:view",          "view",   "View list of all customer information"),
        ("lodge-customer:add",           "add",    "Add new customer"),
        ("lodge-customer:update",        "update", "Edit existing customer details"),
        ("lodge-customer:delete",        "delete", "Delete customer from the system"),
        ("lodge-discount:view",          "view",   "View list of all lodge discount details"),
        ("lodge-discount:add",           "add",    "Add new lodge discount detail"),
        ("lodge-discount:update",        "update", "Edit existing lodge discount detail"),
        ("lodge-discount:delete",        "delete", "Delete lodge discount detail"),
        ("lodge-identity:view",          "view",   "View list of all identity types"),
        ("lodge-identity:add",           "add",    "Add new identity type"),
        ("lodge-identity:update",        "update", "Edit existing identity type"),
        ("lodge-identity:delete",        "delete", "Delete identity type"),
        ("lodge-market-segment:view",    "view",   "View list of all market segments"),
        ("lodge-market-segment:add",     "add",    "Add new market segment"),
        ("lodge-market-segment:update",  "update", "Edit existing market segment"),
        ("lodge-market-segment:delete",  "delete", "Delete market segment"),
        ("lodge-plan:view",              "view",   "View list of all lodge plans"),
        ("lodge-plan:add",               "add",    "Add new lodge plan"),
        ("lodge-plan:update",            "update", "Edit existing lodge plan"),
        ("lodge-plan:delete",            "delete", "Delete lodge plan"),
    ];

    let account: &[(&str, &str, &str)] = &[
        ("acc-day-book:view",   "view",   "View list of all day books"),
        ("acc-day-book:add",    "add",    "Add new day book"),
        ("acc-day-book:update", "update", "Edit existing day book"),
        ("acc-day-book:delete", "delete", "Delete day book"),
        ("acc-party-bank:view",   "view",   "View list of all party banks"),
        ("acc-party-bank:add",    "add",    "Add new party bank"),
        ("acc-party-bank:update", "update", "Edit existing party bank"),
        ("acc-party-bank:delete", "delete", "Delete party bank"),
        ("acc-general-ledger:view",   "view",   "View list of all general ledgers"),
        ("acc-general-ledger:add",    "add",    "Add new general ledger"),
        ("acc-general-ledger:update", "update", "Edit existing general ledger"),
        ("acc-general-ledger:delete", "delete", "Delete general ledger"),
        ("acc-account-category:view",   "view",   "View list of all account categories"),
        ("acc-account-category:add",    "add",    "Add new account category"),
        ("acc-account-category:update", "update", "Edit existing account category"),
        ("acc-account-category:delete", "delete", "Delete account category"),
        ("acc-account-group:view",   "view",   "View list of all account groups"),
        ("acc-account-group:add",    "add",    "Add new account group"),
        ("acc-account-group:update", "update", "Edit existing account group"),
        ("acc-account-group:delete", "delete", "Delete account group"),
        ("acc-tax-master:view",   "view",   "View list of all tax masters"),
        ("acc-tax-master:add",    "add",    "Add new tax master"),
        ("acc-tax-master:update", "update", "Edit existing tax master"),
        ("acc-tax-master:delete", "delete", "Delete tax master"),
        ("acc-creditor:view",     "view",   "View list of all creditors"),
        ("acc-creditor:add",      "add",    "Add new creditor"),
        ("acc-creditor:update",   "update", "Edit existing creditor"),
        ("acc-creditor:delete",   "delete", "Delete creditor"),
        ("acc-debtor:view",       "view",   "View list of all debtors"),
        ("acc-debtor:add",        "add",    "Add new debtor"),
        ("acc-debtor:update",     "update", "Edit existing debtor"),
        ("acc-debtor:delete",     "delete", "Delete debtor"),
        ("acc-tally-master:view",   "view",   "View list of all tally masters"),
        ("acc-tally-master:add",    "add",    "Add new tally master"),
        ("acc-tally-master:update", "update", "Edit existing tally master"),
        ("acc-tally-master:delete", "delete", "Delete tally master"),
    ];

    let employee: &[(&str, &str, &str)] = &[
        ("employee-designation:view",   "view",   "View list of all employee designations"),
        ("employee-designation:add",    "add",    "Add new employee designation"),
        ("employee-designation:update", "update", "Edit existing employee designation"),
        ("employee-designation:delete", "delete", "Delete employee designation"),
        ("employee-info:view",   "view",   "View list of all employees"),
        ("employee-info:add",    "add",    "Add new employee"),
        ("employee-info:update", "update", "Edit existing employee"),
        ("employee-info:delete", "delete", "Delete employee"),
    ];

    let material: &[(&str, &str, &str)] = &[
        ("mat-item-group:view",   "view",   "View list of all item groups"),
        ("mat-item-group:add",    "add",    "Add new item group"),
        ("mat-item-group:update", "update", "Edit existing item group"),
        ("mat-item-group:delete", "delete", "Delete item group"),
        ("mat-item-name:view",   "view",   "View list of all item names"),
        ("mat-item-name:add",    "add",    "Add new item name"),
        ("mat-item-name:update", "update", "Edit existing item name"),
        ("mat-item-name:delete", "delete", "Delete item name"),
    ];

    for (name, action, description) in universal.iter()
        .chain(restaurant.iter())
        .chain(lodge.iter())
        .chain(account.iter())
        .chain(employee.iter())
        .chain(material.iter())
    {
        sqlx::query(
            "INSERT INTO permissions (permission_name, action, description) \
             VALUES ($1, $2, $3) ON CONFLICT (permission_name) DO NOTHING",
        )
        .bind(*name)
        .bind(*action)
        .bind(*description)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to seed permission '{name}': {e}"))?;
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Tauri commands – DB config
// ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(serde_json::json!({
            "available": true,
            "version": update.version,
            "body": update.body
        })),
        Ok(None) => Ok(serde_json::json!({ "available": false })),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    use std::process::Command;

    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        // Download to temp file
        let data = update.download(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
        let temp_path = std::env::temp_dir().join("pos-app-update.msi");
        std::fs::write(&temp_path, &data).map_err(|e| e.to_string())?;
        // Run MSI silently
        Command::new("msiexec")
            .args(["/i", temp_path.to_str().unwrap(), "/quiet", "/norestart"])
            .spawn()
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[tauri::command]
fn get_db_config(app: tauri::AppHandle) -> Result<Option<DbConfig>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("failed to read config: {e}"))?;
    let cfg: DbConfig =
        serde_json::from_str(&raw).map_err(|e| format!("failed to parse config: {e}"))?;
    Ok(Some(cfg))
}

#[tauri::command]
async fn save_db_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    config: DbConfig,
) -> Result<String, String> {
    let path = config_path(&app)?;
    let raw =
        serde_json::to_string_pretty(&config).map_err(|e| format!("failed to serialize: {e}"))?;
    fs::write(&path, raw).map_err(|e| format!("failed to write config: {e}"))?;

    let mut guard = state.pool.lock().await;
    *guard = None;

    Ok(config.to_url())
}

#[tauri::command]
async fn clear_db_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let path = config_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("failed to remove config: {e}"))?;
    }
    let mut guard = state.pool.lock().await;
    *guard = None;
    Ok(())
}

#[tauri::command]
fn db_url_from_config(config: DbConfig) -> String {
    config.to_url()
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            pool: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Updater
            check_for_update,
            install_update,
            download_and_install_update,
            // DB config
            get_db_config,
            save_db_config,
            clear_db_config,
            db_url_from_config,
            // Auth
            get_accessible_applications,
            login,
            current_permissions,
            // Company details
            get_company_details,
            save_company_details,
            // Dashboard
            get_dashboard_stats,
            // User management
            get_users,
            create_user,
            update_user,
            toggle_user_active,
            change_user_password,
            delete_user,
            // User access / permissions
            get_all_users,
            get_all_applications,
            get_applications_for_user,
            get_all_apps_with_assignment,
            set_user_applications,
            get_user_access,
            set_user_permissions,
            // User discount caps
            get_user_discount_cap,
            save_user_discount_cap,
            // Menu categories
            get_menu_categories,
            get_all_menu_categories,
            get_menu_category_detail,
            get_all_units_for_menu_category,
            lookup_tally_for_menu_category,
            lookup_tax_for_menu_category,
            create_menu_category,
            update_menu_category,
            toggle_menu_category_active,
            delete_menu_category,
            // Food types
            get_food_types,
            get_all_food_types,
            create_food_type,
            update_food_type,
            toggle_food_type_active,
            delete_food_type,
            // Menu groups
            get_menu_groups,
            get_all_menu_groups,
            create_menu_group,
            update_menu_group,
            toggle_menu_group_active,
            delete_menu_group,
            // Menu card
            get_menu_cards,
            create_menu_card,
            update_menu_card,
            toggle_menu_card_active,
            delete_menu_card,
            // Menu card — recipe
            get_all_units_for_recipe,
            get_menu_recipes,
            save_menu_recipes,
            search_ingredient_items,
            // Kitchen sections (shared lookup)
            get_kitchen_sections,
            // Kitchen sections (master screen)
            get_kitchen_section_list,
            create_kitchen_section,
            update_kitchen_section,
            toggle_kitchen_section_active,
            delete_kitchen_section,
            // Table groups
            get_table_groups,
            get_all_table_groups,
            create_table_group,
            update_table_group,
            toggle_table_group_active,
            delete_table_group,
            // Restaurant tables
            get_restaurant_tables,
            create_restaurant_table,
            update_restaurant_table,
            toggle_restaurant_table_active,
            delete_restaurant_table,
            // Bill messages
            get_bill_messages,
            create_bill_message,
            update_bill_message,
            toggle_bill_message_active,
            delete_bill_message,
            // KOT messages
            get_kot_messages,
            create_kot_message,
            update_kot_message,
            toggle_kot_message_active,
            delete_kot_message,
            // Lodge — discount details
            get_discount_details,
            get_all_discount_details,
            create_discount_detail,
            update_discount_detail,
            toggle_discount_detail_active,
            delete_discount_detail,
            // Lodge — identity types
            get_identity_types,
            get_all_identity_types,
            create_identity_type,
            update_identity_type,
            toggle_identity_type_active,
            delete_identity_type,
            // Lodge — market segments
            get_market_segments,
            get_all_market_segments,
            create_market_segment,
            update_market_segment,
            toggle_market_segment_active,
            delete_market_segment,
            // Lodge — plan master
            get_plan_masters,
            get_all_plan_masters,
            create_plan_master,
            update_plan_master,
            toggle_plan_master_active,
            delete_plan_master,
            // Lodge — customer information
            get_customer_informations,
            create_customer_information,
            update_customer_information,
            toggle_customer_information_active,
            delete_customer_information,
            search_states,
            search_cities,
            save_customer_document,
            get_customer_documents,
            get_customer_document_data,
            delete_customer_document,
            // Account — tax master
            get_tax_masters,
            create_tax_master,
            update_tax_master,
            toggle_tax_master_active,
            delete_tax_master,
            lookup_tally_by_code,
            lookup_gl_by_code,
            get_tax_slabs,
            save_tax_slab,
            delete_tax_slab,
            // Account — creditors
            get_creditors,
            create_creditor,
            update_creditor,
            toggle_creditor_active,
            delete_creditor,
            // Account — debtors
            get_debtors,
            create_debtor,
            update_debtor,
            toggle_debtor_active,
            delete_debtor,
            // Account — tally master
            get_tally_masters,
            get_all_tally_masters,
            create_tally_master,
            update_tally_master,
            toggle_tally_master_active,
            delete_tally_master,
            // Material — item group
            get_item_groups,
            get_item_group_detail,
            get_all_tally_for_item,
            get_all_units_for_item,
            get_all_taxes_for_item,
            lookup_tally_for_item_group,
            lookup_tax_for_item_group,
            create_item_group,
            update_item_group,
            toggle_item_group_active,
            delete_item_group,
            // Material — item name
            get_item_names,
            get_all_item_groups_for_name,
            get_all_kitchen_sections_for_name,
            lookup_item_group_for_name,
            lookup_kitchen_section_for_name,
            create_item_name,
            update_item_name,
            toggle_item_name_active,
            delete_item_name,
            // Account — day book
            get_day_books,
            get_all_groups_for_daybook,
            get_all_ledgers_for_daybook,
            create_day_book,
            update_day_book,
            toggle_day_book_active,
            delete_day_book,
            // Account — party bank
            get_party_banks,
            create_party_bank,
            update_party_bank,
            toggle_party_bank_active,
            delete_party_bank,
            // Account — general ledger
            get_general_ledgers,
            get_all_account_groups,
            create_general_ledger,
            update_general_ledger,
            toggle_general_ledger_active,
            delete_general_ledger,
            // Account — account categories
            get_account_categories,
            create_account_category,
            update_account_category,
            toggle_account_category_active,
            delete_account_category,
            // Account — account groups
            get_account_groups,
            get_all_account_categories,
            create_account_group,
            update_account_group,
            toggle_account_group_active,
            delete_account_group,
            // Employee — designation
            get_designations,
            get_all_designations,
            create_designation,
            update_designation,
            toggle_designation_active,
            delete_designation,
            // Employee — information
            get_employees,
            create_employee,
            update_employee,
            toggle_employee_active,
            delete_employee,
            // Restaurant transactions — cal incentive
            get_cal_incentives,
            get_menu_cards_simple,
            create_cal_incentive,
            update_cal_incentive,
            toggle_cal_incentive_active,
            delete_cal_incentive,
            // Billing — lookup data
            get_tables_for_billing,
            get_menu_for_billing,
            get_active_sessions,
            get_floor_view,
            get_restaurant_dashboard,
            // Billing — session lifecycle
            open_order_session,
            get_order_session,
            get_session_detail,
            update_session_info,
            cancel_order_session,
            // Billing — order items
            get_order_items,
            add_order_item,
            update_order_item_qty,
            cancel_order_item,
            cancel_order_item_with_reason,
            // Billing — KOT
            generate_kot,
            get_kot_list,
            // Billing — table shift / item transfer
            shift_table_full,
            transfer_order_items,
            transfer_order_items_with_qty,
            // Billing — bill & payment
            get_bill_summary,
            generate_bill,
            settle_bill,
            get_payment_methods,
            // Billing — reservations
            get_reservations,
            get_reservation_by_id,
            create_reservation,
            update_reservation,
            update_reservation_status,
            cancel_reservation,
            expire_no_show_reservations,
            get_employees_for_billing,
            // Bill reprint
            search_settled_bills,
            get_bill_for_reprint,
            // Customer / waiter party
            search_customers,
            quick_create_customer,
            update_session_party,
            get_customer_due_by_mobile,
            // KOT messages / item modifiers
            search_kot_messages,
            add_order_item_modifier,
            clear_order_item_modifiers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
