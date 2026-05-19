-- ================================================================
-- POS App - PostgreSQL Schema
-- Run this once on your PostgreSQL database before first launch.
-- The Tauri backend will also auto-run CREATE TABLE IF NOT EXISTS
-- statements on first connection.
-- ================================================================


CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    user_name     VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    last_login    TIMESTAMPTZ,
    is_active     INTEGER      NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by    INTEGER      REFERENCES users(id),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by    INTEGER      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS applications (
    id               SERIAL PRIMARY KEY,
    code             VARCHAR(50)  UNIQUE NOT NULL,
    application_name VARCHAR(100) NOT NULL,
    is_active        INTEGER      NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       INTEGER      REFERENCES users(id),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by       INTEGER      REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_applications (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by     INTEGER REFERENCES users(id),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     INTEGER REFERENCES users(id),
    UNIQUE(user_id, application_id)
);

CREATE TABLE IF NOT EXISTS permissions (
    id              SERIAL PRIMARY KEY,
    application_id  INTEGER      NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    permission_name VARCHAR(200) NOT NULL,
    action          VARCHAR(50)  NOT NULL, -- view, create, update, delete, print
    description     TEXT,
    is_active       INTEGER      NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by      INTEGER      REFERENCES users(id),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by      INTEGER      REFERENCES users(id),
    UNIQUE(application_id, permission_code)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    INTEGER REFERENCES users(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    INTEGER REFERENCES users(id),
    UNIQUE(user_id, permission_id)
);


-- for resturant master/menus
CREATE TABLE menu_category (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    category_type CHAR(1),
    name VARCHAR(30) NOT NULL UNIQUE,
    tally_code INTEGER REFERENCES tally_master(id),
    allow_discount BOOLEAN DEFAULT FALSE,
    max_discount_percent NUMERIC(5,2) DEFAULT 0,
    auto_discount_percent NUMERIC(5,2) DEFAULT 0,
    unit_id INTEGER REFERENCES units(id),

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE menu_group (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_payable BOOLEAN DEFAULT TRUE,
    tally_id BIGINT REFERENCES tally_master(id),
    item_rate NUMERIC(12,2) DEFAULT 0,
    category_id INTEGER REFERENCES menu_category(id),
    applicable_service_tax BOOLEAN DEFAULT FALSE,
    restaurant_sale_mode CHAR(1),

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE menu_category_tax_detail (
    id INTEGER PRIMARY KEY,
    category_id INTEGER REFERENCES menu_category(id),
    tax_id INTEGER REFERENCES tax_master(id),
    tax_percentage NUMERIC(10,4) DEFAULT 0,

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE MenuCard (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    item_barcode VARCHAR(100) UNIQUE,
    name VARCHAR(250) NOT NULL,
    menu_alias VARCHAR(250),
    menu_group_id BIGINT REFERENCES menu_group(id),
    kitchen_section_id INTEGER REFERENCES kitchen_section(id),
    liquor_group_id INTEGER REFERENCES liquor_group(id),
    food_type_id INTEGER REFERENCES food_type(id),
    rate_1 NUMERIC(12,2) DEFAULT 0,
    rate_2 NUMERIC(12,2) DEFAULT 0,
    rate_3 NUMERIC(12,2) DEFAULT 0,
    rate_4 NUMERIC(12,2) DEFAULT 0,
    rate_5 NUMERIC(12,2) DEFAULT 0,
    consume_quantity NUMERIC(12,2) DEFAULT 0,
    excise_rate NUMERIC(12,2) DEFAULT 0,
    comments TEXT,

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE food_type (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,

   -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- for resturant master/table
CREATE TABLE table_group (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50), 
    allow_incentive CHAR(1),
    is_home_delivery CHAR(1),
    is_takeaway_enabled CHAR(1),
    is_tax_applicable CHAR(1),
    printer_location VARCHAR(50),
    is_print_enabled CHAR(1),
    service_printer_name VARCHAR(50),

    -- The column to link to MenuCard.rate_1, rate_2, or rate_3,rate_4,rate_5
    applicable_rate INTEGER DEFAULT 1 CHECK(applicable_rate IN (1, 2, 3, 4, 5)),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE restaurant_table (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    table_name VARCHAR(50),
    is_home_delivery CHAR(1),
    table_lock_status VARCHAR(50),
    outlet_name VARCHAR(50),
    is_tax_applicable CHAR(1) REFERENCES table_group(is_tax_applicable) ,

    -- The column to link to MenuCard.rate_1, rate_2, or rate_3,rate_4,rate_5
    applicable_rate INTEGER DEFAULT 1 CHECK(applicable_rate IN (1, 2, 3, 4, 5)),

    table_group_id INTEGER REFERENCES table_group(id),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE kitchen_section (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_print_enabled BOOLEAN DEFAULT TRUE,
    printer_name VARCHAR(50),
    printer_type VARCHAR(20),

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);


-- for resturant master/meassage 
CREATE TABLE bill_message (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    message_text VARCHAR(50),
    valid_from TIMESTAMP,
    valid_to TIMESTAMP,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE kot_message (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    kot_message VARCHAR(25),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);


--- lodge application 

CREATE TABLE discount_detail (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL,
    discount_percent DOUBLE PRECISION DEFAULT 0,
    ledger_id BIGINT REFERENCES general_ledger(code),

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE identity_type (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE market_segment (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE plan_master (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    tariff NUMERIC(12,2) DEFAULT 0,
    plan_details TEXT,

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE state_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(30),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE city_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(40),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE customer_information (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    prefix VARCHAR(10),
    customer_name VARCHAR(50),
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    address_line3 VARCHAR(100),
    mobile_no1 VARCHAR(15),
    mobile_no2 VARCHAR(15),
    email_id VARCHAR(50),
    dob TIMESTAMP,
    state_id INTEGER REFERENCES state_master(id),
    city_id INTEGER,
    zip_code VARCHAR(20),
    user_id INTEGER REFERENCES users(id),

    ledger_id BIGINT REFERENCES market_segment(id),
    nationality VARCHAR(10),
    pan_card VARCHAR(50),
    passport_no VARCHAR(50),
    passport_issue_date TIMESTAMP,
    passport_expiry_date TIMESTAMP,
    visa_no VARCHAR(50),
    visa_issue_date TIMESTAMP,
    visa_expiry_date TIMESTAMP,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE customer_detail (
    cust_id INTEGER REFERENCES customer_information(id),
    document_detail BYTEA,
    file_name TEXT,
    content_type TEXT,
    size NUMERIC(18,0),
    document_id VARCHAR(50),
    user_id INTEGER REFERENCES users(id),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);


-- account application 


CREATE TABLE tax_master (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    name VARCHAR(50),
    tax_amount DOUBLE PRECISION,
    tally_code INTEGER REFERENCES tally_master(id),
    gl_code INTEGER REFERENCES general_ledger(id),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE tax_slab (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    from_range DOUBLE PRECISION,
    to_range DOUBLE PRECISION,
    tax_percentage DOUBLE PRECISION,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE Tally_Master (
    id INTEGER PRIMARY KEY,
    Code  BIGSERIAL UNIQUE,
    Name  VARCHAR(100),

-- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);

CREATE TABLE account_categories (
    id INTEGER PRIMARY KEY,
    Code  BIGSERIAL UNIQUE,
    Name  VARCHAR(100) UNIQUE,
    category_type VARCHAR(20), -- e.g., "Asset", "Liability", "Equity", "Income", "Expense"
   
   -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);

CREATE TABLE account_groups(
    id INTEGER PRIMARY KEY,
    Code  BIGSERIAL UNIQUE,
    name VARCHAR(50) NOT NULL,
    group_type VARCHAR(20), 
    category_id       INTEGER REFERENCES account_categories(id),
    category_name     VARCHAR(70)  REFERENCES account_categories(name), 

-- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE general_Ledger (
    id INTEGER PRIMARY KEY,
    code   BIGSERIAL UNIQUE,
    name  VARCHAR(100),
    prev_bal       DOUBLE PRECISION,
    prev_crdr      CHAR(1),
    close_bal      DOUBLE PRECISION,
    close_crdr     CHAR(1),
    open_bal       DOUBLE PRECISION,
    open_crdr      CHAR(1),
    grp_code       INTEGER REFERENCES account_groups(id),
    sub_led        CHAR(1),
    book_flg       CHAR(1),
    sg_flg         CHAR(1),
    flag           CHAR(1),
    user_id        VARCHAR(20),
    company_sr     INTEGER,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);

CREATE TABLE Supplier_Master (
    id INTEGER PRIMARY KEY,
    code   BIGSERIAL UNIQUE,                    -- Party Code
    name NVARCHAR(50),              -- Party Name
    addresss1     NVARCHAR(150),                 -- Address Line 1
    address2      NVARCHAR(150),                -- Address Line 2
    mobile_no1     NVARCHAR(12),                 -- Contact 1
    mobile_no2     NVARCHAR(12),                 -- Contact 2
    opening_bal    FLOAT,                        -- Opening Balance
    opening_crdr   NVARCHAR(3),                  -- Opening Cr/Dr (C=Credit, D=Debtor)
    closing_bal    FLOAT,                        -- Closing Balance
    closing_crdr   NVARCHAR(3),                  -- Closing Cr/Dr
    cust_type      NVARCHAR(3),                  -- Type: 'C'=Creditor, 'D'=Debtor
    email_id       NVARCHAR(30),
    tally_id       INT REFERENCES tally_Master(id),      -- Legacy Reference
    market_code    INT REFERENCES market_Master(id),     -- Market/Customer Segment
    comp_GST       NVARCHAR(30),                 -- GST ID
    Company_SrNo   INT                           -- Company Reference

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE employee_Designation (
    id INTEGER PRIMARY KEY,
    code   BIGSERIAL UNIQUE,                 -- Designation Code
    name  NVARCHAR(50),              -- Designation Name (e.g., CAPTAINS, SR.MANAGER, WAITER)
    salary      FLOAT,                     -- Basic Salary for this designation

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE employee_Information (
    id INTEGER PRIMARY KEY,
    emp_no        INT PRIMARY KEY,                  -- Employee Number
    name      NVARCHAR(50),                     -- Employee Name
    add1          NVARCHAR(100),                    -- Address Line 1
    add2          NVARCHAR(100),                    -- Address Line 2
    add3          NVARCHAR(100),                    -- Address Line 3
    desig_id      INTEGER REFERENCES employee_Designation(id), -- JOINS to Designation Master
    department   NVARCHAR(50),                     -- Department (e.g., F&B, Kitchen)
    esi_no       NVARCHAR(50),                     -- ESI Number (Employee State Insurance)
    pf_no        NVARCHAR(50),                     -- PF Number (Provident Fund)
    doj          SMALLDATETIME,                    -- Date of Joining
    dol          SMALLDATETIME,                    -- Date of Leaving
    SL_Total     FLOAT,                            -- Sick Leave Total
    SL_Bal       FLOAT,                            -- Sick Leave Balance
    CL_Total     FLOAT,                            -- Casual Leave Total
    CL_Bal       FLOAT,                            -- Casual Leave Balance
    SPL_Total    FLOAT,                            -- Special Leave Total
    SPL_Bal      FLOAT,                            -- Special Leave Balance
    Con_PersonNo NVARCHAR(20),                     -- Contact Person Number
    EmerPh_No    NVARCHAR(20),                     -- Emergency Phone Number
    ResiPh_No    NVARCHAR(20),                     -- Residential Phone Number
    Advance_Tot  FLOAT,                            -- Total Advance Taken
    Target       FLOAT,                            -- Sales Target

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE day_book (
    id INTEGER PRIMARY KEY,
    code   BIGSERIAL UNIQUE,        -- Day Book Code (unique identifier)
    name NVARCHAR(50),              -- Day Book Name/Description
    group_code       BIGINT REFERENCES account_groups (id),                 -- FOREIGN KEY → account_groups.id
    gen_leg_code     BIGINT REFERENCES general_Ledger(id),                  -- FOREIGN KEY → generalLedger.id

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);
CREATE TABLE PartyBank (
    id INTEGER PRIMARY KEY,
    code  BIGSERIAL UNIQUE,              -- Bank Code
    name  NVARCHAR(50),                  -- Bank Name/Description
    location NVARCHAR(100),                -- Bank Location/Branch

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);


--material application 

CREATE TABLE item_Group (
    id INTEGER PRIMARY KEY,
    code  BIGSERIAL UNIQUE,                                   -- Item Code 
    name        NVARCHAR (50),                               -- Item Name
    payable            INT,                            -- Payable store in 1/0
    tally_code        NUMERIC (18) REFERENCES tally_Master(id),  -- Tally Integration Code
    item_rate         NUMERIC(10,4),                  -- Item Rate
    units_id          INT  REFERENCES units(id),            -- units (FK → units table)
    appli_service_tax INT ,                      -- Apply Service Tax store in 1/0
    res_sale_mode     INT,                      -- Restaurant Sale Mode chekbox store in 1/0
    
    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)

);

CREATE TABLE item_Group_tax_detail (
    id INTEGER PRIMARY KEY,
    code  BIGSERIAL UNIQUE,
    item_group_id INTEGER REFERENCES item_Group(id),
    tax_id INTEGER REFERENCES tax_master(id),
    tax_percentage NUMERIC(10,4) DEFAULT 0,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE item_name (
    id INTEGER PRIMARY KEY,
    code  BIGSERIAL UNIQUE,
    item_group_id INTEGER REFERENCES item_Group(id),
    name        NVARCHAR (50),    -- Item Name
    item_rate_1  NUMERIC(10,4),
    item_rate_2  NUMERIC(10,4),
    item_rate_3  NUMERIC(10,4),
    kitchen_section_id INT REFERENCES kitchen_section(id),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE units (
    id         SERIAL PRIMARY KEY,
    code       BIGSERIAL UNIQUE,
    name       VARCHAR(30) NOT NULL UNIQUE,
    
    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);