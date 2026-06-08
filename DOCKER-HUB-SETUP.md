# Docker Hub Setup Guide

This guide explains how to publish your EVE Data Aggregator to Docker Hub (public or private).

## Prerequisites

1. Docker Hub account ([Sign up here](https://hub.docker.com/signup))
2. GitHub repository with the code
3. Access to repository settings

---

## Step 1: Create Docker Hub Repository

### Option A: Via Docker Hub Website

1. Go to [Docker Hub](https://hub.docker.com)
2. Click **Repositories** → **Create Repository**
3. Configure:
   - **Name:** `eve-data-aggregator`
   - **Visibility:** 
     - **Public** - Anyone can pull (free)
     - **Private** - Only you can pull (requires subscription or free private repo)
   - **Description:** EVE Online Data Aggregator - Import wallet and contract data
4. Click **Create**

### Option B: Via Docker CLI

```bash
# Repository is created automatically on first push
docker tag eve-data-aggregator:latest sudonate91/eve-data-aggregator:latest
docker push sudonate91/eve-data-aggregator:latest
```

---

## Step 2: Create Docker Hub Access Token

**Important:** Use access tokens instead of your password for better security.

1. Go to [Account Settings → Security](https://hub.docker.com/settings/security)
2. Click **New Access Token**
3. Configure:
   - **Description:** `GitHub Actions - eve-data-aggregato`
   - **Access permissions:** `Read, Write, Delete`
4. Click **Generate**
5. **Copy the token** (you won't see it again!)

---

## Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

**Secret 1:**
- **Name:** `DOCKER_USERNAME`
- **Value:** `sudonate91` (your Docker Hub username)

**Secret 2:**
- **Name:** `DOCKER_PASSWORD`
- **Value:** `[paste your access token]`

---

## Step 4: Enable GitHub Actions

The workflow file `.github/workflows/docker-publish.yml` is already configured.

### Automatic Builds Trigger On:

- ✅ Push to `main` branch → builds `latest` tag
- ✅ Push to `dockerize` branch → builds `dockerize` tag
- ✅ New version tag (e.g., `v1.0.0`) → builds version tags
- ✅ Manual trigger via Actions tab

### Test the Workflow

1. Go to **Actions** tab in GitHub
2. Select **Build and Push Docker Image**
3. Click **Run workflow**
4. Select branch (e.g., `dockerize`)
5. Click **Run workflow**

Monitor the build progress. Once complete, your image will be on Docker Hub!

---

## Step 5: Verify Image on Docker Hub

1. Go to [Docker Hub](https://hub.docker.com/r/sudonate91/eve-data-aggregator)
2. You should see your image with tags:
   - `latest`
   - `dockerize`
   - `main-abc123` (commit SHA)

---

## Using Your Docker Hub Image

### Pull the Image

**Public repository:**
```bash
docker pull sudonate91/eve-data-aggregator:latest
```

**Private repository:**
```bash
# Login first
docker login
# Username: sudonate91
# Password: [your access token or password]

# Then pull
docker pull sudonate91/eve-data-aggregator:latest
```

### Run with Docker Compose

Use the provided `docker-compose.hub.yml`:

```bash
# Copy your environment file
cp .env.example .env
# Edit .env with your configuration

# Run using Docker Hub image
docker-compose -f docker-compose.hub.yml up -d

# View logs
docker-compose -f docker-compose.hub.yml logs -f
```

Or rename it:
```bash
mv docker-compose.hub.yml docker-compose.yml
docker-compose up -d
```

---

## Making Repository Private

### Why Make It Private?

- Keep your application code/configuration private
- Control who can access your images
- Suitable for proprietary or sensitive applications

### How to Make Private

1. Go to [Docker Hub](https://hub.docker.com/r/sudonate91/eve-data-aggregator)
2. Click **Settings**
3. Under **Visibility**, select **Private**
4. Click **Save**

**Note:** Free Docker Hub accounts get 1 private repository. For more, you need a paid plan.

### Using Private Images

Users must authenticate before pulling:

```bash
docker login
# Username: sudonate91
# Password: [access token]

docker pull sudonate91/eve-data-aggregator:latest
```

---

## Versioning Strategy

### Semantic Versioning

Use git tags for version releases:

```bash
# Create a version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This automatically builds and pushes:
- `sudonate91/eve-data-aggregator:v1.0.0`
- `sudonate91/eve-data-aggregator:1.0`
- `sudonate91/eve-data-aggregator:1`
- `sudonate91/eve-data-aggregator:latest` (if on main branch)

### Tag Strategy

- `latest` - Latest stable release from main branch
- `v1.0.0` - Specific version
- `1.0` - Minor version (auto-updates patch versions)
- `1` - Major version (auto-updates minor/patch)
- `dockerize` - Development branch
- `main-abc123` - Specific commit

---

## Multi-Platform Builds

The workflow builds for both:
- `linux/amd64` - Standard x86_64 (most servers)
- `linux/arm64` - ARM64 (Raspberry Pi, Apple Silicon)

Users on any platform can pull the same image tag, and Docker automatically selects the correct architecture.

---

## Updating Your Image

### Automatic Updates (Recommended)

Just push to your repository:

```bash
git add .
git commit -m "Update feature"
git push origin dockerize  # or main
```

GitHub Actions automatically builds and pushes the new image.

### Manual Build and Push

```bash
# Build locally
docker build -t sudonate91/eve-data-aggregator:latest .

# Login to Docker Hub
docker login

# Push
docker push sudonate91/eve-data-aggregator:latest
```

---

## Unraid Integration

### Update Unraid Template

Edit `unraid-template.xml` to use Docker Hub image:

```xml
<Repository>sudonate91/eve-data-aggregator:latest</Repository>
```

Users can now:
1. Add container via Unraid WebUI
2. Select your template
3. Image pulls automatically from Docker Hub
4. No local build required!

---

## Monitoring Builds

### GitHub Actions

1. Go to **Actions** tab
2. View build status and logs
3. Debug any failures

### Docker Hub

1. Go to your repository
2. Click **Tags** to see all available tags
3. Click **Builds** to see build history (if using automated builds)

---

## Troubleshooting

### Build Fails

Check GitHub Actions logs:
1. Go to **Actions** tab
2. Click on failed workflow
3. Expand failed step
4. Review error messages

Common issues:
- Invalid Docker Hub credentials
- Dockerfile syntax errors
- Missing dependencies

### Can't Pull Image

```bash
# Verify image exists
docker search sudonate91/eve-data-aggregator

# Check if you're logged in (for private repos)
docker login

# Try pulling with full tag
docker pull sudonate91/eve-data-aggregator:latest
```

### Wrong Architecture

```bash
# Check image platforms
docker manifest inspect sudonate91/eve-data-aggregator:latest

# Pull specific platform
docker pull --platform linux/amd64 sudonate91/eve-data-aggregator:latest
```

---

## Best Practices

1. **Use Access Tokens** - Never use your Docker Hub password in CI/CD
2. **Tag Versions** - Use semantic versioning for releases
3. **Test Before Tagging** - Test on `dockerize` branch first
4. **Keep Secrets Secret** - Never commit Docker Hub credentials
5. **Monitor Builds** - Check GitHub Actions for build failures
6. **Update Documentation** - Keep README and INSTALL.md current
7. **Use Multi-Stage Builds** - Keep image size small (already done!)

---

## Cost Considerations

### Docker Hub Free Tier

- ✅ Unlimited public repositories
- ✅ 1 private repository
- ✅ Unlimited pulls for public repos
- ⚠️ Rate limits: 200 pulls/6 hours (anonymous), 5000 pulls/day (authenticated)

### Paid Plans

- **Pro ($5/month):** Unlimited private repos, higher rate limits
- **Team ($7/user/month):** Team collaboration features
- **Business:** Enterprise features

For most use cases, the free tier is sufficient!

---

## Alternative Registries

If you need more private repositories or different features:

- **GitHub Container Registry (ghcr.io)** - Free unlimited private repos
- **AWS ECR** - Integrated with AWS
- **Google Container Registry** - Integrated with GCP
- **Azure Container Registry** - Integrated with Azure

The GitHub Actions workflow can be adapted for these registries.

---

## Next Steps

1. ✅ Create Docker Hub repository
2. ✅ Generate access token
3. ✅ Add GitHub secrets
4. ✅ Push code to trigger build
5. ✅ Verify image on Docker Hub
6. ✅ Test pulling and running image
7. ✅ Update documentation with Docker Hub instructions

Your image is now available for easy installation! 🎉
