# Unraid Quick Start Guide

**⚡ Fast deployment for Unraid users** - Configure everything through the WebUI, no .env file editing needed!

## Step 1: Transfer to Unraid

Copy this entire folder to your Unraid server:
```
\\your-unraid-ip\appdata\eve-data-aggregator
```

## Step 2: Build the Image

SSH into Unraid and run:
```bash
cd /mnt/user/appdata/eve-data-aggregator
bash build-for-unraid.sh
```

## Step 3: Add Container in WebUI

1. Open Unraid WebUI → **Docker** tab
2. Click **Add Container**
3. Select **eve-data-aggregator** from template dropdown
4. Fill in the configuration form:

### Required Fields:
- **EVE Client ID**: Your ESI application client ID
- **Callback URL**: `https://localhost/callback/` (must match ESI app)
- **ESI Scope**: Leave default or customize
- **Main Corporation ID**: Your corporation ID
- **Database Host**: 
  - Use `127.0.0.1` if MySQL is on Unraid
  - Or your database server IP
- **Database User**: Your MySQL username
- **Database Password**: Your MySQL password
- **Main Database Name**: `S0b` (or your database name)

### Optional Fields:
- Additional corporation IDs and database names
- Janice API key for pricing
- Root database credentials

5. Click **Apply**

## Step 4: Run

1. The container will start automatically
2. Click the container icon → **Console**
3. Follow the interactive prompts to select jobs
4. Set an interval if you want scheduled runs

## That's it! 🎉

All configuration is saved in Unraid. To change settings:
1. Docker tab → Container icon → **Edit**
2. Modify any values
3. Click **Apply** (container recreates with new settings)

## Database Connection

Since the container uses host networking:
- If MySQL is on Unraid: use `localhost` or `127.0.0.1`
- If MySQL is elsewhere: use that server's IP
- No port forwarding needed!

## Troubleshooting

**Container won't start?**
- Check Docker logs in Unraid WebUI
- Verify database is running and accessible

**Can't connect to database?**
- Test from Unraid terminal: `mysql -h 127.0.0.1 -u your-user -p`
- Check MySQL is listening: `netstat -tlnp | grep 3306`

**Need to rebuild?**
```bash
cd /mnt/user/appdata/eve-data-aggregator
docker build -t eve-data-aggregator:latest .
```
Then recreate container in WebUI.

## Full Documentation

See [UNRAID.md](UNRAID.md) for detailed instructions and advanced configuration.
