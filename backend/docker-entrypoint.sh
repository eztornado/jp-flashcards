#!/bin/sh
set -e

# Fix permissions for /app/data directory
# This is necessary when a volume is mounted that may have incorrect permissions
if [ -d /app/data ]; then
  echo "[INFO] /app/data exists, fixing permissions"
  chmod -R 777 /app/data || echo "[WARN] Could not fix permissions on /app/data"
else
  echo "[INFO] Creating /app/data directory"
  mkdir -p /app/data
  chmod 777 /app/data
fi

# Run as node user
exec su-exec node:node "$@"

