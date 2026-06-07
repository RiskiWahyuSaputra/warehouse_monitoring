# Warehouse Monitoring System — Complete Project Analysis

## 1. SYSTEM OVERVIEW

A dual-stack Laravel 12 + React 18 warehouse inventory management system.
Backend serves as API-only (Sanctum auth), frontend is a SPA consumed via Vite.

**Tech Stack:**
- Backend: Laravel 12, PHP 8.2, MySQL (via XAMPP), Sanctum API auth
- Frontend: React 18, Vite 6, Tailwind CSS, React Router 7
- Barcode: Endroid QR Code (PHP), Html5Qrcode/JSQR (JS)

---

## 2. DIRECTORY STRUCTURE

```
warehouse_monitoring/
├── backend/                  # Laravel API
│   ├── app/
│   │   ├── Console/Commands/    # Artisan commands (CheckLowStock, GenerateForecasts)
│   │   ├── Enums/               # ApprovalStatus enum
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # All API controllers
│   │   │   └── Middleware/      # CheckRole middleware
│   │   ├── Models/              # Eloquent models
│   │   ├── Notifications/      # LowStockNotification
│   │   └── Services/            # ForecastingService
│   ├── config/                  # Laravel config
│   ├── database/
│   │   ├── factories/           # Model factories
│   │   ├── migrations/          # 14 migrations
│   │   └── seeders/             # DatabaseSeeder, DemoDataSeeder
│   ├── routes/
│   │   ├── api.php              # All API routes (Sanctum protected)
│   │   └── web.php              # Empty (API-only)
│   └── public/                  # Entry point + built assets
│
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/          # Layout.jsx, ProtectedRoute.jsx
│   │   ├── context/             # AuthContext.jsx (auth state)
│   │   ├── pages/               # All page components
│   │   ├── services/            # api.js (axios instance)
│   │   ├── App.jsx              # Router
│   │   ├── App.css              # Global styles
│   │   ├── index.css            # Tailwind + custom classes
│   │   └── main.jsx             # Entry point
│   └── dist/                    # Built production assets
│
└── docs/superpowers/            # Design docs and specs
```

---

## 3. DATABASE SCHEMA (14 Tables)

### Core Tables
| Table | Purpose |
|---|---|
| `roles` | admin, manager, staff |
| `users` | Users with role_id FK |
| `categories` | Item categories (Elektronik, Mekanikal, etc.) |
| `locations` | Warehouse locations (zone/rack/bin) |
| `suppliers` | Supplier master data |
| `inventory_items` | Products (name, SKU, barcode, min_stock, unit) |
| `stock_levels` | Current stock per item per location (quantity, reserved_quantity) |

### Transaction Tables
| Table | Purpose |
|---|---|
| `stock_movements` | Stock in/out/adjustment log |
| `approval_requests` | Approval workflow for stock out |
| `barcode_scans` | Barcode scan history |
| `supplier_deliveries` | Supplier delivery tracking |

### Notification Tables
| Table | Purpose |
|---|---|
| `notifications` | Laravel notifications |
| `in_app_notifications` | In-app notification model |
| `notification_preferences` | User notification settings |

### Forecast Tables
| Table | Purpose |
|---|---|
| `stock_forecasts` | Demand forecasts |
| `forecast_variances` | Forecast accuracy tracking |

---

## 4. AUTHENTICATION FLOW

```
┌─────────────┐     POST /api/login      ┌─────────────┐
│   Login     │ ──────────────────────►  │  Laravel    │
│   Page      │                          │  Sanctum    │
│  (React)    │  ◄────────────────────── │  Auth       │
└─────────────┘     { user, token }      └─────────────┘
       │
       │  Store token + user in localStorage
       │  Set Authorization: Bearer <token> header
       ▼
┌─────────────┐     GET /api/me          ┌─────────────┐
│  Protected  │ ──────────────────────►  │  Laravel    │
│   Routes    │  (validate token)        │  API        │
│  (React)    │  ◄────────────────────── │  Resources  │
└─────────────┘     { user }             └─────────────┘
```

