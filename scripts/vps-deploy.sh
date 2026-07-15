#!/usr/bin/env bash
set -euo pipefail

# Lokal ausführen — deployed auf den Hetzner VPS.
# Beispiel:
#   VPS_HOST=123.45.67.89 VPS_USER=root ./scripts/vps-deploy.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VPS_HOST="${VPS_HOST:?VPS_HOST fehlt (z. B. 123.45.67.89)}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/cardportfolio}"

echo "==> Deploy nach ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}"

ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${REMOTE_DIR}"

rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude prisma/dev.db \
  --exclude prisma/dev.db-journal \
  --exclude .env \
  --exclude .env.preview \
  "${ROOT_DIR}/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

ssh "${VPS_USER}@${VPS_HOST}" bash -s <<EOF
set -euo pipefail
cd ${REMOTE_DIR}

if [ ! -f .env.preview ]; then
  echo "FEHLER: .env.preview fehlt auf dem Server."
  echo "Kopiere .env.preview.example nach .env.preview und trage AUTH_SECRET + VPS-IP ein."
  exit 1
fi

docker compose -f docker-compose.preview.yml up -d --build
docker compose -f docker-compose.preview.yml ps
EOF

echo ""
echo "Preview sollte erreichbar sein unter:"
echo "  http://${VPS_HOST}"
echo ""
echo "Falls nicht: ssh ${VPS_USER}@${VPS_HOST} 'cd ${REMOTE_DIR} && docker compose -f docker-compose.preview.yml logs -f'"