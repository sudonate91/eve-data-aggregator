# Docker Setup Guide

This guide explains how to run the EVE Data Aggregator using Docker.

## Prerequisites

- Docker installed on your system ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed ([Install Docker Compose](https://docs.docker.com/compose/install/))

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file and configure it with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and replace the placeholder values with your actual:
- EVE Online ESI API credentials
- Corporation IDs
- Database connection details
- API keys
- **Job Configuration**: Enable/disable specific import jobs
- **Run Interval**: Set how often jobs should run (in minutes)

**Important**: For Docker deployment, ensure `USE_ENV_CONFIG=true` to run in non-interactive mode.

### 2. Build the Docker Image

```bash
docker-compose build
```

### 3. Run the Application

```bash
docker-compose up
```

Or run in detached mode:

```bash
docker-compose up -d
```

### 4. View Logs

```bash
docker-compose logs -f app
```

## Alternative Docker Commands

### Build and Run with Docker (without Docker Compose)

Build the image:
```bash
docker build -t eve-data-aggregator:latest .
```

Run the container:
```bash
docker run -it --rm \
  --env-file .env \
  --name eve-data-aggregator \
  eve-data-aggregator:latest
```

### Development Mode

To run with development dependencies:

```bash
docker build --target development -t eve-data-aggregator:dev .
docker run -it --rm \
  --env-file .env \
  -v ${PWD}:/app \
  -v /app/node_modules \
  eve-data-aggregator:dev
```

## Database Configuration

### Using External Database (Default)

The application is configured to connect to an external MySQL database specified in your `.env` file. Ensure:
1. The database server is accessible from the Docker container
2. The `DB_HOST` in `.env` points to the correct address
3. If using `localhost` or `127.0.0.1`, change it to your host machine's IP or use Docker networking

### Using Dockerized MySQL (Optional)

To run MySQL in a Docker container:

1. Uncomment the MySQL service in `docker-compose.yml`
2. Uncomment the volumes section at the bottom
3. Update `DB_HOST` in `.env` to `mysql` (the service name)
4. Run: `docker-compose up`

## Network Configuration

### Connecting to Host Database

If your database is running on the host machine:

**On Linux:**
```yaml
services:
  app:
    network_mode: "host"
```

**On Windows/Mac:**
Update `DB_HOST` in `.env` to:
- Windows/Mac: `host.docker.internal`
- Linux: Your machine's IP address (e.g., `192.168.1.x`)

## Stopping the Application

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Troubleshooting

### Container Exits Immediately

The application is interactive and requires TTY. Ensure you're running with `-it` flags or `stdin_open: true` and `tty: true` in docker-compose.yml.

### Database Connection Failed

1. Verify database credentials in `.env`
2. Check if database host is accessible from container
3. Ensure database server allows connections from Docker network
4. Check firewall rules

### Permission Issues

If you encounter permission errors, the application runs as a non-root user (nodejs). You may need to adjust file permissions or volumes.

## Production Deployment

For production:

1. Use Docker secrets instead of `.env` file
2. Set appropriate resource limits in docker-compose.yml
3. Configure log rotation
4. Use Docker health checks
5. Consider using Docker Swarm or Kubernetes for orchestration

Example with resource limits:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Advanced Usage

### Running Specific Commands

```bash
docker-compose run --rm app node bin/index.mjs --help
```

### Executing Commands in Running Container

```bash
docker-compose exec app sh
```

### Building for Different Architectures

For ARM (e.g., Raspberry Pi):
```bash
docker buildx build --platform linux/arm64 -t eve-data-aggregator:arm64 .
```

## File Structure

- `Dockerfile` - Multi-stage build configuration
- `docker-compose.yml` - Orchestration configuration
- `.dockerignore` - Files excluded from build context
- `.env.example` - Template for environment variables
- `DOCKER.md` - This documentation file