**Auth Flow:**
1. User enters email/password → `POST /api/login`
2. Laravel validates credentials → creates Sanctum token
3. Frontend stores `token` + `user` in `localStorage`
4. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
5. `ProtectedRoute` checks auth → redirects to `/login` if no token
6. `AuthContext` fetches `/me` on mount to validate token

**Roles:** admin, manager, staff (RBAC via `CheckRole` middleware)

---

## 5. API ROUTES (backend/routes/api.php)

### Public Routes
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/login` | Login |
| GET | `/api/ping` | Health check |
| GET | `/api/inventory/items/{id}/barcode/svg` | Barcode SVG image |
| GET | `/api/inventory/items/{id}/barcode/print` | Barcode print page |
| GET | `/api/inventory/items/{id}/qr-code` | QR Code SVG image |
| GET | `/api/inventory/items/{id}/qr-print` | QR Code print page |

### Authenticated Routes (all users)
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/me` | Get current user |
| POST | `/api/logout` | Logout |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/dashboard/charts` | Dashboard chart data |
| GET | `/api/inventory/movements` | List stock movements |
| POST | `/api/inventory/movements` | Create stock movement |
| POST | `/api/inventory/batch-movements` | Batch movements |
| POST | `/api/inventory/transfer` | Transfer between locations |
| POST | `/api/barcode/scan` | Scan barcode/QR |
| GET | `/api/barcode/history` | Scan history |
| GET | `/api/barcode/lookup/{code}` | Lookup by code |
| GET | `/api/inventory/items/{id}/barcode` | Get barcode data |
| GET | `/api/approvals` | List approvals |
| POST | `/api/approvals` | Create approval request |
| GET | `/api/forecasts` | List forecasts |
| GET | `/api/forecasts/early-warnings` | Early warning alerts |
| GET | `/api/forecasts/{item}` | Single item forecast |
| GET | `/api/in-app-notifications` | List notifications |
| GET | `/api/in-app-notifications/unread-count` | Unread count |
| POST | `/api/in-app-notifications/read-all` | Mark all read |
| POST | `/api/in-app-notifications/{id}/read` | Mark one read |
| GET | `/api/roles` | List roles |
| GET | `/api/inventory-items` | List inventory (paginated) |
| GET | `/api/inventory-items/{id}` | Single inventory item |
| GET | `/api/categories` | List categories |
| GET | `/api/locations` | List locations |

### Admin/Manager Only
| Method | Endpoint | Purpose |
|---|---|---|
| POST/PUT/DELETE | `/api/categories` | Category CRUD |
| POST/PUT/DELETE | `/api/locations` | Location CRUD |
| CRUD | `/api/suppliers` | Supplier CRUD |
| POST/PUT/DELETE | `/api/inventory-items` | Inventory CRUD |
| POST | `/api/approvals/{id}/decide` | Approve/reject |
| GET | `/api/export/stock` | Stock report (CSV/HTML) |
| GET | `/api/export/movements` | Movement report |
| GET | `/api/export/forecasts` | Forecast report |
| CRUD | `/api/users` | User management |
| GET | `/api/audit-logs` | Audit log |
| POST | `/api/forecasts/generate` | Generate forecasts |
| POST | `/api/forecasts/record-variances` | Record variances |

---

## 6. FRONTEND PAGE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                      React Router                           │
├─────────────────────────────────────────────────────────────┤
│  /login → LoginPage                                         │
│  / → DashboardPage (stats, charts)                          │
│  /inventory → InventoryPage (CRUD, barcode/QR modal)        │
│  /barcode → BarcodePage (manual/camera/upload scanner)      │
│  /movements → MovementsPage (stock in/out/transfer)         │
│  /approvals → ApprovalsPage (approve/reject)                │
│  /forecasts → ForecastsPage (demand forecasting)            │
│  /notifications → NotificationsPage (in-app notifications)  │
│  /users → UsersPage (admin/manager only)                    │
└─────────────────────────────────────────────────────────────┘
```

