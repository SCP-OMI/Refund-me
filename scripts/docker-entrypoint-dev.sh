#!/bin/sh
set -e

echo "Starting Dev Environment..."

# Ensure Prisma client is up to date (fast because of caching)
echo "Generating Prisma client..."
npx prisma generate

# Sync schema (non-interactive)
echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Starting dev server..."
exec npm run dev
