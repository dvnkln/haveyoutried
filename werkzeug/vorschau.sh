#!/bin/sh
# Startet (oder erneuert) die nginx-Vorschau für den aktuellen Build in dist/.
set -eu
cd "$(dirname "$0")/.."
NAME=haveyoutried-vorschau
BIND=${VORSCHAU_BIND:-192.168.178.17:8081}

if docker container inspect "$NAME" >/dev/null 2>&1; then
  docker restart "$NAME" >/dev/null
else
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "$BIND:80" \
    -v "$PWD/dist:/usr/share/nginx/html:ro" \
    -v "$PWD/werkzeug/nginx-vorschau.conf:/etc/nginx/conf.d/default.conf:ro" \
    nginx:alpine >/dev/null
fi
echo "Vorschau: http://$BIND"
