# Quick Start Guide

Get your EVE Data Aggregator running in 5 minutes!

## 🚀 Fastest Method: Docker Hub

### Step 1: Create `.env` File

```bash
# Download the example
curl -O https://raw.githubusercontent.com/sudonate91/eve-data-aggregator/main/.env.example

# Copy and edit
cp .env.example .env
nano .env  # or use your preferred editor
```

### Step 2: Run the Container

```bash
docker run -d \
  --name eve-data-aggregator \
  --env-file .env \
  --network host \
  -it \
  --restart unless-stopped \
  sudonate91/eve-data-aggregator:latest
```

### Step 3: Check Logs

```bash
docker logs -f eve-data-aggregator
```

**Done!** Your data aggregator is running.

---

## 📦 Alternative: Git Clone

### Step 1: Clone Repository

```bash
git clone https://github.com/sudonate91/eve-data-aggregator.git
cd eve-data-aggregator
```

### Step 2: Configure

```bash
cp .env.example .env
nano .env  # Edit with your settings
```

### Step 3: Run

```bash
docker-compose up -d
docker-compose logs -f
```

---

## 🖥️ Unraid Users

### Using Docker Hub (Easiest)

1. **Docker** tab → **Add Container**
2. **Repository:** `sudonate91/eve-data-aggregator:latest`
3. **Network:** `Host`
4. **Extra Parameters:** `-it`
5. Add environment variables via WebUI
6. **Apply**

See [UNRAID-QUICKSTART.md](UNRAID-QUICKSTART.md) for details.

---

## ⚙️ Minimum Required Configuration

Your `.env` file needs at minimum:

```bash
# EVE Online
CLIENT_ID=your-esi-client-id
CORPORATION_ID=your-corporation-id

# Database
DB_HOST=127.0.0.1
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=S0b

# Mode
USE_ENV_CONFIG=true
RUN_INTERVAL_MINUTES=60

# Enable at least one job
ENABLE_S0B_WALLET=true
```

---

## 📊 What to Expect

After starting, you'll see:

```
  _____                    ____            _                  _                                                    _
 | ____|_   _____         |  _ \  __ _  __| | __ _           / \   __ _  __ _ _ __ ___  __ _  __ _  ___  _ __   | |
 |  _| \ \ / / _ \        | | | |/ _` |/ _` |/ _` |         / _ \ / _` |/ _` | '__/ _ \/ _` |/ _` |/ _ \| '_ \  | |
 | |___ \ V /  __/        | |_| | (_| | (_| | (_| |        / ___ \ (_| | (_| | | |  __/ (_| | (_| | (_) | | | | |_|
 |_____| \_/ \___|        |____/ \__,_|\__,_|\__,_|       /_/   \_\__, |\__, |_|  \___|\__, |\__,_|\___/|_| |_| (_)
                                                                    |___/ |___/         |___/

✓ Database connection to S0b has been established successfully.
⏱️  Run interval set to 60 minutes
📝 Using environment variable configuration...

Enabled jobs:
  ✓ S0b Holdings Wallet Import

🔄 Starting S0b Holdings wallet import...
```

---

## 🆘 Need Help?

- **Full Installation Guide:** [INSTALL.md](INSTALL.md)
- **Setup Checklist:** [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md)
- **Docker Details:** [DOCKER.md](DOCKER.md)
- **Unraid Guide:** [UNRAID.md](UNRAID.md)
- **Troubleshooting:** Check logs with `docker logs eve-data-aggregator`

---

## 🔄 Updating

**Docker Hub:**
```bash
docker pull sudonate91/eve-data-aggregator:latest
docker stop eve-data-aggregator
docker rm eve-data-aggregator
# Run the docker run command again
```

**Git:**
```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

**That's it! You're up and running!** 🎉
