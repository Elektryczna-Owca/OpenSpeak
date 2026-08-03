---
title: Install & self-host
description: What you need to run your own OpenSpeak instance, and where the full deployment guide lives.
---

OpenSpeak is self-hosted: your club runs its own instance, owns its own data, and shares one URL among members. There is no hosted/cloud version.

## What you need

- **Node.js 22+** and **Docker** (with the Compose plugin) for development, or
- for production: a small Linux server (1 vCPU / 1 GB RAM is enough), **Docker**, **PostgreSQL 16+**, and a reverse proxy with TLS.

Remember: OpenSpeak has [no logins](/getting-started/introduction/#who-can-see-and-edit-what) — treat the URL itself as the key to your instance.

## Try it locally

From a clone of the [repository](https://github.com/Elektryczna-Owca/OpenSpeak):

```bash
cd agenda-app
docker compose up -d          # start the dev PostgreSQL
echo 'DATABASE_URL="postgresql://agenda:agenda@localhost:5432/agenda"' > .env
npm install
npx prisma migrate dev        # create the database schema
npx prisma db seed            # optional sample data (includes the Toastmasters template)
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Production deployment

The repository README is the single source of truth for production setup — a Docker image that applies database migrations automatically on startup, plus a complete Ubuntu walkthrough (PostgreSQL in Docker or via apt, nginx with TLS certificates, updating, and backups):

- [Production deployment](https://github.com/Elektryczna-Owca/OpenSpeak#production-deployment)
- [Server requirements](https://github.com/Elektryczna-Owca/OpenSpeak#server-requirements-custom-linux-server)
- [Deploying on Ubuntu step by step](https://github.com/Elektryczna-Owca/OpenSpeak#deploying-on-ubuntu-2604-lts)
