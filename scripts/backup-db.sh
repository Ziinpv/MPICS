#!/usr/bin/env bash
# Backup Postgres từ container mpcis-postgres
# Usage: ./scripts/backup-db.sh [output-dir]
set -euo pipefail
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$OUT_DIR/mpcis_${STAMP}.sql.gz"
docker exec mpcis-postgres pg_dump -U mpcis -d mpcis | gzip > "$FILE"
echo "Backup OK: $FILE"
