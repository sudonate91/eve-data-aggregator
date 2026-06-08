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

The image is hosted on Docker Hub at `sudonate91/eve-data-aggregator:latest` and updated automatically via GitHub Actions on every push to `main`.

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

| Variable | Description |
|---|---|
| `CLIENT_ID` | EVE ESI application Client ID |
| `CALLBACK_URL` | OAuth callback URL (must match ESI app) |
| `SCOPE` | ESI scopes (space-separated) |
| `STATE` | OAuth state string |
| `CORPORATION_ID` | S0b Holdings corporation ID |
| `STRUCT_CORPORATION_ID` | S0b Structure Management corp ID |
| `VEN0M_CORPORATION_ID` | Ven0m corp ID |
| `KRYTEK_CORPORATION_ID` | KryTek corp ID |
| `S0B_MART_CORPORATION_ID` | S0b-Mart corp ID |
| `JANICE_API_KEY` | Janice API key for Skyhook pricing |
| `DB_HOST` | MySQL host — use `127.0.0.1` for Unraid host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Main database name (`S0b`) |
| `S0b_STRUCT_DB_NAME` | Struct database name (`S0b_Struct`) |
| `VEN0M_DB_NAME` | Ven0m database name |
| `KRYTEK_DB_NAME` | KryTek database name |
| `S0B_MART_DB_NAME` | S0b-Mart database name |
| `USE_ENV_CONFIG` | Must be `true` for non-interactive mode |
| `RUN_INTERVAL_MINUTES` | How often to run (default: `60`) |
| `ENABLE_S0B_WALLET` | `true` to enable S0b Holdings wallet import |
| `ENABLE_S0B_STRUCT_WALLET` | `true` to enable Struct wallet import |
| `ENABLE_VEN0M_WALLET` | `true` to enable Ven0m wallet import |
| `ENABLE_KRYTEK_WALLET` | `true` to enable KryTek wallet import |
| `ENABLE_S0B_MART_WALLET` | `true` to enable S0b-Mart wallet import |
| `ENABLE_S0B_STRUCT_CONTRACTS` | `true` to enable Struct contracts import |

4. Click **Apply**

> **DB_HOST note:** Container uses host networking — `127.0.0.1` reaches MySQL running on the Unraid host directly.

---

### Updating on Unraid

> Unraid's built-in "Check for Updates" does not reliably detect updates for manually added containers. Use SSH instead.

**Check if a new image is available:**
```bash
docker pull sudonate91/eve-data-aggregator:latest
# "Image is up to date" → nothing new
# "Pull complete" → new image downloaded, proceed below
```

**Update the container:**
```bash
docker stop eve-data-aggregator
docker rm eve-data-aggregator
```
Then in Unraid WebUI → Docker tab → **Add Container** → select the saved template → **Apply**.
Your environment variable values are stored in the template XML and will pre-populate automatically.

**Optional alias for quick cleanup (add to `/root/.bashrc`):**
```bash
alias update-eve="docker pull sudonate91/eve-data-aggregator:latest && docker stop eve-data-aggregator && docker rm eve-data-aggregator"
```
Then just run `update-eve`, followed by recreating via WebUI.

> **Note:** `docker restart` does NOT pick up a new image — the container must be removed and recreated.

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

## Running Locally (Development)

**Prerequisites:** Node.js 20.17.0, npm 10.8.3, MySQL

```bash
git clone https://github.com/sudonate91/eve-data-aggregator.git
cd eve-data-aggregator
npm install
cp .env.example .env
# Edit .env with your credentials
node bin/index.mjs
```

Or with Docker Compose (builds locally):
```bash
docker compose up --build
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
- Check logs: `docker logs eve-data-aggregator`

**Database connection refused**
- Confirm MySQL is running: `netstat -tlnp | grep 3306`
- Verify `DB_HOST=127.0.0.1` (host networking means this reaches the Unraid host)

**Passwords appear blank in Unraid edit form**
- Normal behaviour — Unraid masks `Mask=true` fields in the UI
- Values are correctly stored in `/boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator.xml`

**"Check for Updates" shows "not available"**
- Use `docker pull` to check manually — see update instructions above
- Unraid's update checker is unreliable for manually added containers

**ESI rate limit warnings in logs**
- The client automatically throttles and pauses when limits are low
- If persistent: increase `RUN_INTERVAL_MINUTES` or disable some jobs

---

## Security

- Credentials are stored in Unraid's Docker template XML on the boot USB (`/boot/config/...`)
- Back up `/boot/config/plugins/dockerMan/templates-user/` regularly
- Container runs as non-root user (`nodejs`, uid 1001)
- `.env` is gitignored — never committed
