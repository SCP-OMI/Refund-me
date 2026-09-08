# 1337 Refund Management System

A financial reimbursement tracking platform for the 1337/42 school ecosystem. Students can submit refund requests, and staff can review and approve them.

## Features

- **42 School OAuth** - Login with your 42 intra account
- **Role-based access** - Students submit requests, Staff review them
- **Status tracking** - Track requests through the approval pipeline
- **Receipt upload** - Upload receipts for verification via pluggable storage
- **Real-time updates** - Auto-refreshing dashboards with Socket.IO (namespaced to `/api/socket`)
- **Notifications** - In-app notifications for status changes
- **PDF Export** - Download request summaries
- **Analytics** - Staff dashboard with charts and insights
- **Security Hardened** - Built-in protection against Path Traversal, XSS, and unauthenticated uploads

## Quick Start

### Prerequisites
- **Docker & Docker Compose** installed
- **42 OAuth credentials** - Get from [42 Intra OAuth Apps](https://profile.intra.42.fr/oauth/applications)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd reftofund
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   **Edit `.env` and set:**
   ```env
   # Generate with: openssl rand -base64 32
   AUTH_SECRET=your_generated_secret_here
   
   # Get from https://profile.intra.42.fr/oauth/applications
   AUTH_42_SCHOOL_ID=your_42_oauth_client_id
   AUTH_42_SCHOOL_SECRET=your_42_oauth_client_secret
   
   # Database (use defaults for local development)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/local_db
   DIRECT_URL=postgresql://postgres:postgres@localhost:5433/local_db
   ```

3. **Choose your environment:**

   ### Option A: Development (Docker Watch - Recommended)
   ```bash
   # Start with live-sync and auto-rebuild
   docker compose -f docker-compose.dev.yml watch
   ```
   This environment syncs your code changes instantly and auto-rebuilds when `package.json` or critical configs change.

   ### Option B: Production (Docker)
   ```bash
   docker compose up -d --build
   ```
   Runs optimized production build with automatic migrations.
   
   ### Option C: Local (Manual)
   ```bash
   # Start database and Redis
   docker compose up -d db redis
   
   # Install dependencies
   npm install
   
   # Initialize database
   npx prisma db push
   
   # Start dev server
   npm run dev
   ```
   Runs with hot-reload on http://localhost:3000

4. **Configure 42 OAuth Redirect URI**
   
   In your 42 OAuth application settings, add:
   ```
   http://localhost:3000/api/auth/callback/42-school
   ```

5. **Access the application**
   - **App**: http://localhost:3000
   - **Prisma Studio** (dev only): http://localhost:5555 (run `npx prisma studio`)

## Architecture & Conventions

### WebSocket Implementation
The WebSocket server is integrated into the custom `server.ts` and uses a singleton pattern (`src/lib/socket-server.ts`) to share the instance across the Next.js application bundle. The endpoint is namespaced to `/api/socket`.

### File Storage
File storage is abstracted via the `StorageProvider` interface (`src/lib/storage`). Currently, it supports `LocalStorageProvider`, but can be easily extended to S3 or other cloud providers.

### Logging
Server-side logging is standardized using **Pino**. Specialized loggers are available:
- `apiLogger` - For API routes and network requests
- `authLogger` - For authentication events
- `auditLogger` - For security and activity auditing

## Development Commands

```bash
# Start dev server (after setting up DB)
npm run dev

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio (database GUI)
npx prisma studio

# Run production build locally
npm run build
npm start
```

## Troubleshooting

### WebSocket "Connection Error"
- Ensure `NEXT_PUBLIC_WS_URL` in `.env` matches your browser URL (usually `http://localhost:3000`).
- Check if you are using the custom server (`npm run dev`) and not just `next dev`.

### "Can't reach database server"
- Make sure Docker containers are running: `docker ps`
- Start database: `docker compose up -d db redis`
- Check connection: `docker logs refund-med-db`

## Tech Stack

- **Framework**: Next.js 16.1 (App Router, Turbopack)
- **Runtime**: React 19
- **Auth**: Better-Auth with 42 OAuth
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Logging**: Pino
- **Real-time**: Custom Socket.IO Server
- **Styling**: Tailwind CSS v4 + Shadcn/UI
- **State**: TanStack Query + Zustand

## Project Structure

```
src/
├── actions/      # Server actions (database operations)
├── app/          # Next.js App Router pages
├── components/   # React components
├── hooks/        # Custom React hooks
├── lib/          # Core utilities
│   ├── storage/  # File storage providers (Local/S3)
│   ├── queue/    # Background job processing
│   ├── logger.ts # Structured logging setup
│   └── ...
├── store/        # Zustand state stores
└── types/        # TypeScript type definitions

server.ts         # Custom Next.js + Socket.IO server setup
```