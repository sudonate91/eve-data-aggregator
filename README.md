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

The image is hosted on Docker Hub at `sudonate91/eve-data-aggregator:v2` (all-in-one with MySQL) and updated automatically via GitHub Actions on every push to `main`.

> **⚠️ Version Note:** The `v2` tag includes built-in MySQL. Use `latest` for the legacy version that requires an external database.

### First-Time Installation

**1. Install the template:**
```bash
curl -o /boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator-v2.xml \
  https://raw.githubusercontent.com/sudonate91/eve-data-aggregator/main/unraid-template.xml
```

**2. Add the container via WebUI:**
1. Docker tab → **Add Container**
2. Select `eve-data-aggregator-v2` from the user templates dropdown
3. Fill in the required fields:

| Variable | Description | Required |
|---|---|---|
| `CLIENT_ID` | EVE ESI application Client ID | ✅ Yes |
| `CALLBACK_URL` | OAuth callback URL (must match ESI app) | ✅ Yes |
| `SCOPE` | ESI scopes (space-separated) | ✅ Yes |
| `STATE` | OAuth state string | ✅ Yes |
| `CORPORATION_ID` | S0b Holdings corporation ID | ✅ Yes |
| `STRUCT_CORPORATION_ID` | S0b Structure Management corp ID | ❌ Optional |
| `VEN0M_CORPORATION_ID` | Ven0m corp ID | ❌ Optional |
| `KRYTEK_CORPORATION_ID` | KryTek corp ID | ❌ Optional |
| `S0B_MART_CORPORATION_ID` | S0b-Mart corp ID | ❌ Optional |
| `JANICE_API_KEY` | Janice API key for Skyhook pricing | ❌ Optional |
| `DB_USER` | MySQL username (default: `S0b_Admin`) | ✅ Yes |
| `DB_PASSWORD` | MySQL password | ✅ Yes |
| `DB_NAME` | Main database name (`S0b`) | ✅ Yes |
| `S0b_STRUCT_DB_NAME` | Struct database name | ❌ Optional |
| `VEN0M_DB_NAME` | Ven0m database name | ❌ Optional |
| `KRYTEK_DB_NAME` | KryTek database name | ❌ Optional |
| `S0B_MART_DB_NAME` | S0b-Mart database name | ❌ Optional |
| `USE_ENV_CONFIG` | Must be `true` for non-interactive mode | ✅ Yes |
| `RUN_INTERVAL_MINUTES` | How often to run (default: `60`) | ❌ Optional |
| `ENABLE_S0B_WALLET` | Enable S0b Holdings wallet | ❌ Optional |
| `ENABLE_S0B_STRUCT_WALLET` | Enable Struct wallet | ❌ Optional |
| `ENABLE_VEN0M_WALLET` | Enable Ven0m wallet | ❌ Optional |
| `ENABLE_KRYTEK_WALLET` | Enable KryTek wallet | ❌ Optional |
| `ENABLE_S0B_MART_WALLET` | Enable S0b-Mart wallet | ❌ Optional |
| `ENABLE_S0B_STRUCT_CONTRACTS` | Enable Struct contracts | ❌ Optional |
| `MySQL Data` | Persistent storage path | ✅ Yes |

4. Click **Apply**

> **v2 Container Features:**
> - Built-in MySQL server (no external database needed)
> - MySQL exposed on host port `3307` for external tools (Power BI, etc.)
> - Web UI on port `3000` for OAuth callback
> - Persistent data stored in configured `MySQL Data` path

---

### Updating on Unraid

**Check if a new image is available:**
```bash
docker pull sudonate91/eve-data-aggregator:v2
# "Image is up to date" → nothing new
# "Pull complete" → new image downloaded, proceed below
```

**Update the container:**
```bash
docker stop eve-data-aggregator-v2
docker rm eve-data-aggregator-v2
```
Then in Unraid WebUI → Docker tab → **Add Container** → select the saved template → **Apply**.
Your environment variable values are stored in the template XML and will pre-populate automatically.

**Optional alias for quick cleanup (add to `/root/.bashrc`):**
```bash
alias update-eve="docker pull sudonate91/eve-data-aggregator:v2 && docker stop eve-data-aggregator-v2 && docker rm eve-data-aggregator-v2"
```
Then just run `update-eve`, followed by recreating via WebUI.

> **Note:** `docker restart` does NOT pick up a new image — the container must be removed and recreated.

---

### Managing the Container

**View logs:**
```bash
docker logs eve-data-aggregator-v2
# or: Docker tab → container icon → Log
```

**Access MySQL from external tools (Power BI, etc.):**
- **Host:** Your Unraid IP (`192.168.1.23` or similar)
- **Port:** `3307` (configured in template)
- **User/Password:** As configured in environment variables

**Edit configuration:**
Docker tab → container icon → **Edit** → change env vars → **Apply**

**Restart:**
```bash
docker restart eve-data-aggregator-v2
```

---

### Docker Compose (Non-Unraid)

For Docker deployments outside Unraid:

```bash
# Using the hub image (production)
docker compose -f docker-compose.hub.yml up

# Or build locally
docker compose up --build
```

