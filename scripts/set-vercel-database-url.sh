#!/usr/bin/env bash
# Setzt DATABASE_URL in Vercel Production und deployed neu.
# Nutzung:
#   ./scripts/set-vercel-database-url.sh 'postgresql://user:pass@host/db?sslmode=require'
set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Usage: $0 'postgresql://USER:PASS@HOST/DB?sslmode=require'"
  exit 1
fi

if [[ ! "$URL" =~ ^postgres(ql)?:// ]]; then
  echo "Fehler: URL muss mit postgresql:// oder postgres:// beginnen."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Vercel Env DATABASE_URL (Production) setzen …"
# Alte Variable entfernen (ignoriert Fehler, falls nicht vorhanden)
vercel env rm DATABASE_URL production --yes 2>/dev/null || true

# Neu anlegen (stdin)
printf '%s' "$URL" | vercel env add DATABASE_URL production

echo "==> Production-Deploy …"
vercel --prod --yes

echo ""
echo "Fertig. Prüfen:"
echo "  curl -s https://cardportfolio-eta.vercel.app/api/health | jq ."
