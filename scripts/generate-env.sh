#!/bin/bash

# generate-env.sh
# Generates a secure .env file for production

echo "Generating secure .env file..."

# Function to generate a random secret
generate_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

# Function to generate a random password (alphanumeric)
generate_password() {
    openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20
}

# Generate credentials
POSTGRES_USER="refund_admin"
POSTGRES_PASSWORD=$(generate_password)
POSTGRES_DB="refund_med"
REDIS_PASSWORD=$(generate_password)

# Generate Application Secrets
BETTER_AUTH_SECRET=$(generate_secret)
NEXTAUTH_SECRET=$(generate_secret)

# 42 School API credentials must come from the deployment environment.
# Never keep OAuth client secrets in this script or in source control.
AUTH_42_SCHOOL_ID="${AUTH_42_SCHOOL_ID:-replace_with_42_oauth_client_id}"
AUTH_42_SCHOOL_SECRET="${AUTH_42_SCHOOL_SECRET:-replace_with_42_oauth_client_secret}"

# URLs
APP_URL="https://refunds.1337.ma"
# For Docker internal networking
DB_HOST="db"
REDIS_HOST="redis"

# Create the .env file content
cat <<EOF > .env
# --- Application Settings ---
NODE_ENV=production
PORT=3000
BETTER_AUTH_URL=$APP_URL
BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET"

# --- Database ---
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB

# Prisma connection string
# Connect to 'db' service from 'app' container
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DB_HOST:5432/$POSTGRES_DB"
# Direct connection (optional, for migrations run from outside if ports were open, but here we run inside)
DIRECT_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$DB_HOST:5432/$POSTGRES_DB"

# --- Redis ---
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
# If you enable redis password in redis.conf, add it here. 
# Docker redis alpine usually needs config to enable password.
# For now, we assume internal network isolation, but good practice to have it ready.
# REDIS_URL="redis://:$REDIS_PASSWORD@$REDIS_HOST:6379" 
REDIS_URL="redis://$REDIS_HOST:6379"

# --- OAuth Providers ---
AUTH_42_SCHOOL_ID="$AUTH_42_SCHOOL_ID"
AUTH_42_SCHOOL_SECRET="$AUTH_42_SCHOOL_SECRET"
REDIRECT_URL="$APP_URL/api/auth/callback/42-school"

EOF

echo "✅ .env file created successfully!"
echo "⚠️  IMPORTANT: Please manually update AUTH_42_SCHOOL_ID, AUTH_42_SCHOOL_SECRET, and APP_URL in the .env file."
