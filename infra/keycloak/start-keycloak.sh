#!/bin/sh
set -eu

mkdir -p /opt/keycloak/data/import
cp /opt/keycloak/data/import-template/wrench-it-realm.json /opt/keycloak/data/import/wrench-it-realm.json
sed -i "s|__KEYCLOAK_DEMO_USER_PASSWORD__|${KEYCLOAK_DEMO_USER_PASSWORD}|g" /opt/keycloak/data/import/wrench-it-realm.json
sed -i "s|__KEYCLOAK_DEMO_ADMIN_PASSWORD__|${KEYCLOAK_DEMO_ADMIN_PASSWORD}|g" /opt/keycloak/data/import/wrench-it-realm.json

KEYCLOAK_START_MODE="${KEYCLOAK_START_MODE:-start}"
KEYCLOAK_HTTP_PORT="${KC_HTTP_PORT:-8080}"
KEYCLOAK_PROXY_HEADERS="${KC_PROXY_HEADERS:-xforwarded}"
KEYCLOAK_HOSTNAME_STRICT="${KC_HOSTNAME_STRICT:-false}"

set -- /opt/keycloak/bin/kc.sh "$KEYCLOAK_START_MODE" \
  --import-realm \
  --http-enabled=true \
  --http-port="$KEYCLOAK_HTTP_PORT" \
  --proxy-headers="$KEYCLOAK_PROXY_HEADERS" \
  --hostname-strict="$KEYCLOAK_HOSTNAME_STRICT"

if [ -n "${KC_HOSTNAME:-}" ]; then
  set -- "$@" --hostname="$KC_HOSTNAME"
fi

exec "$@"
