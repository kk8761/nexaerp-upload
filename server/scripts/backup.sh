#!/bin/bash
# PostgreSQL Automated Backup Script
# This script creates compressed backups with timestamps and manages retention

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-nexaerp}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nexaerp_$TIMESTAMP.backup"
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "PostgreSQL Backup Started: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Perform backup
echo "Creating backup: $BACKUP_FILE" | tee -a "$LOG_FILE"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)" | tee -a "$LOG_FILE"
  
  # Compress backup
  echo "Compressing backup..." | tee -a "$LOG_FILE"
  gzip "$BACKUP_FILE"
  COMPRESSED_FILE="$BACKUP_FILE.gz"
  COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  echo "✅ Backup compressed: $COMPRESSED_FILE ($COMPRESSED_SIZE)" | tee -a "$LOG_FILE"
  
  # Clean up old backups
  echo "Cleaning up backups older than $RETENTION_DAYS days..." | tee -a "$LOG_FILE"
  find "$BACKUP_DIR" -name "nexaerp_*.backup.gz" -mtime +$RETENTION_DAYS -delete
  find "$BACKUP_DIR" -name "backup_*.log" -mtime +$RETENTION_DAYS -delete
  echo "✅ Old backups cleaned up" | tee -a "$LOG_FILE"
  
  # List current backups
  echo "Current backups:" | tee -a "$LOG_FILE"
  ls -lh "$BACKUP_DIR"/nexaerp_*.backup.gz | tee -a "$LOG_FILE"
else
  echo "❌ Backup failed!" | tee -a "$LOG_FILE"
  exit 1
fi

echo "========================================" | tee -a "$LOG_FILE"
echo "PostgreSQL Backup Completed: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
