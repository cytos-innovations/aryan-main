# Cytos POS App

A multi-module, cross-platform Point of Sale desktop application for hotels and restaurants, built by **Aryan NxtGen** using Tauri v2 + React 19.

The app is organized into four independent application modules — **Lodge**, **Restaurant**, **Accounts**, and **Material** — each with its own permission set. A single login grants access to all modules the user is authorized for, and they can switch between modules from the sidebar without re-logging in.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Application Modules](#application-modules)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [First-Run Database Setup](#first-run-database-setup)
- [Seed Data](#seed-data)
- [Authentication & Permissions](#authentication--permissions)
- [Themes](#themes)
- [Project Structure](#project-structure)
- [Available Routes](#available-routes)
- [Permission Keys Reference](#permission-keys-reference)

---

## Features Overview

- **Multi-module POS** — Lodge, Restaurant, Accounts, and Material run as separate "applications" within the same binary; users can switch between them instantly via the sidebar.
- **Role-based access control** — Every page is guarded by a named permission key. Super users get wildcard (`*`) access; everyone else is granted individual permissions per application.
- **Dynamic permission refresh** — Permissions are re-fetched from the database on every app mount, so changes made in User Access take effect without requiring a logout.
- **Application-aware sidebar** — The navigation tree automatically hides items that are irrelevant to the currently active module.
- **Four built-in themes** — Light, Dark, Ocean, and Forest; selection is persisted per device.
- **PostgreSQL backend** — Connects to any Postgres instance; connection details are saved locally so the setup screen only appears once.

---

## Application Modules

| ID | Code | Module | Purpose |
|----|------|--------|---------|
| 1 | `lodge` | Lodge | Hotel front desk, guest records, room plans, market segments |
| 2 | `restaurant` | Restaurant | Menu, tables, KOT, bill printing |
| 3 | `material` | Material | Kitchen stock, raw-material inventory |
| 4 | `account` | Accounts | General ledger, day books, tax, payroll |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | [Tauri](https://tauri.app) (Rust) | v2 |
| Frontend framework | React | 19 |
| Routing | React Router DOM | v7 |
| Data fetching & cache | TanStack Query | v5 |
| Data tables | TanStack Table | v8 |
| Styling | Tailwind CSS | v4 |
| Component library | shadcn/ui + Radix UI | latest |
| Database driver | @tauri-apps/plugin-sql | v2 |
| Database | PostgreSQL | any modern version |
| Icons | HugeIcons | v4 |
| Toast notifications | Sonner | v2 |
| Theme management | next-themes / custom | — |
| Date utilities | date-fns | v4 |
| Build tool | Vite | v7 |

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js 20+ | Frontend build | [nodejs.org](https://nodejs.org) |
| Rust (stable) | Tauri backend | [rustup.rs](https://rustup.rs) |
| Tauri system deps | WebView2 / OS libs | [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/) |
| PostgreSQL | Database | [postgresql.org](https://www.postgresql.org) |

> **Windows**: WebView2 is bundled with the release binary. For development, install the WebView2 runtime from Microsoft.

---

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd pos-app

# 2. Install Node dependencies
npm install

# 3. Start the development build (hot-reload on the frontend, Rust recompiles on change)
npm run tauri dev

# 4. Build a production installer
npm run tauri build
```

The compiled installer / executable is placed in `src/server/target/release/bundle/`.

---

## First-Run Database Setup

On the very first launch (or whenever the saved connection is cleared), the app shows a **Connect to PostgreSQL** screen instead of the login page.

Fill in the following fields:

| Field | Default | Description |
|-------|---------|-------------|
| Host | `localhost` | Postgres server hostname or IP |
| Port | `5432` | Postgres port |
| Database | — | Name of your POS database |
| Username | `postgres` | Database user |
| Password | — | Database password |

Use **Test connection** to verify credentials without saving. Click **Save & Connect** to persist the config on the device — you will not be prompted again unless the connection fails or you manually reset it.

The connection string is stored locally via the Tauri `invoke("save_db_config")` command. To reset it (e.g., to point at a different server), call `invoke("clear_db_config")` or delete the app's local config file.

---

## Seed Data

`seed_data.sql` contains default master data for a fresh installation. Run it against your PostgreSQL database **after** the schema has been created:

```bash
psql -U postgres -d <your_database> -f seed_data.sql
```

### What the seed data includes

| Category | Entries |
|----------|---------|
| Units | Pcs, Kg, Grams, Litre, ML, Bottle |
| Kitchen sections | section_1 – section_5 (sections 1–3 print-enabled) |
| Food types | Veg, Non-Veg, Egg, Vegan, Beverage |
| Identity types | Aadhaar, PAN, Passport, Voter ID, Driving Licence, Ration Card |
| Market segments | Walk-In, Booking.com, Make My Trip, Travel Agent, Government, Group Booking |
| Meal plans | EP, CP, MAP, AP, Day Use |
| GST tax slabs | Exempt (0%), GST 5/12/18/28%, Service Charge 10% |
| Account categories | Assets, Liabilities, Equity, Income, Expenses |
| Account groups | 13 standard groups (Fixed Assets, Cash & Bank, Sales, Purchase, etc.) |
| General ledger | 15 default ledger accounts (Cash, Bank, Sales, GST Output, etc.) |
| Day books | Cash, Bank, Sales, Purchase |
| Tally master | Cash, Bank, Sales, Purchase, GST Output/Input, Service Tax, Discount, Commission |
| Employee designations | Manager, Asst. Manager, Receptionist, Cashier, Waiter, Captain, Chef, Housekeeping, Security Guard, Driver |
| Party banks | SBI, HDFC, ICICI, Axis, Bank of Baroda |
| Bill messages | 4 sample bill footer messages |
| KOT messages | Rush Order, Less Spicy, Extra Spicy, No Onion, No Garlic, Well Done, Half Portion |
| States | All 28 Indian states + 8 UTs |
| Cities | 50 major Indian cities |
| Menu categories | Food, Beverages, Desserts, Starters, Liquor, Snacks (with GST rates pre-mapped) |
| Menu groups | Breakfast, Lunch, Dinner, Veg/Non-Veg Starters, Soft Drinks, Hot Beverages, Sweets, Ice Cream, Beer, Whiskey |
| Menu card items | 28 sample dishes |
| Table groups | Dining Hall, Bar, Rooftop, Banquet, Home Delivery, Takeaway |
| Restaurant tables | Table 1–10 (Dining Hall), Bar 1–3 |
| Discount schemes | No Discount, Staff 20%, Loyalty 5/10%, Corporate 15%, Complimentary 100% |
| Item groups | Raw Materials, Beverages Stock, Dry Goods, Cleaning Supplies, Packaging |
| Item names | 16 stock items with GST-linked pricing |
| Suppliers | 5 sample suppliers |
| Customers | 8 sample guest records |
| Employees | 8 sample staff records |

All inserts use `ON CONFLICT … DO NOTHING`, so re-running the script is safe.

---

## Authentication & Permissions

### Login flow

1. Enter a **username** — the field shows autocomplete suggestions from the database.
2. The app fetches the list of **applications** accessible to that user and populates a dropdown.
3. Select an **application** (Lodge, Restaurant, Accounts, or Material).
4. Enter the **password** and click **Sign In**.

On success, the user is redirected to the first page they have permission to access (Dashboard if allowed, otherwise the first accessible route).

### Session storage

The authenticated session (user info, active application, and permissions array) is stored in `localStorage` under the key `pos-app:auth`. Closing and reopening the app restores the session automatically.

### Permission model

- Each route has a named **permission key** (e.g., `menu-card:view`).
- Super users (`is_super = true`) receive the `*` wildcard, granting access to everything.
- Regular users receive a flat array of permission strings fetched from the database.
- The `Can` component and `useAuth().can()` hook are used throughout the UI to conditionally render buttons and actions.
- Permissions are **refreshed from the database on every app mount**, so an admin can revoke access without forcing a logout.

### Application switching

Users with access to more than one module see an **Application Switcher** in the sidebar footer. Switching reloads the permission set for the new module and navigates to the dashboard — no re-login required.

---

## Themes

Four themes are available and can be switched from both the **login page** and the **in-app header**:

| Theme | Description |
|-------|-------------|
| Light | Default white / light-gray palette |
| Dark | Near-black background |
| Ocean | Deep blue-tinted dark theme |
| Forest | Deep green-tinted dark theme |

The selected theme is persisted in `localStorage` under `pos-app:theme`.

---

## Project Structure

```
pos-app/
├── index.html
├── vite.config.js
├── components.json          # shadcn/ui component config
├── jsconfig.json
├── package.json
├── seed_data.sql            # Default PostgreSQL master data
│
├── src/
│   ├── client/              # React frontend
│   │   ├── app.css
│   │   ├── main.jsx         # App entry point, providers, router
│   │   │
│   │   ├── lib/             # Core utilities
│   │   │   ├── auth.jsx     # AuthProvider, useAuth, Can, ProtectedRoute
│   │   │   ├── db.jsx       # DbProvider, useDb (PostgreSQL connection)
│   │   │   ├── registry.jsx # Route registry, sidebar navigation tree
│   │   │   └── theme.jsx    # ThemeProvider, useTheme, THEMES constant
│   │   │
│   │   ├── components/
│   │   │   ├── app-sidebar.jsx    # Main layout: sidebar, breadcrumb, theme toggle
│   │   │   ├── data-table.jsx     # Reusable TanStack Table wrapper
│   │   │   └── ui/                # shadcn/ui primitives
│   │   │
│   │   └── pages/
│   │       ├── login.jsx          # Login page with autocomplete + app selector
│   │       ├── dashboard.jsx      # Stats cards + quick-action shortcuts
│   │       ├── db-setup.jsx       # First-run PostgreSQL connection form
│   │       ├── error.jsx          # 404 page
│   │       ├── forbidden.jsx      # 403 page
│   │       │
│   │       ├── master/
│   │       │   ├── lodge_customer_info.jsx
│   │       │   ├── lodge_discount_info.jsx
│   │       │   ├── lodge_identity.jsx
│   │       │   ├── lodge_market_segment.jsx
│   │       │   ├── lodge_plan.jsx
│   │       │   ├── acc_tax_master.jsx
│   │       │   ├── acc_tally_master.jsx
│   │       │   ├── acc_general_Ledger.jsx
│   │       │   ├── acc_day_book.jsx
│   │       │   ├── acc_party_bank.jsx
│   │       │   ├── menu/
│   │       │   │   ├── rest_menu_category.jsx
│   │       │   │   ├── rest_menu_type.jsx     # Food types
│   │       │   │   ├── rest_menu_group.jsx
│   │       │   │   └── rest_menu_main.jsx     # Menu card (items)
│   │       │   ├── table/
│   │       │   │   ├── rest_table_group.jsx
│   │       │   │   └── rest_table_main.jsx
│   │       │   ├── messages/
│   │       │   │   ├── rest_bill_msg.jsx
│   │       │   │   └── rest_kot_msg.jsx
│   │       │   ├── account_groups/
│   │       │   │   ├── acc_account_categories.jsx
│   │       │   │   └── acc_account_groups.jsx
│   │       │   ├── party ledger/
│   │       │   │   ├── acc_creditor.jsx
│   │       │   │   └── acc_Debtor.jsx
│   │       │   ├── employee/
│   │       │   │   ├── acc_designation.jsx
│   │       │   │   └── acc_employee_info.jsx
│   │       │   └── kitchen_stock/
│   │       │       ├── material_item_group.jsx
│   │       │       └── material_item_name.jsx
│   │       │
│   │       └── utility/
│   │           ├── user-main.jsx          # User account management
│   │           └── user_access.jsx        # Per-user permission editor
│   │
│   └── server/              # Tauri / Rust backend
│       ├── build.rs
│       ├── src/
│       │   └── main.rs      # Entry point — calls pos_app_lib::run()
│       ├── icons/           # App icons (ICO, ICNS, PNG)
│       └── gen/schemas/     # Tauri ACL manifests
```

---

## Available Routes

### Operations

| Path | Label | Application | Permission |
|------|-------|-------------|------------|
| `/dashboard` | Dashboard | All | `dashboard:view` |

### Master Data — Lodge

| Path | Label | Permission |
|------|-------|------------|
| `/master/lodge/customers` | Customer Information | `lodge-customer:view` |
| `/master/lodge/discount` | Discount Information | `lodge-discount:view` |
| `/master/lodge/identity` | Identity Master | `lodge-identity:view` |
| `/master/lodge/market-segment` | Market Segments | `lodge-market-segment:view` |
| `/master/lodge/plan` | Plan Master | `lodge-plan:view` |

### Master Data — Restaurant

| Path | Label | Permission |
|------|-------|------------|
| `/master/menu/categories` | Menu Categories | `menu-category:view` |
| `/master/food-types` | Food Types | `food-type:view` |
| `/master/menu/groups` | Menu Groups | `menu-group:view` |
| `/master/menu/card` | Menu Card | `menu-card:view` |
| `/master/table/groups` | Table Groups | `table-group:view` |
| `/master/table/tables` | Restaurant Tables | `restaurant-table:view` |
| `/master/messages/bill` | Bill Messages | `bill-message:view` |
| `/master/messages/kot` | KOT Messages | `kot-message:view` |

### Master Data — Accounts

| Path | Label | Permission |
|------|-------|------------|
| `/master/account/tax` | Tax Master | `acc-tax-master:view` |
| `/master/account/tally` | Tally Master | `acc-tally-master:view` |
| `/master/account/general-ledger` | General Ledger | `acc-general-ledger:view` |
| `/master/account/day-book` | Day Book | `acc-day-book:view` |
| `/master/account/party-bank` | Party Bank | `acc-party-bank:view` |
| `/master/account/categories` | Account Categories | `acc-account-category:view` |
| `/master/account/groups` | Account Groups | `acc-account-group:view` |
| `/master/account/creditor` | Creditor Ledger | `acc-creditor:view` |
| `/master/account/debtor` | Debtor Ledger | `acc-debtor:view` |

### Master Data — Material (Kitchen Stock)

| Path | Label | Permission |
|------|-------|------------|
| `/master/material/item-group` | Item Group Master | `mat-item-group:view` |
| `/master/material/item-name` | Item Name Master | `mat-item-name:view` |

### Master Data — Employee (All applications)

| Path | Label | Permission |
|------|-------|------------|
| `/master/employee/designation` | Designation | `employee-designation:view` |
| `/master/employee/info` | Employee Information | `employee-info:view` |

### Administration (All applications)

| Path | Label | Permission |
|------|-------|------------|
| `/admin/users` | User Accounts | `users:view` |
| `/admin/user-access` | User Access | `user-access:view` |

---

## Permission Keys Reference

The User Access screen organizes permissions into tabs. Below is the full list of permission keys grouped by tab:

**Master tab**

| Key | Module |
|-----|--------|
| `menu-category` | Menu Categories |
| `food-type` | Food Types |
| `menu-group` | Menu Groups |
| `menu-card` | Menu Card |
| `table-group` | Table Groups |
| `restaurant-table` | Restaurant Tables |
| `bill-message` | Bill Messages |
| `kot-message` | KOT Messages |
| `lodge-customer` | Customer Information |
| `lodge-discount` | Discount Information |
| `lodge-identity` | Identity Master |
| `lodge-market-segment` | Market Segment |
| `lodge-plan` | Plan Master |
| `acc-tax-master` | Tax Master |
| `acc-tally-master` | Tally Master |
| `acc-general-ledger` | General Ledger |
| `acc-day-book` | Day Book |
| `acc-party-bank` | Party Bank |
| `acc-account-category` | Account Categories |
| `acc-account-group` | Account Groups |
| `acc-creditor` | Creditor Ledger |
| `acc-debtor` | Debtor Ledger |
| `mat-item-group` | Item Group Master |
| `mat-item-name` | Item Name Master |
| `employee-designation` | Designation |
| `employee-info` | Employee Information |

**Utility tab**

| Key | Module |
|-----|--------|
| `dashboard` | Dashboard |
| `users` | User Accounts |
| `user-access` | User Access |

Each key supports four action suffixes: `:view`, `:add`, `:edit`, `:delete`.

---

## License

© 2025 Aryan NxtGen. All rights reserved.
