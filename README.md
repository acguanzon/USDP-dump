# USDP Discount Management System

This repository contains a lightweight PHP MVC backend and a static HTML/JS frontend for the UNOR‑SSG Student Discount & Benefits system.

## Prerequisites
- PHP 8.1+ installed
- PHP extensions enabled: `pdo_sqlite`, `sqlite3`
- Node.js (optional, for running a local static server)

## Environment
- Backend configuration is in `php-mvc/config/config.php`
- Optional environment variables:
  - `JWT_SECRET` — secret used to sign tokens (recommended to set)
  - `GCS_BUCKET` — Google Cloud Storage bucket name (optional)
  - `GCS_SIGN_URL_TTL` — presigned URL TTL in seconds (optional)

Set environment variables before starting the backend.
- Windows PowerShell:
  - `$env:JWT_SECRET = "change-this-in-production"`
- macOS/Linux:
  - `export JWT_SECRET=change-this-in-production`

## Start the Backend (API)
Run from the project root:

- Windows PowerShell:
```
php -S localhost:5000 -t php-mvc/public
```
- macOS/Linux:
```
php -S localhost:5000 -t php-mvc/public
```

API base: `http://localhost:5000/api`

On first start, a SQLite database is created in `php-mvc/storage/database.sqlite`, schema is migrated automatically, and an admin user is seeded.

Admin login:
- Email: `admin@usdp.edu.ph`
- Password: `password123`

## Start the Website (Frontend)
The frontend is pure HTML/CSS/JS in the `frontend` directory. Serve it with any static server.

- Using Node http-server via npx:
```
npx --yes http-server frontend -p 8080
```
Open `http://localhost:8080/index.html`.

If already authenticated, navigation is automatic to Admin or Student dashboards.

## Optional: Google Cloud Storage
To enable presigned uploads (Files feature):
- Install Google Cloud Storage SDK:
```
composer require google/cloud-storage
```
- Configure `GCS_BUCKET` environment variable to your bucket name

## Troubleshooting
- SQLite driver error: enable `pdo_sqlite` and `sqlite3` in `php.ini`
- Unauthorized on admin pages: ensure you are logged in as admin
- API base is configured in `frontend/js/auth.js` (`API_BASE`)

## Project Structure
- `php-mvc/` — backend (controllers, core, config, public)
- `frontend/` — static site (pages and JS)
- `.gitignore` excludes local storage and environment files