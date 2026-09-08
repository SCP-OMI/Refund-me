#!/bin/bash
# Database backup script for Refund-Med
# Usage: ./backup-db.sh [container_name] [db_name]

set -e

CONTAINER_NAME=${1:-refund-med-db}
DB_NAME=${2:-refund_med}
BACKUP_DIR="$(dirname "$0")/../backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up database '$DB_NAME' from container '$CONTAINER_NAME'..."

# Create backup
docker exec "$CONTAINER_NAME" pg_dump -U postgres "$DB_NAME" > "$BACKUP_DIR/backup_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: backup_${DATE}.sql"
    
    # Compress the backup
    gzip "$BACKUP_DIR/backup_${DATE}.sql"
    echo "✅ Compressed: backup_${DATE}.sql.gz"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Clean up old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "📋 Current backups:"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null || echo "No backups found"

echo "✨ Backup complete!"
