# Unraid Deployment Guide

This guide explains how to deploy the EVE Data Aggregator on your Unraid server where your MySQL database is already running.

## Overview

On Unraid, all environment variables (.env configuration) will be managed through the Unraid WebUI when you add the Docker container. No manual .env file editing is required!

## Prerequisites

- Unraid server (6.9.0 or later recommended)
- MySQL/MariaDB running on Unraid (or accessible from Unraid)
- EVE Online ESI API credentials
- SSH or terminal access to your Unraid server

## Deployment Steps

### Step 1: Transfer Files to Unraid

Transfer your project files to your Unraid server. You can use:

**Option A: Using SSH/SCP**
```bash
scp -r /path/to/eve-data-aggregator root@your-unraid-ip:/mnt/user/appdata/eve-data-aggregator
```

**Option B: Using Unraid SMB Share**
1. Map your Unraid shares on your computer
2. Copy the project folder to `/mnt/user/appdata/eve-data-aggregator`

### Step 2: Build the Docker Image on Unraid

SSH into your Unraid server and run:

```bash
cd /mnt/user/appdata/eve-data-aggregator
docker build -t eve-data-aggregator:latest .
```

This will create a local Docker image on your Unraid server.

### Step 3: Add Container via Unraid WebUI

#### Option A: Using the Template (Recommended)

1. **Copy the template file:**
   ```bash
   cp /mnt/user/appdata/eve-data-aggregator/unraid-template.xml /boot/config/plugins/dockerMan/templates-user/eve-data-aggregator.xml
   ```

2. **Refresh Docker page:**
   - Go to Unraid WebUI → Docker tab
   - Click "Add Container"
   - Select "eve-data-aggregator" from the template dropdown

3. **Configure environment variables** through the WebUI:
   - All your configuration options will appear as form fields
   - Fill in your EVE Online credentials
   - Set database connection details
   - For `DB_HOST`, use:
     - `localhost` or `127.0.0.1` if MySQL is on Unraid
     - Or your database server IP if it's elsewhere

4. **Apply** to create and start the container

#### Option B: Manual Configuration

If the template doesn't appear, manually add the container:

1. Go to **Docker** tab in Unraid WebUI
2. Click **Add Container**
3. Configure:
   - **Name:** `eve-data-aggregator`
   - **Repository:** `eve-data-aggregator:latest`
   - **Network Type:** `Host`
   - **Console shell command:** `sh`
   - **Extra Parameters:** `-it`

4. Add environment variables by clicking **Add another Path, Port, Variable, Label or Device**:

   | Variable Name | Key | Default/Example | Required |
   |--------------|-----|-----------------|----------|
   | EVE Client ID | CLIENT_ID | your-client-id | Yes |
   | Callback URL | CALLBACK_URL | https://localhost/callback/ | Yes |
   | ESI Scope | SCOPE | esi-wallet.read_corporation_wallets.v1 esi-contracts.read_corporation_contracts.v1 | Yes |
   | OAuth State | STATE | unique-state | Yes |
   | Main Corporation ID | CORPORATION_ID | your-corp-id | Yes |
   | Structure Corp ID | STRUCT_CORPORATION_ID | | No |
   | Ven0m Corp ID | VEN0M_CORPORATION_ID | | No |
   | KryTek Corp ID | KRYTEK_CORPORATION_ID | | No |
   | S0b Mart Corp ID | S0B_MART_CORPORATION_ID | | No |
   | Janice API Key | JANICE_API_KEY | | No |
   | Database Host | DB_HOST | 127.0.0.1 | Yes |
   | Database User | DB_USER | S0b_Admin | Yes |
   | Database Password | DB_PASSWORD | | Yes |
   | Main Database Name | DB_NAME | S0b | Yes |
   | Struct DB Name | S0b_STRUCT_DB_NAME | S0b_Struct | No |
   | Ven0m DB Name | VEN0M_DB_NAME | Ven0m | No |
   | KryTek DB Name | KRYTEK_DB_NAME | KryTek | No |
   | S0b Mart DB Name | S0B_MART_DB_NAME | S0b_Mart | No |
   | Root User | ROOT_USER | root | No |
   | Root Password | ROOT_PASSWORD | | No |

