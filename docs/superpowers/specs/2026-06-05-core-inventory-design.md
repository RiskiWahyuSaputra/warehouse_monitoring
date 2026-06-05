# Design Doc: Phase 2 - Core Inventory Management

## 1. Overview
Fase ini berfokus pada manajemen data master barang, supplier, dan mekanisme pergerakan stok (Stock Movement) yang mendukung multi-lokasi.

## 2. Architecture & Data Flow
Sistem menggunakan pendekatan **Multi-Location**. Stok tidak menempel langsung pada item, melainkan pada pasangan Item-Lokasi untuk akurasi posisi barang di gudang.

## 3. Database Schema (New Tables)

### Table: `suppliers`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| name | string | Supplier Name |
| contact_person | string | Contact Name |
| email | string | Unique email |
| phone | string | Phone number |
| address | text | Physical address |
| performance_score | decimal | Default: 0.00 |

### Table: `inventory_items`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| category_id | foreignKey | References `categories.id` |
| name | string | Item name |
| sku | string | Unique SKU |
| barcode | string | Unique Barcode |
| description | text | Optional |
| min_stock | integer | Minimum stock threshold |
| unit | string | e.g., Pcs, Box, Kg |

### Table: `stock_levels`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| inventory_item_id | foreignKey | References `inventory_items.id` |
| location_id | foreignKey | References `locations.id` |
| quantity | integer | Current stock in this location |

### Table: `stock_movements`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| inventory_item_id | foreignKey | References `inventory_items.id` |
| location_id | foreignKey | References `locations.id` |
| supplier_id | foreignKey | Optional, for "In" movements |
| user_id | foreignKey | References `users.id` (who did it) |
| type | enum | ['in', 'out', 'adjustment'] |
| quantity | integer | Quantity moved |
| remarks | text | Reason/notes |
| created_at | timestamp | Used as transaction date |

## 4. Business Logic
- **Stock In**: Update atau Create record di `stock_levels`. Tambah `quantity`.
- **Stock Out**: Validasi ketersediaan stok di `stock_levels` pada `location_id` tertentu. Kurangi `quantity`.
- **Adjustment**: Update langsung `quantity` di `stock_levels` dan catat selisihnya di `stock_movements`.

## 5. API Endpoints
- `RESOURCE /api/suppliers`: Standard CRUD.
- `RESOURCE /api/items`: CRUD with category link.
- `GET /api/inventory/stocks`: List items with total stock and per-location breakdown.
- `POST /api/inventory/movements`: Execute stock transaction.
- `GET /api/inventory/movements/history`: Audit trail log.

## 6. Security & RBAC
- Admin & Manager: Full Access.
- Staff: Read-only for Master Data, but can perform "In" and "Out" movements. "Adjustment" is restricted to Manager/Admin.