---

## Running Locally (Development)

### Prerequisites

- **Node.js:** `v20.17.0` (specified in `.nvmrc` — use `nvm use` to switch)
- **npm:** `10.8.3`
- **MySQL:** 8.0+ (optional — can use Docker for local MySQL)

### Quick Start

```bash
git clone https://github.com/sudonate91/eve-data-aggregator.git
cd eve-data-aggregator
nvm use              # if using nvm
npm install

# Setup your local dev environment
cp .env.local.example .env.local
# Edit .env.local with your ESI credentials

# Terminal 1: Start the dev database
npm run dev:db

# Terminal 2: Run the app
npm run dev
```

### Environment File Strategy (No More Context Switching)

Each deployment context has its own env file — no editing required:

| File | Use Case | Loaded By |
|---|---|---|
| `.env.local` | Local native development (Node directly) | `npm run dev` |
| `.env` | Production / Unraid / General fallback | `npm start` |

**The workflow:**
1. Configure `.env.local` once for your local dev setup (localhost:3307)
2. Configure `.env` for production/Unraid if needed
3. Use `npm run dev` — it automatically loads `.env.local`
4. Use `npm start` — it loads `.env`

### Local Development Options

**Option 1: Native Node.js (Recommended)**

Fastest iteration — edit code, run `npm run dev`, no rebuilds:

```bash
# Terminal 1 — Start MySQL in Docker
npm run dev:db

# Terminal 2 — Run app locally
npm run dev

# When done — Stop MySQL
npm run dev:db:reset    # or just Ctrl+C in Terminal 1
```

**Option 2: Docker Compose (Everything in Containers)**

Useful for testing the full containerized setup:

```bash
# Start both MySQL + App
npm run dev:compose

# Stop everything
npm run dev:compose:down
```

### Dev vs Production Differences

| Aspect | Local Dev | Production/Unraid |
|---|---|---|
| **MySQL Port** | `3307` (avoids conflicts) | `3306` or `3307` (v2 container) |
| **DB Host** | `127.0.0.1` | `127.0.0.1` or `eve-mysql` |
| **App Runner** | Native Node.js | Docker container |
| **Code Updates** | Instant (no rebuild) | Requires container restart |
| **Data Volume** | `eve-mysql-dev-data` | Persistent host path |

### Available npm Scripts

```bash
# Development (uses .env.local)
npm run dev              # Run app locally with Node
npm run dev:db           # Start dev MySQL (port 3307)
npm run dev:db:reset     # Wipe dev MySQL and restart fresh
npm run dev:compose      # Start MySQL + App in Docker
npm run dev:compose:down # Stop Docker compose

# Production (uses .env)
npm start                # Run with .env (production config)
```

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

**Container exits immediately**
- Ensure `USE_ENV_CONFIG=true` is set — without it the app waits for interactive input and exits
- Check logs: `docker logs eve-data-aggregator-v2`
- For v2: Verify MySQL data directory has correct permissions

**Database connection refused (Legacy `latest` tag only)**
- Confirm MySQL is running: `netstat -tlnp | grep 3306`
- Verify `DB_HOST=127.0.0.1` (host networking means this reaches the Unraid host)

**Cannot connect to v2 MySQL from external tools**
- Verify port `3307` is not blocked by firewall
- Check that `MySQL Data` path is correctly mounted and persistent
- Try connecting from the Unraid host first: `mysql -h 127.0.0.1 -P 3307 -u USER -p`

**Passwords appear blank in Unraid edit form**
- Normal behaviour — Unraid masks `Mask=true` fields in the UI
- Values are correctly stored in `/boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator-v2.xml`

**"Check for Updates" shows "not available"**
- Use `docker pull` to check manually — see update instructions above
- Unraid's update checker is unreliable for manually added containers

**ESI rate limit warnings in logs**
- The client automatically throttles and pauses when limits are low
- If persistent: increase `RUN_INTERVAL_MINUTES` or disable some jobs

**OAuth callback fails**
- Ensure `CALLBACK_URL` matches exactly what's configured in your EVE ESI application
- For Unraid: Use `http://YOUR_UNRAID_IP:3000/callback` format
- Verify port `3000` is not in use by another container

---

## Security

- Credentials are stored in Unraid's Docker template XML on the boot USB (`/boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator-v2.xml`)
- Back up `/boot/config/plugins/dockerMan/templates-user/` regularly
- Container runs as non-root user (`nodejs`, uid 1001)
- MySQL root password is auto-generated on first run if not provided
- `.env` is gitignored — never committed

### Read-Only User (Auto-Created)

The app automatically creates an `eve_readonly` user on startup for PowerBI/reporting tools:

- **Username:** `eve_readonly`
- **Password:** Set via `MYSQL_READONLY_PASSWORD` env var (defaults to `DB_PASSWORD`)
- **Privileges:** `SELECT` only on all corporation databases
- **Connection:** Same host/port as main database (port 3307 for dev, 3306/3307 for Unraid)

This happens automatically every time the app starts — no manual SQL required, even on fresh databases.
