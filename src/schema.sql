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

CREATE TABLE IF NOT EXISTS company_details (
    id INTEGER PRIMARY KEY DEFAULT 1,
    -- Original columns (preserved)
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
    -- Additional columns
    company_name2           VARCHAR(150),
    name2                   VARCHAR(100),
    start_date              DATE,
    end_date                DATE,
    fssai_no                VARCHAR(50),
    print_name_address      CHAR(1) DEFAULT 'N',
    receiver_email3         VARCHAR(30),
    cash_drawer_yn          CHAR(1) DEFAULT 'N',
    otp_rate_change_yn      CHAR(1) DEFAULT 'N',
    direct_bill_yn          CHAR(1) DEFAULT 'N',
    time_format             VARCHAR(2) DEFAULT '12',
    cancellation_message_yn CHAR(1) DEFAULT 'N',
    print_token_yn          CHAR(1) DEFAULT 'N',
    print_bill_footer_yn    CHAR(1) DEFAULT 'N',
    printer_setting         VARCHAR(5) DEFAULT 'TH',
    parcel_sec_code         INTEGER DEFAULT 1,
    non_chargeable          INTEGER DEFAULT 0,
    partner_company_name    VARCHAR(150),
    partner_address1        VARCHAR(255),
    partner_address2        VARCHAR(255),
    partner_address3        VARCHAR(255),
    partner_phone1          VARCHAR(15),
    partner_phone2          VARCHAR(15),
    partner_email           VARCHAR(50),
    end_of_report           VARCHAR(100),
    waiter_yn               CHAR(1) DEFAULT 'Y',
    covers_yn               CHAR(1) DEFAULT 'Y',
    outlet_printer_food     INTEGER DEFAULT 1,
    outlet_printer_liquor   INTEGER DEFAULT 0,
    max_qty                 INTEGER DEFAULT 0,
    modify_current_bill_yn  CHAR(1) DEFAULT 'N',
    modify_settled_bill_yn  CHAR(1) DEFAULT 'N',
    complementary_yn        CHAR(1) DEFAULT 'N',
    bill_closed_yn          CHAR(1) DEFAULT 'N',
    print_table_no_yn       CHAR(1) DEFAULT 'N',
    include_tax_yn          CHAR(1) DEFAULT 'Y',
    allow_lodge_posting     CHAR(1) DEFAULT 'N',
    domain_name             VARCHAR(50),
    pay_upi_id              VARCHAR(100),
    print_receipt_no_yn     CHAR(1) DEFAULT 'N',
    sale_ratewise_yn        CHAR(1) DEFAULT 'N',
    sale_jv_ledger          VARCHAR(100),
    jv_ledger               VARCHAR(100),
    roundoff_ledger         VARCHAR(100),
    barcode_yn              CHAR(1) DEFAULT 'N',
    search_type             INTEGER DEFAULT 1,
    online_order_yn         CHAR(1) DEFAULT 'N',
    online_merchant_id      VARCHAR(30),
    online_direct_bill      CHAR(1) DEFAULT 'N',
    time_on_kot_yn          CHAR(1) DEFAULT 'Y',
    multiple_order_yn       CHAR(1) DEFAULT 'N',
    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    CONSTRAINT company_details_single_row CHECK (id = 1)
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
    code BIGSERIAL UNIQUE,                           -- Unique group identifier
    name VARCHAR(50) NOT NULL UNIQUE,                 -- Group name (e.g., 'BEERS')
    category_id INTEGER REFERENCES menu_category(id),     -- FK to tbMenuCategory.Category_Code
    MultipleRecipe  CHAR(1)                       -- Allow multiple recipes (Y/N)
    As_Per_Size     CHAR(1)                       -- Size-based pricing (Y/N)
    MenuGrpImage    IMAGE                         -- Binary image data for group

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

CREATE TABLE menu_recipe (
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    menu_id BIGINT NOT NULL REFERENCES MenuCard(id) ON DELETE CASCADE,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,

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
    current_status VARCHAR(30) DEFAULT 'AVAILABLE',
    current_order_session_id INTEGER ,
    occupied_since TIMESTAMP;

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

-- for resturant transactions
CREATE TABLE CalInsentive(
    id INTEGER PRIMARY KEY,
    code BIGSERIAL UNIQUE,
	MenuCard_ID INT REFERENCES MenuCard(id),
	Sunday_Inc decimal(10, 4),
	Monday_Inc decimal(10, 4),
	Tuesday_Inc decimal(10, 4),
	Wednesday_Inc decimal(10, 4),
	Thursday_Inc decimal(10, 4),
	Friday_Inc decimal(10, 4),
	Saturday_Inc decimal(10, 4),

    -- Standard Audit & Status Columns
    is_active BOOLEAN DEFAULT TRUE,
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


-- billing screen tables 
-- ORDER SESSION MASTER
-- Tracks active table/order session


CREATE TABLE order_session (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,         -- Unique internal code
    order_no VARCHAR(30) UNIQUE,   -- Visible order number
    token_no VARCHAR(30),          -- Token number for pickup/delivery
    table_id INTEGER REFERENCES restaurant_table(id),  -- Linked restaurant table
    table_group_id INTEGER REFERENCES table_group(id), -- Table group snapshot
    order_type VARCHAR(20),  -- DINE_IN / DELIVERY / PICKUP
    customer_id INTEGER REFERENCES customer_information(id), -- Linked customer
    customer_name VARCHAR(100), -- Customer snapshot
    customer_mobile VARCHAR(20),
    waiter_id INTEGER REFERENCES employee_information(id), -- Assigned waiter
    covers INTEGER DEFAULT 1,     -- Number of guests
    session_status VARCHAR(30) DEFAULT 'OPEN', -- OPEN / KOT_SENT / BILL_PRINTED / SETTLED
    bill_print_count INTEGER DEFAULT 0, -- Number of times bill printed
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Session timings
    bill_printed_at TIMESTAMP,
    settled_at TIMESTAMP,
    total_occupancy_minutes INTEGER DEFAULT 0,  -- Occupancy calculation
    remarks TEXT,                               -- General remarks

    -- Standard Audit Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- ORDER ITEMS
-- Stores all live order items for a session

CREATE TABLE order_item (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    order_session_id INTEGER REFERENCES order_session(id) ON DELETE CASCADE, -- Linked order session
    menu_id INTEGER REFERENCES MenuCard(id), -- Linked menu item
    item_name VARCHAR(250), -- Item snapshot
    quantity NUMERIC(12,3) DEFAULT 1, -- Quantity
    rate NUMERIC(12,2) DEFAULT 0, -- Item rate snapshot
    gross_amount NUMERIC(12,2) DEFAULT 0, -- Gross amount before tax/discount
    discount_percent NUMERIC(12,2) DEFAULT 0, -- Discount snapshot
    discount_amount NUMERIC(12,2) DEFAULT 0,
    tax_name VARCHAR(100), -- Tax snapshot
    tax_percentage NUMERIC(12,4),
    tax_amount NUMERIC(12,2) DEFAULT 0,
    taxable_amount NUMERIC(12,2) DEFAULT 0, -- Final taxable amount
    final_amount NUMERIC(12,2) DEFAULT 0, -- Final line amount
    food_type_id INTEGER REFERENCES food_type(id), -- Food type reference
    kitchen_section_id INTEGER REFERENCES kitchen_section(id), -- Kitchen routing
    kot_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING / SENT / PREPARING / READY / SERVED
    item_status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / CANCELLED / VOID
    kot_id INTEGER, -- Last KOT reference
    special_instruction TEXT reference kot_massege (id), --Kitchen instruction
    remarks TEXT, -- General remarks

    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Item ordered time
    cancelled_at TIMESTAMP,  -- Cancellation tracking
    cancelled_by INTEGER REFERENCES users(id),

    -- Standard Audit Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- ITEM MODIFIERS
-- Extra customization for order items

CREATE TABLE order_item_modifier (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES order_item(id) ON DELETE CASCADE, -- Linked order item
    modifier_name VARCHAR(100), -- Modifier name
    modifier_rate NUMERIC(12,2) DEFAULT 0, -- Extra modifier charge

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- KOT MASTER
-- Kitchen Order Ticket Header

CREATE TABLE kot_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    kot_no VARCHAR(30) UNIQUE,  -- Visible KOT number
    order_session_id INTEGER REFERENCES order_session(id), -- Linked order session
    table_id INTEGER REFERENCES restaurant_table(id), -- Linked order session
    kitchen_section_id INTEGER REFERENCES kitchen_section(id), -- Kitchen section
    waiter_id INTEGER REFERENCES employee_information(id), -- Waiter snapshot
    waiter_name VARCHAR(100),
    kot_status VARCHAR(20) DEFAULT 'PENDING', -- KOT STATUS
    is_printed BOOLEAN DEFAULT FALSE, -- Print tracking
    printed_at TIMESTAMP,
    remarks TEXT,

    -- Standard Audit Columns
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- KOT ITEMS
-- Items included in KOT


CREATE TABLE kot_item (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    kot_id INTEGER REFERENCES kot_master(id) ON DELETE CASCADE, -- Linked KOT
    order_item_id INTEGER REFERENCES order_item(id),  -- Linked order item
    quantity NUMERIC(12,3), -- Item quantity snapshot
    item_status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / CANCELLED

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- BILL MASTER
-- Final customer bill


CREATE TABLE bill_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    bill_no VARCHAR(30) UNIQUE, -- Visible bill number
    order_session_id INTEGER REFERENCES order_session(id), -- Linked order session
    table_id INTEGER REFERENCES restaurant_table(id), -- Table reference
    customer_id INTEGER REFERENCES customer_information(id),  -- Customer reference
    bill_status VARCHAR(20) DEFAULT 'DRAFT',  -- DRAFT / PRINTED / PAID / DUE
    food_amount NUMERIC(12,2) DEFAULT 0,  -- Food total
    liquor_amount NUMERIC(12,2) DEFAULT 0, -- Liquor total
    gross_amount NUMERIC(12,2) DEFAULT 0, -- Gross bill amount
    discount_amount NUMERIC(12,2) DEFAULT 0, -- Discount total
    taxable_amount NUMERIC(12,2) DEFAULT 0, -- Taxable amount
    tax_amount NUMERIC(12,2) DEFAULT 0, -- Total tax amount
    round_off NUMERIC(12,2) DEFAULT 0, -- Rounding adjustment
    net_amount NUMERIC(12,2) DEFAULT 0, -- Final payable amount
    paid_amount NUMERIC(12,2) DEFAULT 0, -- Paid amount
    due_amount NUMERIC(12,2) DEFAULT 0,  -- Remaining due
    write_off_amount NUMERIC(12,2) DEFAULT 0,  -- Write off amount
    printed_at TIMESTAMP,  -- Print timestamp
    settled_at TIMESTAMP, -- Settlement timestamp
    remarks TEXT,

    -- Standard Audit Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- BILL ITEMS
-- Permanent bill item snapshot


CREATE TABLE bill_item (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    bill_id INTEGER REFERENCES bill_master(id) ON DELETE CASCADE, -- Linked bill
    order_item_id INTEGER REFERENCES order_item(id), -- Original order item
    menu_id INTEGER REFERENCES MenuCard(id), -- Menu item
    item_name VARCHAR(250), -- Item snapshot
    quantity NUMERIC(12,3),
    rate NUMERIC(12,2),
    gross_amount NUMERIC(12,2),
    discount_amount NUMERIC(12,2),
    tax_amount NUMERIC(12,2),
    final_amount NUMERIC(12,2),
    kitchen_section_id INTEGER REFERENCES kitchen_section(id),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- BILL TAX DETAILS
-- Tax breakup for bill

CREATE TABLE bill_tax_detail (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    bill_id INTEGER REFERENCES bill_master(id) ON DELETE CASCADE, -- Linked bill
    tax_id INTEGER REFERENCES tax_master(id), -- Tax reference
    tax_name VARCHAR(100),  -- Tax snapshot
    tax_percentage NUMERIC(12,4),
    taxable_amount NUMERIC(12,2),
    tax_amount NUMERIC(12,2),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- PAYMENT MASTER
-- Main payment entry
CREATE TABLE payment_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    bill_id INTEGER REFERENCES bill_master(id),  -- Linked bill
    payment_type VARCHAR(20),  -- CASH / CARD / UPI / DUE / Part 
    payment_amount NUMERIC(12,2), -- Main payment amount
    reference_no VARCHAR(100), -- UPI/Card reference

    remarks TEXT,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- PAYMENT PART DETAILS
-- Part payment modes


CREATE TABLE payment_Part_detail (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    payment_id INTEGER REFERENCES payment_master(id) ON DELETE CASCADE, -- Linked payment
    payment_mode VARCHAR(20),  -- CASH / UPI / CARD
    amount NUMERIC(12,2),
    reference_no VARCHAR(100),

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- SETTLEMENT MASTER
-- Final bill settlement

CREATE TABLE settlement_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    bill_id INTEGER REFERENCES bill_master(id), -- Linked bill
    settlement_type VARCHAR(20), -- FULL / PARTIAL / DUE / WRITE_OFF
    settled_amount NUMERIC(12,2),  -- Actual settled amount
    pending_amount NUMERIC(12,2), -- Pending due
    write_off_amount NUMERIC(12,2), -- Write off
    settlement_remarks TEXT,
    settled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

   -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- CUSTOMER DUE LEDGER
-- Tracks pending customer dues

CREATE TABLE customer_due_ledger (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,  
    customer_id INTEGER REFERENCES customer_information(id), -- Customer reference
    bill_id INTEGER REFERENCES bill_master(id),    -- Bill reference
    total_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2),
    pending_amount NUMERIC(12,2),  
    due_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING / CLEARED
    due_date TIMESTAMP,
    remarks TEXT,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- ORDER STATUS HISTORY
-- Audit trail for order actions


CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,  
    order_session_id INTEGER REFERENCES order_session(id), -- Linked order session 
    status_name VARCHAR(50), --ITEM_ADDED, KOT_GENERATED, BILL_PRINTED, PAYMENT_DONE, ORDER_CANCELLED
    remarks TEXT,

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- TABLE SESSION HISTORY
-- Tracks table occupancy analytics

CREATE TABLE table_session_history (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    table_id INTEGER REFERENCES restaurant_table(id),   -- Table reference
    order_session_id INTEGER REFERENCES order_session(id), -- Order session reference
    opened_at TIMESTAMP,
    closed_at TIMESTAMP,
    total_minutes INTEGER,  -- Total occupied minutes

    -- Standard Audit & Status Columns
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- USER DISCOUNT CAPS
-- Per-user maximum discount percentages enforced at billing

CREATE TABLE IF NOT EXISTS user_discount_cap (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_discount    NUMERIC(5,2) NOT NULL DEFAULT 100,
    liquor_discount  NUMERIC(5,2) NOT NULL DEFAULT 100,
    total_discount   NUMERIC(5,2) NOT NULL DEFAULT 100,

    -- Standard Audit & Status Columns
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    UNIQUE(user_id)
);

-- KOT ITEM VOID LOG
-- Audit trail for every item removed after KOT has been sent

CREATE TABLE IF NOT EXISTS kot_item_void_log (
    id                  SERIAL PRIMARY KEY,
    order_item_id       INTEGER NOT NULL REFERENCES order_item(id),
    order_session_id    INTEGER NOT NULL REFERENCES order_session(id),
    kot_id              INTEGER          REFERENCES kot_master(id),
    table_id            INTEGER          REFERENCES restaurant_table(id),
    user_id             INTEGER REFERENCES users(id),
    voided_by           VARCHAR(100),                    -- username snapshot (works for superadmin too)
    item_name           VARCHAR(250) NOT NULL,          -- snapshot at void time
    quantity_voided     NUMERIC(12,3) NOT NULL,          -- how many units were removed
    void_reason         TEXT NOT NULL,                   -- mandatory reason entered by user
    void_type           VARCHAR(20) NOT NULL DEFAULT 'REMOVE', -- REMOVE (full) | QTY_REDUCE
    previous_quantity   NUMERIC(12,3),                   -- qty before the action
    new_quantity        NUMERIC(12,3),                   -- qty after (0 = fully removed)

    -- Standard Audit & Status Columns
    is_active           INTEGER     NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          INTEGER REFERENCES users(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_void_log_session  ON kot_item_void_log(order_session_id);
CREATE INDEX IF NOT EXISTS idx_void_log_kot      ON kot_item_void_log(kot_id);
CREATE INDEX IF NOT EXISTS idx_void_log_user     ON kot_item_void_log(user_id);

-- TABLE RESERVATION MASTER
-- Handles future dining reservations

CREATE TABLE reservation_master (
    id SERIAL PRIMARY KEY,
    code BIGSERIAL UNIQUE,
    reservation_no VARCHAR(30) UNIQUE, -- Visible reservation number
    table_id INTEGER REFERENCES restaurant_table(id), -- Reserved table
    customer_id INTEGER REFERENCES customer_information(id), -- Customer reference

    customer_name VARCHAR(100), -- Customer snapshot
    customer_mobile VARCHAR(20),

    guest_count INTEGER DEFAULT 1, -- Number of guests

    reservation_date DATE, -- Reservation date/time
    reservation_time TIME,

    reservation_status VARCHAR(20) DEFAULT 'RESERVED', -- Reservation status (RESERVED / ARRIVED / COMPLETED / CANCELLED / NO_SHOW)
    notes TEXT, -- Special customer notes
    arrived_at TIMESTAMP, -- Arrival tracking
    expires_at TIMESTAMP, -- Expiry handling

    order_session_id INTEGER REFERENCES order_session(id), -- after sends order to kot start sesstion
    bill_id INTEGER REFERENCES bill_master(id),
    
    -- Audit fields
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);