5. **Apply** to create the container

### Step 4: Running the Container

Since this is an interactive CLI application:

1. **Start the container** from the Docker tab (if not already running)
2. **Access the console:**
   - Click the container icon → **Console**
   - The interactive prompts will appear in the console window
3. **Follow the prompts** to select which jobs to run

## Database Connection

### If MySQL is Running on Unraid

Set `DB_HOST` to:
- `localhost`
- `127.0.0.1`
- Or the Unraid server's IP address

The container uses **host networking mode**, so it can access services on the Unraid host directly.

### If MySQL is on Another Server

Simply use that server's IP address for `DB_HOST`.

## Managing the Container

### View Logs
```bash
docker logs eve-data-aggregator
```

Or use the Unraid WebUI: Docker tab → Container → Logs

### Restart Container
```bash
docker restart eve-data-aggregator
```

Or use the Unraid WebUI: Docker tab → Container icon → Restart

### Update Configuration

1. Go to Docker tab in Unraid WebUI
2. Click the container icon → **Edit**
3. Modify any environment variables
4. Click **Apply** (this recreates the container with new settings)

### Stop/Remove Container
```bash
docker stop eve-data-aggregator
docker rm eve-data-aggregator
```

Or use the Unraid WebUI Docker controls.

## Rebuilding After Code Changes

If you update your application code:

```bash
cd /mnt/user/appdata/eve-data-aggregator
docker stop eve-data-aggregator
docker rm eve-data-aggregator
docker build -t eve-data-aggregator:latest .
```

Then recreate the container through the WebUI using your saved template/settings.

## Scheduled Execution

To run the container on a schedule:

### Option A: User Scripts Plugin

1. Install the **User Scripts** plugin from Community Applications
2. Create a new script:
   ```bash
   #!/bin/bash
   docker start eve-data-aggregator
   ```
3. Set a schedule (e.g., daily at 2 AM)

### Option B: Cron Job

1. Edit Unraid cron:
   ```bash
   crontab -e
   ```
2. Add a schedule:
   ```
   0 2 * * * docker start eve-data-aggregator
   ```

## Troubleshooting

### Container Exits Immediately

The application is interactive and requires console access. To keep it running:
- Access via Console in Unraid WebUI
- Or modify the application to run in daemon mode

### Database Connection Refused

- Verify MySQL is running: `docker ps | grep mysql` or check your database container
- Check MySQL is listening on the correct port: `netstat -tlnp | grep 3306`
- Verify database credentials in container environment variables
- Ensure MySQL allows connections from Docker containers

### Can't Access Container Console

- Make sure the container has `-it` in Extra Parameters
- Try accessing via command line:
  ```bash
  docker exec -it eve-data-aggregator sh
  ```

### Permission Issues

If you see file permission errors:
```bash
cd /mnt/user/appdata/eve-data-aggregator
chmod -R 755 .
chown -R 99:100 .  # Unraid nobody:users
```

## Advanced: Docker Compose on Unraid

Alternatively, you can use docker-compose (requires Docker Compose plugin):

```bash
cd /mnt/user/appdata/eve-data-aggregator
docker-compose up -d
```

The docker-compose.yml is already configured for host networking mode.

## Updating Environment Variables Without Rebuilding

Environment variables are container configuration, not image configuration. To update them:

1. Stop the container
2. Edit via WebUI (Docker → Edit)
3. Change the environment variable values
4. Apply (this recreates the container but keeps the same image)

**No rebuild needed** unless you change the application code itself!

## Security Considerations

- **Sensitive Data:** Your passwords are stored in Unraid's Docker container configuration
- **Backup:** Back up your Docker templates from `/boot/config/plugins/dockerMan/templates-user/`
- **Network:** Using host mode gives the container full network access to your Unraid server
- **Updates:** Regularly rebuild your image if you update the application code

## Support

For issues specific to:
- **Unraid:** Check Unraid forums
- **Application:** Check the project repository
- **Docker:** Review DOCKER.md in the project folder
