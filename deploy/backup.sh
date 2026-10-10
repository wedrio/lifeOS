#!/usr/bin/env bash
# lifeOS 数据库备份：pg_dump → gzip，保留最近 14 份
# 用法：在服务器仓库根目录执行  bash deploy/backup.sh   （建议挂 cron 每日一次）
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source deploy/.env.prod; set +a
BACKUP_DIR=${BACKUP_DIR:-deploy/backups}
STAMP=$(date +%F_%H%M)
OUT="$BACKUP_DIR/lifeos-$STAMP.sql.gz"
mkdir -p "$BACKUP_DIR"

docker compose -f deploy/docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-lifeos}" lifeos | gzip > "$OUT"

find "$BACKUP_DIR" -name 'lifeos-*.sql.gz' -mtime +14 -delete
echo "✓ backup: $OUT"
