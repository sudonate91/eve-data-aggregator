# Setup Checklist

Complete guide to get your EVE Data Aggregator up and running.

## ✅ Pre-Deployment Checklist

### 1. Docker Hub Setup (Optional but Recommended)

- [ ] Create Docker Hub account at https://hub.docker.com
- [ ] Create repository: `eve-data-aggregator`
- [ ] Choose visibility: Public or Private
- [ ] Generate access token (Settings → Security)
- [ ] Add GitHub secrets:
  - [ ] `DOCKER_USERNAME` = `sudonate91`
  - [ ] `DOCKER_PASSWORD` = [your access token]
- [ ] Push code to trigger first build
- [ ] Verify image appears on Docker Hub

**See:** [DOCKER-HUB-SETUP.md](DOCKER-HUB-SETUP.md)

### 2. EVE Online ESI Application

- [ ] Go to https://developers.eveonline.com/applications
- [ ] Create new application
- [ ] Set callback URL: `https://localhost/callback/`
- [ ] Add scopes:
  - [ ] `esi-wallet.read_corporation_wallets.v1`
  - [ ] `esi-contracts.read_corporation_contracts.v1`
- [ ] Copy Client ID
- [ ] Get Corporation IDs from EVE Online

### 3. Database Setup

- [ ] MySQL/MariaDB server running
- [ ] Create databases:
  - [ ] `S0b` (main)
  - [ ] `S0b_Struct` (optional)
  - [ ] `Ven0m` (optional)
  - [ ] `KryTek` (optional)
  - [ ] `S0b_Mart` (optional)
- [ ] Create database user with permissions
- [ ] Test connection from your server

### 4. Configuration File

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required values:
  - [ ] `CLIENT_ID`
  - [ ] `CORPORATION_ID`
  - [ ] `DB_HOST` (use `127.0.0.1` for Unraid, `host.docker.internal` for Windows/Mac)
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
  - [ ] `DB_NAME`
- [ ] Set job configuration:
  - [ ] `USE_ENV_CONFIG=true`
  - [ ] `RUN_INTERVAL_MINUTES=60`
  - [ ] Enable desired jobs (`ENABLE_*=true`)

---

## 🚀 Installation Methods

Choose ONE method:

### Method 1: Docker Hub (Easiest)

- [ ] Pull image: `docker pull sudonate91/eve-data-aggregator:latest`
- [ ] Create `.env` file with configuration
- [ ] Run: `docker-compose -f docker-compose.hub.yml up -d`
- [ ] Check logs: `docker-compose logs -f`

### Method 2: Git + Docker

- [ ] Clone: `git clone https://github.com/sudonate91/eve-data-aggregator.git`
- [ ] Create `.env` file
- [ ] Build: `docker-compose build`
- [ ] Run: `docker-compose up -d`
- [ ] Check logs: `docker-compose logs -f`

### Method 3: Unraid

#### Using Docker Hub:
- [ ] Docker tab → Add Container
- [ ] Repository: `sudonate91/eve-data-aggregator:latest`
- [ ] Network: Host
- [ ] Extra Parameters: `-it`
- [ ] Add all environment variables via WebUI
- [ ] Apply

#### Using Git:
- [ ] SSH to Unraid
- [ ] Clone to `/mnt/user/appdata/eve-data-aggregator`
- [ ] Run: `bash build-for-unraid.sh`
- [ ] Add container via WebUI using template

**See:** [UNRAID.md](UNRAID.md) or [UNRAID-QUICKSTART.md](UNRAID-QUICKSTART.md)

---

## ✅ Post-Deployment Checklist

### 1. Verify Container is Running

```bash
# Check status
docker ps | grep eve-data-aggregator

# Should show: Up X minutes
```

### 2. Check Logs

```bash
# View logs
docker logs eve-data-aggregator

# Or with docker-compose
docker-compose logs -f
```

