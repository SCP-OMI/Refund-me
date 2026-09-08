# Data Migration Commands

This document provides the exact CLI commands to migrate data from Supabase to local PostgreSQL.

## Prerequisites

- Docker running with local PostgreSQL container (`docker compose up -d db`)
- PostgreSQL client tools installed (`pg_dump`, `psql`)
- Access to your Supabase connection string

## Step 1: Export from Supabase

Run this command to dump your Supabase database:

```bash
# Full dump (schema + data)
pg_dump "postgresql://postgres.ozglkmirvtyanxttgent:3TQw0mFjwUfjnfzH@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -F c \
  -f supabase_backup.dump
```

### Options explained:
- `--no-owner`: Don't output commands to set ownership
- `--no-acl`: Don't output access privilege commands
- `--clean`: Drop database objects before recreating
- `--if-exists`: Add IF EXISTS to DROP statements
- `-F c`: Custom format (compressed, allows selective restore)
- `-f`: Output file name

### Alternative: SQL format (human-readable)

```bash
pg_dump "postgresql://postgres.ozglkmirvtyanxttgent:3TQw0mFjwUfjnfzH@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f supabase_backup.sql
```

## Step 2: Import to Local PostgreSQL

### Option A: Using pg_restore (for .dump files)

```bash
pg_restore \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=local_db \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  supabase_backup.dump
```

When prompted, enter password: `postgres`

### Option B: Using psql (for .sql files)

```bash
PGPASSWORD=postgres psql \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=local_db \
  -f supabase_backup.sql
```

### Option C: Pipe directly (no intermediate file)

```bash
pg_dump "postgresql://postgres.ozglkmirvtyanxttgent:3TQw0mFjwUfjnfzH@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  --no-owner \
  --no-acl | \
  PGPASSWORD=postgres psql \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=local_db
```

## Step 3: Verify Migration

```bash
# Run the verification script
./scripts/verify-local-db.sh

# Or manually check tables
PGPASSWORD=postgres psql -h localhost -U postgres -d local_db -c "\dt"

# Check record counts
PGPASSWORD=postgres psql -h localhost -U postgres -d local_db -c "SELECT 'user' as table_name, COUNT(*) FROM \"user\" UNION ALL SELECT 'RefundRequest', COUNT(*) FROM \"RefundRequest\" UNION ALL SELECT 'notification', COUNT(*) FROM notification;"
```

## Step 4: Sync Prisma (Alternative to Data Migration)

If you **don't need existing data** and just want the schema:

```bash
# Push Prisma schema to local database
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

## Troubleshooting

### Connection refused
Ensure Docker container is running:
```bash
docker compose up -d db
docker compose ps
```

### Permission denied on script
```bash
chmod +x scripts/verify-local-db.sh
```

### Tables already exist
The `--clean --if-exists` flags handle this, but you can manually reset:
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d local_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
