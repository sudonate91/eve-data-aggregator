# EVE Data Aggregator

> **⚠️ Internal tool for S0b and affiliated corporations. Not designed to be corp-agnostic — corporation IDs, database names, and job configuration are hardcoded to S0b Holdings, S0b Structure Management, Ven0m, KryTek, and S0b-Mart.**

Imports EVE Online corporation wallet journal entries and Skyhook contracts from the ESI API into MySQL databases. Runs on a configurable interval, tracks only new/changed records, and prints a per-corp summary after each run.

---

## How It Works

- Authenticates via EVE SSO OAuth2 per corporation
- Fetches wallet journal pages from ESI (all 7 divisions)
- Diffs incoming entries against the database — inserts new, updates changed, skips identical
- Fetches corporation contracts, filters to Skyhook item exchanges, prices them via Janice API
- Runs on a timer (default 60 minutes), prints a run summary with new/updated counts per corp

---

## Running on Unraid (Primary Deployment)

The image is hosted on Docker Hub at `sudonate91/eve-data-aggregator:latest`. MySQL 8.4 is **bundled inside the image** — you only need one container.

### EVE ESI Application — Required Before Install

You need a registered EVE application at [https://developers.eveonline.com/applications](https://developers.eveonline.com/applications).

**Set the Callback URL to:**
```
https://<your-unraid-ip>:3000/callback
```
For example: `https://192.168.1.50:3000/callback`

> The app serves HTTPS on port 3000 with a self-signed cert. EVE SSO requires `https`. You must register the **exact URL** including IP and port.

If you want to also authenticate from local dev, add a second callback URL:
```
https://localhost:3000/callback
```
EVE allows multiple callback URLs per app — just add both.

---

### First-Time Installation

**1. Pull the image (SSH on Unraid):**
```bash
docker pull sudonate91/eve-data-aggregator:latest
```

**2. Install the template:**
```bash
curl -o /boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator.xml \
  https://raw.githubusercontent.com/sudonate91/eve-data-aggregator/main/unraid-template.xml
```

**3. Add the container via WebUI:**
1. Docker tab → **Add Container**
2. Select `eve-data-aggregator` from the user templates dropdown
3. Fill in the required fields:

| Variable | Value | Notes |
|---|---|---|
| `CLIENT_ID` | from EVE dev portal | |
| `CALLBACK_URL` | `https://<unraid-ip>:3000/callback` | Must match ESI app exactly |
| `SCOPE` | `esi-wallet.read_corporation_wallets.v1 esi-contracts.read_corporation_contracts.v1` | |
| `STATE` | any random string | e.g. `my-eve-app-2024` |
| `MYSQL_ROOT_PASSWORD` | strong password | Used for DB admin and migration import |
| `DB_USER` | `S0b_Admin` | |
| `DB_PASSWORD` | your password | |
| `CORPORATION_ID` | S0b Holdings corp ID | |
| *(other corp IDs)* | as needed | Leave blank to disable |
| `USE_ENV_CONFIG` | `true` | Required — no interactive terminal in Docker |
| `RUN_INTERVAL_MINUTES` | `60` | |

4. Click **Apply**
5. Open `https://<unraid-ip>:3000` in your browser
6. Accept the self-signed certificate warning (click Advanced → Proceed)
7. On **Tab 1 — Corp Authentication**: click Authenticate for each corp, log in with the director character
8. Jobs start automatically once all corps are green

> **First install with existing data?** Use **Tab 2 — Data Migration** in the web UI to upload a SQL dump from your old MySQL. No SSH or Workbench required.

---

### Updating on Unraid

> Unraid's built-in "Check for Updates" does not reliably detect updates for manually added containers. Use SSH instead.

```bash
docker pull sudonate91/eve-data-aggregator:latest
# "Image is up to date" → nothing new
# "Pull complete" → new image downloaded, proceed:
docker stop eve-data-aggregator && docker rm eve-data-aggregator
```
Then Docker tab → **Add Container** → select saved template → **Apply**.

> The MySQL data volume (`eve-mysql-data`) is **not touched** by updates — all your data is safe.

**Optional alias (add to `/root/.bashrc`):**
```bash
alias update-eve="docker pull sudonate91/eve-data-aggregator:latest && docker stop eve-data-aggregator && docker rm eve-data-aggregator"
```

---

### Managing the Container

**View logs:**
```bash
docker logs eve-data-aggregator
# or: Docker tab → container icon → Log
```

**Edit configuration:**
Docker tab → container icon → **Edit** → change env vars → **Apply**

**Restart:**
```bash
docker restart eve-data-aggregator
```

---

## Database

MySQL 8.4 is **bundled inside the app container** — no separate MySQL container needed. On first boot, `bin/entrypoint.sh` automatically:
1. Initialises the MySQL data directory
2. Creates all 5 databases (`S0b`, `S0b_Struct`, `Ven0m`, `KryTek`, `S0b_Mart`)
3. Runs all schema scripts (tables, views, seed data)
4. Creates the `S0b_Admin` user with your `DB_PASSWORD`
5. Creates the `eve_readonly` PowerBI user
6. Starts MySQL, then starts Node

Data is stored in a named Docker volume `eve-mysql-data` — survives container removal and image updates.

### Port 3307 — connecting Workbench / TablePlus / PowerBI

MySQL is exposed on **host port 3307** (avoids conflict with any existing MySQL on 3306).

A read-only user `eve_readonly` is created on first boot for PowerBI and reporting tools.

| Setting | Value |
|---|---|
| Host | `<your-unraid-ip>` |
| Port | `3307` |
| Username | `eve_readonly` |
| Password | value of `MYSQL_READONLY_PASSWORD` (or `DB_PASSWORD` if blank) |

**PowerBI Desktop → Get Data → MySQL database:**
- Server: `<unraid-ip>:3307`
- Database: `S0b` (or whichever corp DB)
- Username: `eve_readonly`

For admin access, connect with user `root` and `MYSQL_ROOT_PASSWORD`.

---

### Migrating Existing Data

**Option A — Upload via the web UI (easiest):**
1. Open `https://<unraid-ip>:3000` → **Tab 2 — Data Migration**
2. Export all 5 schemas from your old MySQL (Workbench → Server → Data Export → single .sql file)
3. Upload the .sql file using the file picker
4. Watch the live progress output — import streams directly into MySQL
5. Switch to Tab 1 and authenticate corps

**Option B — Import via Workbench:**
1. Connect Workbench to `<unraid-ip>:3307` user `root` / `MYSQL_ROOT_PASSWORD`
2. Server → Data Import → select your .sql file → Start Import

**Option C — SSH on Unraid:**
```bash
docker exec -i eve-data-aggregator \
  mysql -u root -p"<root-password>" < eve-migration.sql
```

### Fresh Install (No Existing Data)

Nothing to do — schema is auto-created on first boot. Open the web UI, authenticate corps, done.

---

### Backup

```bash
# SSH on Unraid — dump all databases from the bundled MySQL
docker exec eve-data-aggregator \
  mysqldump -u root -p"<root-password>" \
  --databases S0b S0b_Struct Ven0m KryTek S0b_Mart \
  > eve-backup-$(date +%Y%m%d).sql
```

Or use Unraid's **CA Backup / Restore** plugin to back up the `eve-mysql-data` volume.

---

## Local Development

**Prerequisites:** Node.js 20.17.0, Docker Desktop

### EVE ESI App — Callback URL for local dev

Add `https://localhost:3000/callback` to your ESI application's callback URL list on [https://developers.eveonline.com/applications](https://developers.eveonline.com/applications).

You can have multiple callbacks — add both:
- `https://localhost:3000/callback` ← local dev
- `https://<unraid-ip>:3000/callback` ← Unraid/Docker

Then set in `.env`:
```
CALLBACK_URL=https://localhost:3000/callback
```

### First-time setup

```bash
git clone https://github.com/sudonate91/eve-data-aggregator.git
cd eve-data-aggregator
npm install
cp .env.dev .env
# Edit .env — add CLIENT_ID, corp IDs, and set CALLBACK_URL as above
```

---

### Mode A — Native Node + DB in Docker (recommended for active dev)

**Terminal 1 — start MySQL only:**
```bash
npm run db:dev
# MySQL on localhost:3307 — leave this terminal open
```

**Terminal 2 — run the app:**
```bash
npm run dev
# Auth server starts on https://localhost:3000
# Open that URL, accept the cert warning, authenticate corps
```

> **Browser cert warning** — the auth server uses a self-signed certificate. Click **Advanced → Proceed to localhost** (Chrome) or **Accept the Risk** (Firefox). This is expected and safe for local use.

**To wipe and reset the dev database:**
```bash
npm run db:dev:reset
```

---

### Mode B — Full stack in Docker Compose

```bash
npm run compose:dev
# Builds dev image, mounts source, starts MySQL sidecar + app
```

Edit files on your host — changes are live via volume mount. `npm run compose:down` to stop.

> In compose dev mode, `CALLBACK_URL` and `DB_HOST` are set via `docker-compose.dev.yml` — the app connects to `eve-mysql` internally but the auth server is still accessible at `https://localhost:3000` from your host.

---

### Dev vs Prod differences

| | Local dev | Unraid/Docker prod |
|---|---|---|
| MySQL | Separate sidecar (`mysql:8.4` image) | Bundled inside app image |
| `DB_HOST` | `127.0.0.1` (native) or `eve-mysql` (compose) | `127.0.0.1` (same container) |
| `CALLBACK_URL` | `https://localhost:3000/callback` | `https://<unraid-ip>:3000/callback` |
| Auth cert warning | Yes (self-signed) | Yes (self-signed) |
| Run interval | 5 min | 60 min |
| DB volume | `eve-mysql-dev-data` | `eve-mysql-data` |

---

### Workbench connection for local dev

| Setting | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `3307` |
| Username | `S0b_Admin` or `root` |
| Password | `devpassword` / `devroot` (from `.env.dev`) |

---

## Releasing a New Version

Version tags drive Docker image versioning. Always release from `main` after merging a PR.

```bash
git checkout main
git pull

# Choose based on change type:
npm run release:patch   # bug fix    → 1.0.0 → 1.0.1
npm run release:minor   # new feature → 1.0.1 → 1.1.0
npm run release:major   # breaking    → 1.1.0 → 2.0.0
```

This bumps `package.json`, creates a `vX.Y.Z` git tag, pushes to GitHub, and triggers the GitHub Action to build and push `sudonate91/eve-data-aggregator:X.Y.Z` + `latest` to Docker Hub.

---

## Troubleshooting

**EVE SSO error: `The redirect URL does not match`**
- The `CALLBACK_URL` env var must match **exactly** what is registered in your EVE ESI app (character for character — scheme, host, port, path, no trailing slash)
- Local dev: register `https://localhost:3000/callback`
- Unraid: register `https://<your-unraid-ip>:3000/callback`
- Both can be registered on the same ESI app — EVE allows multiple callbacks

**Browser shows `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` or cert error**
- The auth server uses a self-signed certificate — this is expected
- Chrome: click **Advanced → Proceed to localhost (unsafe)**
- Firefox: click **Advanced → Accept the Risk and Continue**
- Edge: click **Advanced → Continue to localhost (unsafe)**

**Container exits immediately**
- Ensure `USE_ENV_CONFIG=true` is set
- Check logs: `docker logs eve-data-aggregator`

**Database connection refused**
- Check MySQL started inside the container: `docker logs eve-data-aggregator | grep -i mysql`
- Bundled MySQL needs 10–20 seconds on first boot — wait for "MySQL is ready" in logs

**First boot takes a long time**
- Normal — MySQL initialises the data directory, runs all schema scripts, creates users
- Subsequent starts are fast (init is skipped when data volume already exists)

**Passwords appear blank in Unraid edit form**
- Normal — Unraid masks `Mask=true` fields in the UI
- Values are stored in `/boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator.xml`

**Token polling — "No token found" spam in logs**
- Fixed in latest version. If you see it, pull the latest image.

**ESI rate limit warnings in logs**
- The client automatically throttles — this is normal under heavy load
- If persistent: increase `RUN_INTERVAL_MINUTES` or disable some jobs

---

## Security

- Credentials are stored in Unraid's Docker template XML on the boot USB (`/boot/config/...`)
- Back up `/boot/config/plugins/dockerMan/templates-user/` regularly
- Container runs as non-root user (`nodejs`, uid 1001)
- `.env` is gitignored — never committed
