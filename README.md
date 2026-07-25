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
