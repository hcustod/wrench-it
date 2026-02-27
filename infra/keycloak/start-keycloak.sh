#!/bin/sh
set -eu

mkdir -p /opt/keycloak/data/import
cp /opt/keycloak/data/import-template/wrench-it-realm.json /opt/keycloak/data/import/wrench-it-realm.json
sed -i "s|__KEYCLOAK_DEMO_USER_PASSWORD__|${KEYCLOAK_DEMO_USER_PASSWORD}|g" /opt/keycloak/data/import/wrench-it-realm.json
sed -i "s|__KEYCLOAK_DEMO_ADMIN_PASSWORD__|${KEYCLOAK_DEMO_ADMIN_PASSWORD}|g" /opt/keycloak/data/import/wrench-it-realm.json

exec /opt/keycloak/bin/kc.sh start-dev --import-realm
