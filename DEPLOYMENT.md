# Deployment Guide

Deploy Firelock Bluebird using Portainer and Nginx Proxy Manager.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  VPS (Portainer)                                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Stack: nginx-proxy-manager                                  │ │
│  │  Ports: 80 (HTTP), 443 (HTTPS), 81 (Admin UI)               │ │
│  │  Routes:                                                     │ │
│  │    bluebird-tapes.orangenkrob.de → bluebird-frontend:80     │ │
│  │    (future apps...)                                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│         │                                                          │
│         │ proxy-network (shared docker network)                    │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Stack: bluebird                                             │ │
│  │    frontend (nginx:80) ─→ backend (node:3001) ─→ db (pg)    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  GitHub Actions ──webhook──→ Portainer ──redeploy──→ bluebird     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- VPS with Docker and Portainer installed
- Domain DNS pointing to VPS: `bluebird-tapes.orangenkrob.de` → VPS IP
- GitHub repository with this codebase

---

## Step 1: Create Shared Network

SSH into your VPS and create the proxy network:

```bash
docker network create proxy-network
```

This network allows NPM to communicate with containers in other stacks.

---

## Step 2: Deploy Nginx Proxy Manager

### 2.1 Create Stack in Portainer

1. Open Portainer → **Stacks** → **Add stack**
2. Name: `nginx-proxy-manager`
3. Build method: **Web editor**
4. Paste the contents of `infra/nginx-proxy-manager/docker-compose.yml`:

```yaml
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    environment:
      TZ: Europe/Berlin
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - proxy-network
    restart: unless-stopped

volumes:
  npm_data:
  npm_letsencrypt:

networks:
  proxy-network:
    external: true
```

5. Click **Deploy the stack**

### 2.2 Initial NPM Setup

1. Open `http://YOUR_VPS_IP:81`
2. Login with default credentials:
   - Email: `admin@example.com`
   - Password: `changeme`
3. You'll be prompted to change these immediately

---

## Step 3: Deploy Bluebird Stack

### 3.1 Create Stack in Portainer

1. Open Portainer → **Stacks** → **Add stack**
2. Name: `bluebird`
3. Build method: **Repository**
4. Repository URL: `https://github.com/YOUR_USERNAME/firelock_bluebird`
5. Repository reference: `refs/heads/main`
6. Compose path: `docker-compose.prod.yml`
7. Enable **GitOps updates** (optional - for auto-pull)

### 3.2 Environment Variables

Add these environment variables in the Portainer stack config:

| Variable | Value |
|----------|-------|
| `POSTGRES_USER` | `bluebird` |
| `POSTGRES_PASSWORD` | `<generate-strong-password>` |
| `POSTGRES_DB` | `bluebird` |

Generate a password:
```bash
openssl rand -base64 32
```

### 3.3 Enable Webhook

1. After deploying, go to the stack settings
2. Enable **Webhook**
3. Copy the webhook URL (looks like `https://portainer.example.com/api/stacks/webhooks/xxxx`)
4. Save this for GitHub Actions setup

### 3.4 Deploy

Click **Deploy the stack**

---

## Step 4: Configure NPM Proxy Host

### 4.1 Add Proxy Host

1. Open NPM Admin UI (`http://YOUR_VPS_IP:81`)
2. Go to **Proxy Hosts** → **Add Proxy Host**

### 4.2 Details Tab

| Field | Value |
|-------|-------|
| Domain Names | `bluebird-tapes.orangenkrob.de` |
| Scheme | `http` |
| Forward Hostname / IP | `bluebird-frontend` |
| Forward Port | `80` |
| Block Common Exploits | ✅ |
| Websockets Support | ✅ (optional) |

### 4.3 SSL Tab

| Field | Value |
|-------|-------|
| SSL Certificate | Request a new SSL Certificate |
| Force SSL | ✅ |
| HTTP/2 Support | ✅ |
| Email for Let's Encrypt | `your-email@example.com` |
| Agree to ToS | ✅ |

Click **Save**

NPM will automatically obtain and renew Let's Encrypt certificates.

---

## Step 5: GitHub Actions Setup

### 5.1 Add Repository Secret

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

| Name | Value |
|------|-------|
| `PORTAINER_WEBHOOK_URL` | The webhook URL from Step 3.3 |

### 5.2 Test Deployment

Push a commit to `main` branch:
```bash
git add .
git commit -m "Test deployment"
git push origin main
```

Watch the GitHub Actions tab for the deployment status.

---

## DNS Configuration

Ensure your domain points to the VPS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | bluebird-tapes | YOUR_VPS_IP | 300 |

Or if using Cloudflare with proxy:
- Enable proxy (orange cloud)
- SSL mode: Full (strict)

---

## Troubleshooting

### Check container status
```bash
docker ps
docker logs bluebird-frontend
docker logs bluebird-backend
docker logs nginx-proxy-manager
```

### Check network connectivity
```bash
# Verify containers are on proxy-network
docker network inspect proxy-network

# Test from NPM to frontend
docker exec nginx-proxy-manager curl -s http://bluebird-frontend:80
```

### Database issues
```bash
# Check if DB is healthy
docker exec bluebird-db pg_isready -U bluebird

# Run migrations manually
docker exec bluebird-backend npx prisma db push
```

### SSL certificate issues
- Ensure port 80 is accessible (Let's Encrypt HTTP challenge)
- Check NPM logs: `docker logs nginx-proxy-manager`
- Verify DNS is pointing to VPS

### Webhook not triggering
- Verify the webhook URL is correct in GitHub secrets
- Check Portainer webhook is enabled on the stack
- Test manually: `curl -X POST "WEBHOOK_URL"`

---

## Security Recommendations

1. **Change NPM default credentials** immediately after first login
2. **Use strong database password**: `openssl rand -base64 32`
3. **Restrict Portainer access**: Consider putting it behind NPM too
4. **Firewall**: Only expose ports 80, 443, and Portainer port
5. **Regular backups**: Set up PostgreSQL backup schedule

---

## Useful Commands

```bash
# View all containers
docker ps -a

# View stack logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a container
docker restart bluebird-frontend

# Rebuild and redeploy (manual)
docker compose -f docker-compose.prod.yml up -d --build

# Clean up unused images
docker image prune -a

# Database backup
docker exec bluebird-db pg_dump -U bluebird bluebird > backup.sql
```

---

## Adding More Apps Behind NPM

To add another app to the same VPS:

1. Create a new stack in Portainer
2. Connect it to `proxy-network`:
   ```yaml
   networks:
     - default
     - proxy-network

   networks:
     proxy-network:
       external: true
   ```
3. Add a new Proxy Host in NPM pointing to the container
4. NPM handles SSL automatically
