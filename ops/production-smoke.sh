#!/usr/bin/env bash
set -euo pipefail

# Canonical production compose flow. Keep the edge and frontend overrides in
# the same invocation so backend is reachable from Nginx and NEXT_PUBLIC_API_URL
# is supplied at image build time.
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.edge.yml -f docker-compose.frontend.yml)
BASE_URL="${BASE_URL:-https://gurvantamir.know.mn}"

"${COMPOSE[@]}" up -d --build backend frontend

for endpoint in / /login /admin/setup /api/health/live /api/health/ready; do
  status="$(curl --silent --show-error --location --insecure --output /dev/null --write-out '%{http_code}' "${BASE_URL}${endpoint}")"
  case "$endpoint" in
    /api/health/live|/api/health/ready)
      [[ "$status" == "200" ]] || { echo "Smoke test failed: ${endpoint} -> ${status}" >&2; exit 1; }
      ;;
    *)
      [[ "$status" == "200" ]] || { echo "Smoke test failed: ${endpoint} -> ${status}" >&2; exit 1; }
      ;;
  esac
  echo "OK ${endpoint} ${status}"
done

echo "Production smoke test passed."
