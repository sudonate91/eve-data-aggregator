#!/usr/bin/env bash
# ============================================================
# EVE Data Aggregator — Migration Helper
# Imports a mysqldump file into the containerized MySQL (eve-mysql).
#
# Usage:
#   bash db/migrate.sh <path-to-dump.sql>
#
# Example:
#   bash db/migrate.sh eve-migration.sql
#
# The dump should contain all five databases:
#   S0b, S0b_Struct, Ven0m, KryTek, S0b_Mart
#
# Run from the project root on Unraid SSH (or any host with Docker).
# ============================================================

set -euo pipefail

DUMP_FILE="${1:-}"
CONTAINER="eve-mysql"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"

if [[ -z "$DUMP_FILE" ]]; then
  echo "Usage: bash db/migrate.sh <path-to-dump.sql>"
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Error: file not found: $DUMP_FILE"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Error: container '${CONTAINER}' is not running."
  echo "Start it first: docker start ${CONTAINER}"
  exit 1
fi

if [[ -z "$MYSQL_ROOT_PASSWORD" ]]; then
  read -rsp "MySQL root password for ${CONTAINER}: " MYSQL_ROOT_PASSWORD
  echo
fi

echo "Importing ${DUMP_FILE} into ${CONTAINER} ..."
docker exec -i "$CONTAINER" \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" < "$DUMP_FILE"

echo "Done. All databases imported successfully."
