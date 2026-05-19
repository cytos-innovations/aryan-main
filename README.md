# Cytos POS

A cross-platform Point of Sale (POS) desktop application for hotels and restaurants, built with Tauri + React.

## Features

**Restaurant Management**
- Menu management — categories, groups, and menu items with food types and pricing
- Table & table group management with configurable tax, delivery, and takeaway options
- Kitchen Order Ticket (KOT) and bill message templates

**Hotel / Lodge Management**
- Guest information with market segments and identity verification
- Meal plans (EP, CP, MAP, AP, Day Use)
- Discount schemes and loyalty programs

**Accounts & Finance**
- General ledger, account categories, and account groups
- Day books (Cash, Bank, Sales, Purchase)
- GST tax master with slab configuration
- Tally master integration
- Party bank management
- Creditors and debtors ledger

**Inventory & Kitchen Stock**
- Item groups and item names with GST-linked pricing
- Supplier master

**HR & Payroll**
- Employee designations with salary bands
- Employee information and leave balances

**User & Access Control**
- Role-based user access management
- Authentication with permission guards

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust) |
| Frontend | React 19, React Router v7 |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Database | SQLite via `@tauri-apps/plugin-sql` |
| Icons | HugeIcons |
| Toasts | Sonner |
| Themes | next-themes (light / dark) |

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (hot-reload)
npm run tauri dev

# Build a production binary
npm run tauri build
```

## Database Seed Data

The file `seed_data.sql` contains default master data for a fresh installation:

- Indian states and major cities
- GST tax slabs (Exempt, 5%, 12%, 18%, 28%) and Service Charge
- Standard menu categories (Food, Beverages, Desserts, Starters, Liquor, Snacks) with pre-mapped GST rates
- Sample menu items, restaurant tables, table groups
- Hotel meal plans, market segments, identity types
- Chart of accounts (categories, groups, general ledger entries)
- Employee designations and sample staff

Run this SQL against your SQLite database after the schema is created on first launch.

## Project Structure

```
pos-app/
├── src/
│   ├── client/                 # React frontend
│   │   ├── components/         # Shared UI components (shadcn/ui)
│   │   ├── lib/                # Auth, DB helpers, theme
│   │   └── pages/
│   │       ├── master/         # All master-data CRUD pages
│   │       │   ├── menu/       # Restaurant menu management
│   │       │   ├── table/      # Table & group management
│   │       │   ├── employee/   # HR management
│   │       │   ├── kitchen_stock/
│   │       │   ├── account_groups/
│   │       │   └── party ledger/
│   │       └── utility/        # User & access management
│   └── server/                 # Tauri / Rust backend
│       ├── src/main.rs
│       ├── icons/
│       └── gen/schemas/
├── seed_data.sql               # Default master data
├── index.html
├── vite.config.js
└── package.json
```

## License

Copyright © 2025 [Cytos](https://cytos.org). All rights reserved.
