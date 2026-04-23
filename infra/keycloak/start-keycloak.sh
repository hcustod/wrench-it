#!/usr/bin/env bash
set -euo pipefail

/opt/keycloak/bin/kc.sh start-dev \
  --http-port=8082 \
  --hostname-strict=false