# Unraid Deployment Guide

The image is hosted on Docker Hub at `sudonate91/eve-data-aggregator:latest` and updated automatically via GitHub Actions on every push to `main`. No file transfers or local builds required.

## Prerequisites

- Unraid 6.9.0 or later
- MySQL/MariaDB running on Unraid (or accessible from it)
- EVE Online ESI application credentials

---

## First-Time Installation

### Step 1: Pull the image

SSH into Unraid and run:

```bash
docker pull sudonate91/eve-data-aggregator:latest
```

### Step 2: Add the container via WebUI

1. Go to **Docker** tab → **Add Container**
2. Set **Repository** to:
   ```
   sudonate91/eve-data-aggregator:latest
   ```
3. Set **Network Type** to `Host`
4. Set **Extra Parameters** to `-it`
5. Add the following environment variables:

| Variable | Description | Required |
|---|---|---|
| `CLIENT_ID` | EVE ESI application Client ID | Yes |
| `CALLBACK_URL` | OAuth callback URL (must match ESI app) | Yes |
| `SCOPE` | ESI scopes (space-separated) | Yes |
| `STATE` | OAuth state string | Yes |
| `CORPORATION_ID` | Main corporation ID | Yes |
| `STRUCT_CORPORATION_ID` | Structure management corp ID | No |
| `VEN0M_CORPORATION_ID` | Ven0m corp ID | No |
| `KRYTEK_CORPORATION_ID` | KryTek corp ID | No |
| `S0B_MART_CORPORATION_ID` | S0b-Mart corp ID | No |
| `JANICE_API_KEY` | Janice API key for item pricing | No |
| `DB_HOST` | MySQL host IP | Yes |
| `DB_USER` | MySQL username | Yes |
| `DB_PASSWORD` | MySQL password | Yes |
| `DB_NAME` | Main database name | Yes |
| `S0b_STRUCT_DB_NAME` | Struct database name | No |
| `VEN0M_DB_NAME` | Ven0m database name | No |
| `KRYTEK_DB_NAME` | KryTek database name | No |
| `S0B_MART_DB_NAME` | S0b-Mart database name | No |
| `USE_ENV_CONFIG` | Set to `true` (required for non-interactive mode) | Yes |
| `RUN_INTERVAL_MINUTES` | How often to run jobs in minutes (default: `60`) | No |
| `ENABLE_S0B_WALLET` | Enable S0b Holdings wallet import | No |
| `ENABLE_S0B_STRUCT_WALLET` | Enable S0b Struct wallet import | No |
| `ENABLE_VEN0M_WALLET` | Enable Ven0m wallet import | No |
| `ENABLE_KRYTEK_WALLET` | Enable KryTek wallet import | No |
| `ENABLE_S0B_MART_WALLET` | Enable S0b-Mart wallet import | No |
| `ENABLE_S0B_STRUCT_CONTRACTS` | Enable S0b Struct contracts import | No |

6. Click **Apply**

> **DB_HOST note:** The container uses host networking, so `localhost` / `127.0.0.1` will reach services running on the Unraid host directly.

---

## Updating to a New Version

When a new version is pushed to `main`, GitHub Actions automatically builds and pushes a new image to Docker Hub.

### Option A: Unraid WebUI (easiest)

1. Docker tab → find `eve-data-aggregator`
2. Click **Check for Updates** (or wait for Unraid's scheduled check)
3. When an update is available, click **Update**

All your saved environment variables are preserved automatically.

### Option B: SSH

```bash
docker pull sudonate91/eve-data-aggregator:latest
docker stop eve-data-aggregator
docker rm eve-data-aggregator
```

Then recreate the container from the WebUI — your saved template values will pre-populate.

---

## Managing the Container

### View Logs
```bash
docker logs eve-data-aggregator
```
Or: Docker tab → container icon → **Log**

### Edit Configuration
1. Docker tab → container icon → **Edit**
2. Change any environment variables
3. Click **Apply** — container recreates with new values, image unchanged

### Restart
```bash
docker restart eve-data-aggregator
```

---

## Troubleshooting

### "Not available" on Check for Updates
The image was built locally and has no Docker Hub digest. Fix:
```bash
docker pull sudonate91/eve-data-aggregator:latest
```
Then stop/remove the old container and re-add it from the WebUI.

### Database Connection Refused
- Confirm MySQL is running and accessible: `netstat -tlnp | grep 3306`
- Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD` in the container's environment
- Host networking mode means `127.0.0.1` reaches the Unraid host

### Container Exits Immediately
- Ensure `USE_ENV_CONFIG=true` is set — without it the app waits for interactive input and exits
- Check logs: `docker logs eve-data-aggregator`

### Passwords Appear Blank in Edit Form
This is normal — Unraid masks fields with `Mask=true` in the template. The values are stored in:
```
/boot/config/plugins/dockerMan/templates-user/my-eve-data-aggregator.xml
```
The container uses the correct values even when the form shows them blank.

---

## Security

- Credentials are stored in Unraid's Docker template XML on the boot USB
- Back up `/boot/config/plugins/dockerMan/templates-user/` regularly
- The container runs as a non-root user (`nodejs`, uid 1001)
