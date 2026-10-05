#! /usr/bin/env bash
# Backend pytest against an isolated TEST database (app_test).
#
# The test teardown deletes all users, boards and post-its, so running pytest
# against the dev database (app) would wipe your local data. This script points
# everything at app_test instead. The dev database is never touched.
#
# Usage: bash scripts/test-backend-local.sh [pytest-args...]
# Example: bash scripts/test-backend-local.sh backend/tests/api/routes/test_postits.py -q

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env in the project root (see development.md)." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}"
TEST_DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/app_test"

# Ensure postgres is up and healthy (port 5432 must be reachable locally).
docker compose up -d --wait db

# Create the test database once; no-op when it already exists.
if ! docker compose exec -T db psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='app_test';" | grep -q 1; then
  docker compose exec -T db psql -U postgres -c "CREATE DATABASE app_test;"
fi

# Migrate + seed the TEST database only (respects DATABASE_URL from env).
# uv run provides the venv (PYTHONPATH/PATH) exactly like development.md.
cd backend
DATABASE_URL="${TEST_DATABASE_URL}" uv run bash scripts/prestart.sh
cd ..

# Run the suite against the TEST database only.
DATABASE_URL="${TEST_DATABASE_URL}" uv run --project backend pytest backend/tests "$@"