### Barcode Scanner Flow (the page we fixed)
```
┌──────────────────────────────────────────────────────────┐
│  BarcodePage                                             │
│  ┌─────────┬──────────┬─────────┐                        │
│  │ Manual  │ Camera   │ Upload  │  ← Mode selection     │
│  └─────────┴──────────┴─────────┘                        │
│                                                          │
│  Manual: Type code → Enter → POST /api/barcode/scan      │
│  Camera: Html5Qrcode → detect → POST /api/barcode/scan   │
│  Upload: html5-qrcode scanFile → POST /api/barcode/scan  │
│                                                          │
│  Result: { found: true, item: {...} } → Show detail card │
│          { found: false } → Show "not found" warning     │
└──────────────────────────────────────────────────────────┘
```

---

## 7. KEY BUSINESS LOGIC

### Stock Movement Flow
1. User creates movement (in/out/adjustment) via `POST /api/inventory/movements`
2. Controller validates stock availability for `out` type
3. DB transaction: create movement record + update stock level
4. For `out` movements: auto-create `approval_request` (pending)
5. Admin/Manager approves via `POST /api/approvals/{id}/decide`

### Barcode/QR Flow
1. **Generate**: `GET /api/inventory/items/{id}/qr-code` → SVG from Endroid library
2. **Scan (Manual)**: Type code → `POST /api/barcode/scan` → lookup by barcode/SKU
3. **Scan (Camera)**: Html5Qrcode scans → callback → `POST /api/barcode/scan`
4. **Scan (Upload)**: html5-qrcode scanFile → decode → `POST /api/barcode/scan`
5. **Scan API**: Lookup by barcode first, then SKU → return item details or 404

### Approval Workflow
1. Staff creates stock out → approval_request created (pending)
2. Manager/Admin reviews → approve or reject
3. Approved: stock movement is already recorded (movement created first)
4. Rejected: movement stays but approval status = rejected

### Notification System
- `CheckLowStock` command runs periodically → creates in-app notifications
- Frontend polls `/api/in-app-notifications/unread-count` every 30s
- Bell icon shows unread count badge

---

## 8. DATA MODELS RELATIONSHIPS

```
User ──1:N──► StockMovement
User ──1:N──► ApprovalRequest (requester)
User ──1:N──► ApprovalRequest (approver)
User ──1:N──► BarcodeScan
User ──1:N──► NotificationInApp

InventoryItem ──1:N──► StockLevel
InventoryItem ──1:N──► StockMovement
InventoryItem ──1:N──► StockForecast
InventoryItem ──1:N──► ApprovalRequest
InventoryItem ──N:1──► Category

Location ──1:N──► StockLevel
Location ──1:N──► StockMovement

Supplier ──1:N──► StockMovement
Supplier ──1:N──► SupplierDelivery
```

---

## 9. ENVIRONMENT SETUP

### Backend
```bash
cd backend
composer install
php artisan migrate
php artisan db:seed  # Creates roles, admin user, demo data
php artisan serve    # http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000 (dev server with proxy)
npm run build  # Production build → dist/
```

### Default Login
- Admin: admin@warehouse.com
- Manager: manager@warehouse.com
- Staff: staff@warehouse.com
- Password: (set via seeder)

---

## 10. COMPLETED FEATURES ✅

- Authentication (Sanctum token-based)
- RBAC (admin/manager/staff)
- Inventory CRUD with search/filter/pagination
- Stock movements (in/out/adjustment/transfer)
- Approval workflow
- Barcode generation (Code 128 SVG)
- QR Code generation (Endroid library, error correction High)
- Barcode/QR scanning (manual, camera via Html5Qrcode, upload)
- Scan history
- Dashboard with stats and charts
- Demand forecasting
- In-app notifications
- Export (CSV/HTML)
- Audit logging
- Supplier management
- Low stock alerts

## 11. REMAINING / INCOMPLETE ❌

- Reverb WebSocket (real-time updates)
- Audit auto-log (manual logging only)
- Approval escalation
- Password reset
- Supplier performance metrics
- Categories/Locations/Suppliers CRUD pages (frontend)
- Audit Logs page (frontend)
- Notifications page polish
