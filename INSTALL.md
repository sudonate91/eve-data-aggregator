# Installation Guide

## Installation Methods

Choose the method that works best for you:

1. **[Docker Hub](#option-1-docker-hub-recommended)** - Pull pre-built image (easiest)
2. **[Git + Docker Compose](#option-2-git--docker-compose)** - Clone and build locally
3. **[Unraid](#option-3-unraid)** - Deploy on Unraid server

---

## Option 1: Docker Hub (Recommended)

Pull the pre-built image from Docker Hub:

### Public Repository
```bash
docker pull sudonate91/eve-data-aggregator:latest
```

### Private Repository (if made private)
```bash
# Login to Docker Hub
docker login

# Pull the image
docker pull sudonate91/eve-data-aggregator:latest
```

### Run with Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  eve-data-aggregator:
    image: sudonate91/eve-data-aggregator:latest
    container_name: eve-data-aggregator
    env_file: .env
    network_mode: "host"
    stdin_open: true
    tty: true
    restart: unless-stopped
```

Create your `.env` file (copy from `.env.example`), then:

```bash
docker-compose up -d
```

---

## Option 2: Git + Docker Compose

Clone the repository and build locally:

### Step 1: Clone Repository

```bash
git clone https://github.com/sudonate91/eve-data-aggregator.git
cd eve-data-aggregator
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
nano .env  # or use your preferred editor
```

### Step 3: Build and Run

```bash
# Build the image
docker-compose build

# Run the container
docker-compose up -d

# View logs
docker-compose logs -f
```

### Update to Latest Version

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Option 3: Unraid

See [UNRAID.md](UNRAID.md) for detailed Unraid deployment instructions.

### Quick Unraid Setup

#### Using Docker Hub Image (Easiest)

1. Go to **Docker** tab in Unraid WebUI
2. Click **Add Container**
3. Configure:
   - **Name:** `eve-data-aggregator`
   - **Repository:** `sudonate91/eve-data-aggregator:latest`
   - **Network Type:** `Host`
   - **Console shell command:** `sh`
   - **Extra Parameters:** `-it`
4. Add environment variables (see [UNRAID-QUICKSTART.md](UNRAID-QUICKSTART.md))
5. Click **Apply**

#### Using Git on Unraid

1. SSH to Unraid
2. Clone repository:
   ```bash
   cd /mnt/user/appdata
   git clone https://github.com/sudonate91/eve-data-aggregator.git
   cd eve-data-aggregator
   ```
3. Build image:
   ```bash
   bash build-for-unraid.sh
   ```
4. Add container via WebUI using template

---

## Configuration

All methods use the same environment variable configuration:

### Required Variables

```bash
# EVE Online ESI API
CLIENT_ID=your-client-id
CALLBACK_URL=https://localhost/callback/
SCOPE="esi-wallet.read_corporation_wallets.v1 esi-contracts.read_corporation_contracts.v1"
CORPORATION_ID=your-corporation-id

# Database
DB_HOST=127.0.0.1  # Use host.docker.internal on Windows/Mac
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=S0b

# Non-Interactive Mode
USE_ENV_CONFIG=true
RUN_INTERVAL_MINUTES=60

# Enable Jobs
ENABLE_S0B_WALLET=true
ENABLE_S0B_STRUCT_WALLET=false
# ... see .env.example for all options
```

See [.env.example](.env.example) for complete configuration options.

---

## Docker Hub Publishing (For Maintainers)

### Setup GitHub Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub access token

### Automatic Builds

Images are automatically built and pushed on:
- Push to `main` or `dockerize` branch
- New version tags (e.g., `v1.0.0`)
- Manual workflow dispatch

### Available Tags

- `latest` - Latest stable build from main branch
- `dockerize` - Latest build from dockerize branch
- `v1.0.0` - Specific version tags
- `main-abc123` - Commit SHA tags

### Make Repository Private

To make the Docker Hub repository private:

1. Go to [Docker Hub](https://hub.docker.com)
2. Navigate to your repository
3. **Settings** → **Visibility** → **Private**
4. Users will need to `docker login` before pulling

---

## Updating

### Docker Hub Image

```bash
docker pull sudonate91/eve-data-aggregator:latest
docker-compose down
docker-compose up -d
```

### Git Installation

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Unraid

**Docker Hub:**
1. Docker tab → Container → **Force Update**

**Git:**
```bash
cd /mnt/user/appdata/eve-data-aggregator
git pull
docker build -t eve-data-aggregator:latest .
# Recreate container in WebUI
```

---

## Troubleshooting

### Docker Hub Login Issues

```bash
# Create access token at https://hub.docker.com/settings/security
docker login -u sudonate91
# Enter access token as password
```

### Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Network Issues

- **Unraid/Linux:** Use `network_mode: "host"` and `DB_HOST=127.0.0.1`
- **Windows/Mac:** Use bridge network and `DB_HOST=host.docker.internal`

### Image Not Found

```bash
# Verify image exists
docker images | grep eve-data-aggregator

# Pull latest
docker pull sudonate91/eve-data-aggregator:latest
```

---

## Support

- **Issues:** [GitHub Issues](https://github.com/sudonate91/eve-data-aggregator/issues)
- **Documentation:** See [README.md](README.md), [DOCKER.md](DOCKER.md), [UNRAID.md](UNRAID.md)
- **ESI Best Practices:** [ESI-UPDATES-COMPLETE.md](ESI-UPDATES-COMPLETE.md)
