# Deployment Guide: Synology NAS

This guide will help you deploy the Cortex on your Synology NAS for a 2-week trading experiment.

## Prerequisites

1. **Synology NAS Requirements:**
   - DSM 7.0 or later
   - Container Manager (install from Package Center)
   - At least 2GB RAM available
   - SSH access enabled (Control Panel → Terminal & SNMP)

2. **API Keys Required:**
   - Binance API key (with spot trading enabled)
   - OpenAI API key
   - Anthropic (Claude) API key
   - DeepSeek API key
   - Qwen API key
   - Supabase account (free tier works)

## Deployment Steps

### 1. Prepare Your Environment

**On your local machine:**

```bash
# Create .env file from example
cp .env.example .env

# Edit .env with your actual API keys
nano .env
```

### 2. Transfer Files to Synology NAS

```bash
# SSH into your Synology (replace with your NAS IP)
ssh your-username@192.168.1.xxx

# Create project directory
mkdir -p /volume1/docker/cortex
cd /volume1/docker/cortex

# Exit SSH
exit

# From your local machine, transfer files
scp -r /Users/salimalkaabi/Desktop/Projects/cortex/* your-username@192.168.1.xxx:/volume1/docker/cortex/
```

### 3. Build and Run with Docker

**SSH back into your NAS:**

```bash
ssh your-username@192.168.1.xxx
cd /volume1/docker/cortex

# Build the Docker image
docker build -t cortex .

# Run with docker-compose
docker-compose up -d
```

### 4. Access Your Application

Open your browser and navigate to:
```
http://192.168.1.xxx:3000
```

Replace `192.168.1.xxx` with your NAS IP address.

## Using Synology Container Manager GUI

If you prefer using the GUI:

1. Open **Container Manager** in DSM
2. Go to **Project** tab
3. Click **Create**
4. Name: `cortex`
5. Path: `/docker/cortex`
6. Source: Choose `docker-compose.yml`
7. Click **Next** and configure if needed
8. Click **Done**

## Monitoring and Maintenance

### View Logs

```bash
# View real-time logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app
```

### Restart the Application

```bash
docker-compose restart app
```

### Stop the Application

```bash
docker-compose down
```

### Check Status

```bash
docker-compose ps
```

## Setting Up for 2-Week Run

### 1. Configure Auto-Restart

The `docker-compose.yml` already includes `restart: unless-stopped`, which means:
- Container restarts automatically if it crashes
- Container starts automatically when NAS reboots
- Container stops only when manually stopped

### 2. Set Trading Interval

In the app settings (http://your-nas-ip:3000):
1. Go to Settings
2. Set "Trading Interval" to your desired frequency (e.g., 60 minutes)
3. Enable all LLMs you want to test
4. Click "Start Trading"

### 3. Monitor Resource Usage

**Via Synology DSM:**
- Go to **Container Manager → Container**
- Select `cortex`
- Click **Details** to see CPU/Memory usage

**Via SSH:**
```bash
docker stats cortex
```

### 4. Set Up Notifications (Optional)

**Create a monitoring script:**

```bash
# Create monitoring script
nano /volume1/docker/cortex/monitor.sh
```

```bash
#!/bin/bash
# Check if container is running
if ! docker ps | grep -q cortex; then
    # Container is down - restart it
    cd /volume1/docker/cortex
    docker-compose up -d

    # Send notification (requires Synology notification setup)
    synodsmnotify @administrators "Crypto Trader Alert" "Container was restarted"
fi
```

```bash
# Make it executable
chmod +x monitor.sh

# Add to crontab (runs every 10 minutes)
crontab -e
```

Add this line:
```
*/10 * * * * /volume1/docker/cortex/monitor.sh
```

## Database Backup (Important!)

**Option 1: Using Supabase Cloud (Recommended)**
- Automatic backups included
- No additional setup needed

**Option 2: Local PostgreSQL**
If you uncommented the PostgreSQL service in docker-compose.yml:

```bash
# Backup database
docker exec crypto-trader-db pg_dump -U crypto_trader crypto_trading > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20250102.sql | docker exec -i crypto-trader-db psql -U crypto_trader crypto_trading
```

**Automated daily backups:**
```bash
# Create backup script
nano /volume1/docker/cortex/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/volume1/docker/cortex/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker exec crypto-trader-db pg_dump -U crypto_trader crypto_trading > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql

# Keep only last 14 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +14 -delete
```

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:
```
0 2 * * * /volume1/docker/cortex/backup.sh
```

## Important Considerations

### Paper Trading Mode
- **STRONGLY RECOMMENDED** for first run
- Set `isPaperMode: true` in settings
- No real money at risk
- Full simulation of trading

### Real Trading Mode
⚠️ **WARNING**: Only enable after thorough testing!

1. Ensure Binance API has **spot trading permissions**
2. Set appropriate **position limits** in settings
3. Start with **small amounts**
4. Monitor **first few trades** closely
5. Have a **stop-loss strategy**

### API Rate Limits
- Binance: 1200 requests/minute
- OpenAI: Based on your tier
- Anthropic: Based on your tier
- DeepSeek: Check their docs
- Qwen: Check their docs

The app is designed to stay well within these limits.

### Cost Estimation (2 weeks)

**Trading hourly (24/7):**
- Total trades: ~336 per LLM
- LLM API costs: ~$5-15 per LLM (varies by model)
- 4 LLMs: ~$20-60 total

**Trading every 4 hours:**
- Total trades: ~84 per LLM
- LLM API costs: ~$2-8 per LLM
- 4 LLMs: ~$8-32 total

Trading fees depend on volume and Binance VIP level.

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs app

# Common issues:
# - Missing environment variables
# - Port 3000 already in use
# - Insufficient memory
```

### Can't Access Web Interface
```bash
# Check if container is running
docker ps

# Check firewall
sudo iptables -L | grep 3000

# Try accessing from NAS itself
curl http://localhost:3000
```

### High Memory Usage
```bash
# Check stats
docker stats cortex

# Restart if needed
docker-compose restart app
```

### Database Connection Issues
- Verify Supabase URL and keys in .env
- Check network connectivity
- Ensure Supabase project is active

## After 2 Weeks

### Export Results

1. Go to app settings
2. Look for data export options (if available)
3. Or backup the database:

```bash
# If using local PostgreSQL
docker exec crypto-trader-db pg_dump -U crypto_trader crypto_trading > final_results.sql
```

### Stop Trading

1. Access the web UI
2. Click "Stop Trading"
3. Wait for confirmation
4. Review final results

### Preserve Data

```bash
# Stop containers but keep data
docker-compose down

# To remove everything (including data)
# docker-compose down -v
```

## Support

If you encounter issues:
1. Check logs: `docker-compose logs app`
2. Verify environment variables are set
3. Ensure all API keys are valid
4. Check Synology system resources

## Security Recommendations

1. **Change default passwords** in .env
2. **Use Synology firewall** to restrict access
3. **Enable HTTPS** via Synology reverse proxy
4. **Keep DSM updated**
5. **Monitor API key usage** on provider dashboards
6. **Never commit .env** to version control

---

**Good luck with your 2-week trading experiment! 🚀📈**
