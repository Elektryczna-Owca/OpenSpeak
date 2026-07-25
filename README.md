# OpenSpeak
Run your meeting like a pro!

The application lives in the [`agenda-app/`](agenda-app) directory — a [Next.js](https://nextjs.org) app backed by PostgreSQL via [Prisma](https://www.prisma.io).

## Requirements

- Node.js 22+
- Docker (with the Compose plugin)

## Development

All commands below are run from the `agenda-app/` directory:

```bash
cd agenda-app
```

1. Start the PostgreSQL database:

   ```bash
   docker compose up -d
   ```

2. Configure the database connection — create a `.env` file (matches the credentials from `docker-compose.yml`):

   ```bash
   echo 'DATABASE_URL="postgresql://agenda:agenda@localhost:5432/agenda"' > .env
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Apply database migrations (this also generates the Prisma client):

   ```bash
   npx prisma migrate dev
   ```

5. (Optional) Seed the database with sample data:

   ```bash
   npx prisma db seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app reloads automatically as you edit files.

To stop the database later, run `docker compose down` (add `-v` to also delete the data volume).

## Production deployment

A production image is built from `agenda-app/Dockerfile`. It creates a minimal standalone Next.js server that applies pending database migrations (`prisma migrate deploy`) automatically on startup.

1. Build the image:

   ```bash
   cd agenda-app
   docker build -t openspeak .
   ```

2. Run it, pointing `DATABASE_URL` at your production PostgreSQL database:

   ```bash
   docker run -d \
     --name openspeak \
     -p 3000:3000 \
     -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME" \
     --restart unless-stopped \
     openspeak
   ```

The app listens on port 3000 inside the container. Put a reverse proxy (nginx, Caddy, Traefik, …) in front of it to handle TLS.

Note: the `docker-compose.yml` in `agenda-app/` only provides the development database — it is not a production deployment. For production, use a managed PostgreSQL instance or run your own hardened Postgres server.

## Server requirements (custom Linux server)

To self-host OpenSpeak on your own Linux server you need:

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 1 vCPU | 2 vCPUs |
| RAM | 1 GB (2 GB during image build) | 2 GB |
| Disk | 10 GB free | 20 GB free |
| Architecture | x86_64 or arm64 | — |

Software:

- A modern Linux distribution (any distro capable of running Docker; instructions below use Ubuntu 26.04 LTS)
- **Docker Engine 24+** — runs the application container
- **PostgreSQL 16+** — as a Docker container or installed natively via apt (both shown below), or a managed cloud database
- A **reverse proxy** with TLS termination (nginx shown below; Caddy or Traefik work equally well)
- **Git** — to fetch the source code

Network:

- Ports **80** and **443** open to the internet (the app itself listens on port 3000, bound to localhost only)
- A **domain name** pointing at the server (required for TLS certificates)

If you build the Docker image on a separate machine and only run it on the server, the RAM requirement drops and Git/build tooling is not needed on the server.

## Deploying on Ubuntu 26.04 LTS

A complete walkthrough for a fresh Ubuntu 26.04 LTS server. Run everything as a user with `sudo` privileges.

### 1. Install Docker and Git

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker

# Allow your user to run docker without sudo (log out and back in afterwards)
sudo usermod -aG docker $USER
```

### 2. Set up PostgreSQL

Choose one of the two options. In both cases, **pick your own strong password** instead of the placeholder.

#### Option A: PostgreSQL in Docker

Create a Docker network so the app and database can talk to each other, then start Postgres with a persistent volume:

```bash
docker network create openspeak

docker run -d \
  --name openspeak-db \
  --network openspeak \
  -e POSTGRES_USER=openspeak \
  -e POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD \
  -e POSTGRES_DB=openspeak \
  -v openspeak-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16
```

The database is only reachable from containers on the `openspeak` network — it is not exposed to the internet.

#### Option B: native PostgreSQL via apt

Install PostgreSQL from the Ubuntu repositories and create the application user and database:

```bash
sudo apt install -y postgresql
sudo systemctl enable --now postgresql

sudo -u postgres psql -c "CREATE USER openspeak WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE openspeak OWNER openspeak;"
```

No further configuration is needed: PostgreSQL listens on `localhost` only by default, and the app container will reach it via host networking (see step 4). Upgrades and security patches then arrive through the regular `apt upgrade` cycle.

### 3. Build the application image

```bash
git clone https://github.com/Elektryczna-Owca/OpenSpeak.git
cd OpenSpeak/agenda-app
docker build -t openspeak .
```

### 4. Run the application

With **Option A** (PostgreSQL in Docker), attach the app to the `openspeak` network and address the database by its container name:

```bash
docker run -d \
  --name openspeak-app \
  --network openspeak \
  -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL="postgresql://openspeak:CHANGE_ME_STRONG_PASSWORD@openspeak-db:5432/openspeak" \
  --restart unless-stopped \
  openspeak
```

With **Option B** (native PostgreSQL), use host networking so the container can reach PostgreSQL on `localhost` (`HOSTNAME=127.0.0.1` keeps the app itself reachable only from the local machine):

```bash
docker run -d \
  --name openspeak-app \
  --network host \
  -e HOSTNAME=127.0.0.1 \
  -e DATABASE_URL="postgresql://openspeak:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/openspeak" \
  --restart unless-stopped \
  openspeak
```

On startup the container automatically applies any pending database migrations, then starts the server. Verify it is running:

```bash
docker logs openspeak-app
curl -I http://127.0.0.1:3000
```

The port is bound to `127.0.0.1`, so the app is only reachable through the reverse proxy set up next.

### 5. Set up nginx with TLS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/openspeak` (replace `openspeak.example.com` with your domain):

```nginx
server {
    listen 80;
    server_name openspeak.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain a TLS certificate (certbot rewrites the config for HTTPS and sets up automatic renewal):

```bash
sudo ln -s /etc/nginx/sites-available/openspeak /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d openspeak.example.com
```

If you use UFW, allow web traffic: `sudo ufw allow "Nginx Full"`.

The app is now available at `https://openspeak.example.com`.

### 6. Updating to a new version

```bash
cd OpenSpeak
git pull
cd agenda-app
docker build -t openspeak .
docker rm -f openspeak-app
```

Then re-run the `docker run` command from step 4. Database migrations are applied automatically on startup.

### 7. Backups

Dump the database regularly, e.g. via cron.

With PostgreSQL in Docker (Option A):

```bash
docker exec openspeak-db pg_dump -U openspeak openspeak > openspeak-$(date +%F).sql
```

With native PostgreSQL (Option B):

```bash
sudo -u postgres pg_dump openspeak > openspeak-$(date +%F).sql
```
