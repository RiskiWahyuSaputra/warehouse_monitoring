# Design Doc: Phase 1 - Foundation & Multi-Role Auth

## 1. Overview
Fase ini bertujuan untuk membangun fondasi sistem, termasuk skema database utama, sistem autentikasi berbasis token, dan manajemen data master (Kategori & Lokasi).

## 2. Architecture
- **Backend**: Laravel 12 (REST API)
- **Frontend**: React 19 + Vite
- **Database**: MySQL
- **Auth**: Laravel Sanctum (Token-based)

## 3. Database Schema

### Table: `roles`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| name | string | Display name (e.g., Admin) |
| slug | string | Unique identifier (admin, manager, staff) |

### Table: `users`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| name | string | User name |
| email | string | Unique email |
| password | string | Hashed password |
| role_id | foreignKey | References `roles.id` |

### Table: `categories`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| name | string | Category name |
| description | text | Optional |
| parent_id | foreignKey | Self-reference for hierarchy |

### Table: `locations`
| Column | Type | Description |
| --- | --- | --- |
| id | bigint | Primary Key |
| zone | string | Warehouse zone (e.g., Zone A) |
| rack | string | Rack identifier |
| bin | string | Bin identifier |
| capacity | integer | Maximum items |

## 4. API Endpoints
- `POST /api/login`: Authenticate and return token + user info.
- `POST /api/logout`: Revoke current token.
- `GET /api/me`: Get current authenticated user details.
- `RESOURCE /api/categories`: CRUD for categories (Admin/Manager only).
- `RESOURCE /api/locations`: CRUD for locations (Admin/Manager only).

## 5. Frontend Components
- `AuthContext`: Manage user state and auth tokens globally.
- `ProtectedRoute`: Wrapper component to restrict access by role.
- `Sidebar`: Navigation filtered by user role.
- `Dashboard`: Initial empty dashboard.

## 6. Seeders
- **RoleSeeder**: Create 'Admin', 'Manager', and 'Staff' roles.
- **UserSeeder**: Create one default Admin user for initial login (`admin@example.com` / `password`).

## 7. Security
- Use `Sanctum` for secure token management.
- `CheckRole` middleware on backend to enforce RBAC.
- Input validation on all endpoints.
