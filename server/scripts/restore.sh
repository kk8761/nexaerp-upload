#!/bin/bash
# PostgreSQL Database Restore Script
# This script restores a database from a backup file

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-nexaerp}"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/nexaerp_*.backup.gz 2>/dev/null || echo "No backups found"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "========================================="
echo "PostgreSQL Restore Started: $(date)"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target database: $POSTGRES_DB"
echo ""

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Decompressing backup..."
  DECOMPRESSED_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
  RESTORE_FILE="$DECOMPRESSED_FILE"
  CLEANUP_DECOMPRESSED=true
else
  RESTORE_FILE="$BACKUP_FILE"
  CLEANUP_DECOMPRESSED=false
fi

# Confirm restore
read -p "⚠️  This will OVERWRITE the database '$POSTGRES_DB'. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  [ "$CLEANUP_DECOMPRESSED" = true ] && rm -f "$RESTORE_FILE"
  exit 0
fi

# Drop existing connections
echo "Terminating existing connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Dropping and recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "CREATE DATABASE $POSTGRES_DB;"

# Restore backup
echo "Restoring backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v \
  "$RESTORE_FILE"

# Check if restore was successful
if [ $? -eq 0 ]; then
  echo "✅ Restore completed successfully"
  
  # Verify database
  echo "Verifying database..."
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
else
  echo "❌ Restore failed!"
  exit 1
fi

# Cleanup decompressed file
if [ "$CLEANUP_DECOMPRESSED" = true ]; then
  rm -f "$RESTORE_FILE"
fi

echo "========================================="
echo "PostgreSQL Restore Completed: $(date)"
echo "========================================="
