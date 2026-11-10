#!/bin/sh
# Startet (oder erneuert) die nginx-Vorschau für den aktuellen Build in dist/.
set -eu
cd "$(dirname "$0")/.."
NAME=haveyoutried-vorschau
# Adresse der Vorschau: aus der Umgebung oder aus werkzeug/vorschau.env (lokal, nicht im Repo),
# sonst Port 8081 auf allen Netzwerkschnittstellen (erreichbar im ganzen LAN)
[ -f werkzeug/vorschau.env ] && . werkzeug/vorschau.env
BIND=${VORSCHAU_BIND:-8081}

if docker container inspect "$NAME" >/dev/null 2>&1; then
  docker restart "$NAME" >/dev/null
else
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "$BIND:80" \
    -v "$PWD/dist:/usr/share/nginx/html:ro" \
    -v "$PWD/werkzeug/nginx-vorschau.conf:/etc/nginx/conf.d/default.conf:ro" \
    nginx:alpine >/dev/null
fi
case "$BIND" in
  *:*) echo "Vorschau: http://$BIND" ;;
  # nur ein Port: die erste Adresse dieses Rechners anzeigen
  *) echo "Vorschau: http://$(hostname -I 2>/dev/null | cut -d' ' -f1 || echo localhost):$BIND" ;;
esac
