#!/bin/sh

# Don't exit on error - we want to debug
set +e

echo "[ENTRYPOINT] Starting entrypoint script"
echo "[ENTRYPOINT] Current user: $(whoami)"
echo "[ENTRYPOINT] /app/data directory info:"
ls -la /app/data 2>/dev/null || echo "[ENTRYPOINT] /app/data does not exist yet"

# Fix permissions for /app/data directory
if [ -d /app/data ]; then
  echo "[ENTRYPOINT] /app/data exists, fixing permissions"
  chmod -R 777 /app/data 2>/dev/null || echo "[ENTRYPOINT WARNING] Could not fix permissions on /app/data"
else
  echo "[ENTRYPOINT] Creating /app/data directory"
  mkdir -p /app/data 2>/dev/null || true
  chmod 777 /app/data 2>/dev/null || true
fi

echo "[ENTRYPOINT] Switching to node user and running: $@"
exec su-exec node:node "$@"

