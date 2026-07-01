# Cytos POS — Release Notes

---

## v0.3.6 — 1 July 2026

### Bug Fixes

**Company Details — Save Fixed**
Saving Company Details was failing with database and validation errors. Fixed: (1) the save statement was missing values for the last 12 settings columns; (2) the form no longer loads real-time data from the database on open and refreshes after save; (3) the company-logo field rejected empty input; (4) date fields (Start/End Date, Licenses Date, Check-in/out) failed to save as text. All settings now load and save correctly in real time.

### New Features

**Dineout Apps — Default Discount %**  *(Masters → Dineout Apps)*
Each dineout app (Swiggy, Zomato, District…) can now store a **default discount %**. When staff select the app in the Settle Bill dialog, the discount is auto-filled from this value — and remains editable for that bill. A new Discount % column shows the default in the Dineout Apps list.

---

## v0.3.5 — 30 June 2026

### Bug Fixes

**Employee Code — First Employee Addition Fixed**
Adding the first employee (or any employee after a fresh install) was failing silently — the Code field showed only the "Auto" placeholder and the record could not be saved. Root cause: the `employee_information.code` column in the database had drifted to `VARCHAR` while the schema expected a numeric sequence. The column has been migrated to `BIGINT` with an auto-increment sequence. Employee codes are now assigned automatically and the Add Employee form works correctly.

---

### New Features

**Dineout Discount — Swiggy / Zomato / District Settlements**
A new Dineout Discount section is available in the Settle Bill dialog for restaurant tables. Staff can:
- Select the delivery/aggregator app (Swiggy, Zomato, etc.)
- Enter the discount as a percentage (%) or flat amount (₹)
- System shows the discounted payable amount before confirming settlement
- Customer name and mobile number are mandatory when a dineout discount is applied
- Available only for single-payment settlements (not split / due / NC)

**Dineout Apps Master** *(Masters → Dineout Apps)*
Manage the list of aggregator apps used for dineout discounts. Add, edit, or deactivate apps (e.g. Swiggy, Zomato, District).

**Dineout Discount Report** *(Reports → Billing Reports → Dineout Discount)*
Date-range report showing per-app discount summary (original amount, discount given, net collected, bill count) and a full bill-by-bill detail table.

**Add-On Charges — Separate Rate Display in Billing**
When a menu item has add-ons (e.g. Plain Dosa + Extra Ghee), the item's own rate is now shown unchanged in the order panel. Add-on charges appear as separate indented rows below the item. The category breakdown in the bill summary shows an "Add-ons" row distinct from the main item amounts.

**Bill Reprint — Search by Bill Number, Mobile, or Name**
The reprint sheet now searches across bill number, customer mobile, and customer name with priority ranking (exact bill no → exact mobile → exact name → prefix → partial). Unsettled bill-printed tables are also searchable for reprinting. Results are ordered newest-first.

**Menu Card — Search Items by Code**
In the Change Kitchen Section dialog, items can now be searched by their numeric code (typing `1` matches item with code 1 first, before partial name matches). Each dropdown row shows the item code on the right for easy identification.

**Modify Bill** *(Billing toolbar — permission required)*
Authorized staff can correct a bill-printed table before settlement: add or remove items, adjust discount, change customer or waiter, then Print + Save. Every modification is logged with a mandatory reason for owner audit. Settled bills cannot be modified.

---

> **Note for system administrators:** This update includes database migrations that run automatically on first launch. No manual action required.

---
