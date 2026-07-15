#!/usr/bin/env bash
set -euo pipefail

# Einmalig auf dem frischen Hetzner VPS (Ubuntu/Debian) als root ausführen.
echo "==> System aktualisieren"
apt-get update && apt-get upgrade -y

echo "==> Basis-Pakete"
apt-get install -y ca-certificates curl git ufw

echo "==> Docker installieren"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Firewall (SSH + HTTP/S)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> App-Verzeichnis"
mkdir -p /opt/cardportfolio
echo "Fertig. Als Nächstes: Projekt nach /opt/cardportfolio deployen."