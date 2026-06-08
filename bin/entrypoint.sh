#!/bin/bash
# ============================================================
# EVE Data Aggregator — Container Entrypoint
#
# 1. On first boot (empty /var/lib/mysql): initialise MySQL,
#    create databases/users, run schema scripts.
# 2. Start mysqld in the background.
# 3. Wait until MySQL is ready to accept connections.
# 4. Hand off to node bin/index.mjs.
# ============================================================

set -euo pipefail

MYSQL_DATA_DIR="/var/lib/mysql"
INIT_DONE_MARKER="${MYSQL_DATA_DIR}/.eve_initialized"

# ── Helper: wait for MySQL to be ready ──────────────────────────────────────
wait_for_mysql() {
  echo "[entrypoint] Waiting for MySQL to be ready..."
  local retries=30
  while ! mysqladmin ping -u root --password="${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; do
    retries=$((retries - 1))
    if [ "$retries" -eq 0 ]; then
      echo "[entrypoint] ERROR: MySQL did not become ready in time."
      exit 1
    fi
    sleep 2
  done
  echo "[entrypoint] MySQL is ready."
}

# ── First boot: initialise MySQL data directory ──────────────────────────────
if [ ! -f "${INIT_DONE_MARKER}" ]; then
  echo "[entrypoint] First boot detected — initialising MySQL..."

  # Initialise the data directory (creates system tables, no root password yet)
  mysqld --initialize-insecure --user=mysql --datadir="${MYSQL_DATA_DIR}"

  # Start MySQL temporarily to run setup SQL
  mysqld --user=mysql --daemonize --pid-file=/run/mysqld/mysqld.pid

  # Wait for the temp server
  local_retries=30
  while ! mysqladmin ping -u root --silent 2>/dev/null; do
    local_retries=$((local_retries - 1))
    [ "$local_retries" -eq 0 ] && { echo "[entrypoint] ERROR: temp MySQL did not start."; exit 1; }
    sleep 2
  done

  echo "[entrypoint] Running first-boot SQL setup..."

  # Set root password
  mysql -u root <<-EOSQL
    ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
    FLUSH PRIVILEGES;
EOSQL

  # Run init scripts in order (00-readonly-user.sh, 01-create-databases.sql, 02-schema.sql)
  for f in /app/db/init/00-readonly-user.sh \
            /app/db/init/01-create-databases.sql \
            /app/db/init/02-schema.sql; do
    echo "[entrypoint] Running: $(basename "$f")"
    case "$f" in
      *.sh)
        # Source so it can use MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD env vars
        MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}" \
        MYSQL_PASSWORD="${DB_PASSWORD}" \
        MYSQL_READONLY_PASSWORD="${MYSQL_READONLY_PASSWORD:-${DB_PASSWORD}}" \
          bash "$f"
        ;;
      *.sql)
        mysql -u root --password="${MYSQL_ROOT_PASSWORD}" < "$f"
        ;;
    esac
  done

  # Also create S0b_Admin user with the correct password (mirrors MYSQL_USER/MYSQL_PASSWORD)
  mysql -u root --password="${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON S0b.*        TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON S0b_Struct.* TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON Ven0m.*      TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON KryTek.*     TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON S0b_Mart.*   TO '${DB_USER}'@'%';
    FLUSH PRIVILEGES;
EOSQL

  # Allow external connections (bind to all interfaces)
  mkdir -p /etc/mysql/conf.d
  cat > /etc/mysql/conf.d/eve.cnf <<-CNF
[mysqld]
bind-address = 0.0.0.0
port = 3306
CNF

  # Stop temp server gracefully
  mysqladmin -u root --password="${MYSQL_ROOT_PASSWORD}" shutdown || true
  sleep 3

  touch "${INIT_DONE_MARKER}"
  echo "[entrypoint] First-boot init complete."
else
  echo "[entrypoint] MySQL data directory exists — skipping init."
fi

# ── Start MySQL for real ─────────────────────────────────────────────────────
echo "[entrypoint] Starting MySQL server..."
mkdir -p /run/mysqld
chown mysql:mysql /run/mysqld 2>/dev/null || true

mysqld --user=mysql \
       --bind-address=0.0.0.0 \
       --port=3306 \
       --daemonize \
       --pid-file=/run/mysqld/mysqld.pid

wait_for_mysql

echo "[entrypoint] Starting EVE Data Aggregator..."
exec node /app/bin/index.mjs