**Look for:**
- [ ] ✓ Database connections successful
- [ ] 📝 Using environment variable configuration
- [ ] Enabled jobs listed
- [ ] ⏱️ Run interval set
- [ ] 🔄 Jobs starting

### 3. Monitor First Run

Watch for:
- [ ] OAuth flow initiates
- [ ] ESI requests being made
- [ ] Error limit monitoring (`📊 Error Limit: X remaining`)
- [ ] Rate limit monitoring
- [ ] Data import success messages
- [ ] No critical errors

### 4. Verify Data in Database

```sql
-- Check if data was imported
SELECT COUNT(*) FROM journal_entries;
SELECT COUNT(*) FROM contracts;

-- Check recent entries
SELECT * FROM journal_entries ORDER BY date DESC LIMIT 10;
```

### 5. Monitor ESI Limits

Watch logs for:
- [ ] No `🚨 ERROR LIMITED` messages
- [ ] No excessive `⚠️ Rate limit low` warnings
- [ ] Error limit stays above 50

**If you see warnings:** Increase `RUN_INTERVAL_MINUTES` or disable some jobs.

---

## 🔧 Troubleshooting

### Container Exits Immediately

- [ ] Check logs: `docker logs eve-data-aggregator`
- [ ] Verify `.env` file exists and is complete
- [ ] Check database connection settings
- [ ] Ensure `USE_ENV_CONFIG=true`

### Database Connection Failed

- [ ] Verify database is running
- [ ] Check `DB_HOST` setting:
  - Unraid/Linux: `127.0.0.1` or `localhost`
  - Windows/Mac: `host.docker.internal`
- [ ] Test connection: `mysql -h DB_HOST -u DB_USER -p`
- [ ] Check firewall rules
- [ ] Verify database user permissions

### OAuth Errors

- [ ] Verify `CLIENT_ID` is correct
- [ ] Check `CALLBACK_URL` matches ESI app
- [ ] Verify scopes are correct
- [ ] Check corporation ID is valid

### ESI Rate Limiting

- [ ] Increase `RUN_INTERVAL_MINUTES`
- [ ] Disable some jobs
- [ ] Check for error messages in logs
- [ ] Verify User-Agent is set in `esiClient.mjs`

### No Jobs Running

- [ ] Check `USE_ENV_CONFIG=true`
- [ ] Verify at least one `ENABLE_*=true`
- [ ] Check logs for job selection output
- [ ] Ensure container has `-it` flags (interactive mode)

---

## 📊 Monitoring & Maintenance

### Daily Checks

- [ ] Check container is running: `docker ps`
- [ ] Review logs for errors
- [ ] Monitor error limit warnings

### Weekly Checks

- [ ] Verify data is being imported
- [ ] Check database size/growth
- [ ] Review ESI limit usage
- [ ] Check for application updates

### Monthly Checks

- [ ] Update to latest image: `docker pull sudonate91/eve-data-aggregator:latest`
- [ ] Review and optimize job configuration
- [ ] Check database performance
- [ ] Backup database

### Update Process

**Docker Hub:**
```bash
docker pull sudonate91/eve-data-aggregator:latest
docker-compose down
docker-compose up -d
```

**Git:**
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 📚 Additional Resources

- [INSTALL.md](INSTALL.md) - Installation guide
- [DOCKER.md](DOCKER.md) - Docker details
- [UNRAID.md](UNRAID.md) - Unraid deployment
- [DOCKER-HUB-SETUP.md](DOCKER-HUB-SETUP.md) - Publishing to Docker Hub
- [ESI-UPDATES-COMPLETE.md](ESI-UPDATES-COMPLETE.md) - ESI error handling
- [.env.example](.env.example) - Configuration template

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Container runs without errors
- [ ] Database connections successful
- [ ] Jobs execute and complete successfully
- [ ] Data appears in database
- [ ] ESI limits are being respected
- [ ] Logs show no critical warnings
- [ ] Scheduled interval is working
- [ ] Monitoring is in place

**Congratulations! Your EVE Data Aggregator is ready!** 🎉
