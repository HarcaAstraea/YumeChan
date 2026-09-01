# Cloudflare D1 Database Setup Guide for YumeChan

This project uses **Cloudflare D1** (Cloudflare's serverless relational SQL database) with **Cloudflare Pages Functions** (`/functions/api/...`) to provide real-time, persistent storage for threads, posts, images, and pixel art across all users and devices.

---

## 1. Quick Setup Steps (via CLI)

### Step 1: Create your D1 Database
In your terminal, run:
```bash
npx wrangler d1 create yumechan_db
```
Wrangler will output something like:
```toml
[[d1_databases]]
binding = "DB"
database_name = "yumechan_db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 2: Paste the `database_id` into `wrangler.toml`
Open `wrangler.toml` and update the `database_id` value:
```toml
[[d1_databases]]
binding = "DB"
database_name = "yumechan_db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID_HERE"
migrations_dir = "./migrations"
```

### Step 3: Run SQL Migrations & Seed Data
Execute the schema migration and initial seed data on your remote Cloudflare database:

```bash
# 1. Apply schema migration
npx wrangler d1 migrations apply yumechan_db --remote

# 2. Seed initial boards and welcome thread
npx wrangler d1 execute yumechan_db --remote --file=./migrations/0002_seed.sql
```

---

## 2. Setting up D1 in Cloudflare Pages Dashboard

If you are using automatic Git deployments on **Cloudflare Pages**:

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **D1 SQL Database**.
   - Click **Create** → Name it `yumechan_db`.
   - In the **Console** tab of your new database, copy and run the SQL from `migrations/0001_schema.sql` and `migrations/0002_seed.sql`.
2. Link D1 to your Pages project:
   - Go to **Workers & Pages** → click your **Pages Project (`yumechan-board`)**.
   - Go to **Settings** → **Functions** → **D1 database bindings**.
   - Click **Add binding**:
     - Variable name: `DB`
     - D1 database: `yumechan_db`
3. Click **Save** and trigger a deployment!

---

## 3. Database Schema Overview

- **`boards`**: Contains board metadata, slugs (`yume`, `uta`, `mimi`), JP titles, icons, accent colors, and board rules.
- **`threads`**: Stores thread headers, title, OP ID, replies count, bump timestamp, pinned/sticky status, and image counts.
- **`posts`**: Stores full posts and replies, author, tripcode, text content, poetry formats (vertical tategaki / stanza / haiku), pixel art base64/grid, sage status, and reply back-links (`>>postId`).
