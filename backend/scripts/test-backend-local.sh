#!/usr/bin/env bash
set -euo pipefail

# Run the backend suite against a throwaway database. The test teardown
# deletes every board, post-it, stroke and user, so this must never point at
# the development database ("app").

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set; check .env}"

TEST_DATABASE="app_test"
TEST_DATABASE_URL="postgresql+psycopg://postgres:${POSTGRES_PASSWORD}@localhost:5432/${TEST_DATABASE}"

docker compose exec -T db psql -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${TEST_DATABASE}'" |
  grep -q 1 ||
  docker compose exec -T db psql -U postgres -d postgres -c \
    "CREATE DATABASE ${TEST_DATABASE}"

cd backend
export DATABASE_URL="$TEST_DATABASE_URL"
uv run bash scripts/prestart.sh
uv run bash scripts/test.sh "$@"
