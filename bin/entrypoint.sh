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

set -uo pipefail

MYSQL_DATA_DIR="/var/lib/mysql"
INIT_DONE_MARKER="${MYSQL_DATA_DIR}/.eve_initialized"
PASSWORDS_FILE="${MYSQL_DATA_DIR}/.eve_passwords"

# ── Auto-manage MySQL passwords ──────────────────────────────────────────────
# On first boot: generate passwords if not set by user, persist them.
# On subsequent boots: reload from file so the app always has them.
if [ -f "${PASSWORDS_FILE}" ]; then
  # Reload persisted passwords (may override blank env vars)
  # shellcheck source=/dev/null
  source "${PASSWORDS_FILE}"
else
  # Generate any missing passwords
  MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)}"
  DB_USER="${DB_USER:-S0b_Admin}"
  DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)}"
  MYSQL_READONLY_PASSWORD="${MYSQL_READONLY_PASSWORD:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)}"
  # Persist for future boots (file lives inside the named volume)
  mkdir -p "${MYSQL_DATA_DIR}"
  cat > "${PASSWORDS_FILE}" <<-EOF
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}"
export DB_USER="${DB_USER}"
export DB_PASSWORD="${DB_PASSWORD}"
export MYSQL_READONLY_PASSWORD="${MYSQL_READONLY_PASSWORD}"
EOF
  chmod 600 "${PASSWORDS_FILE}"
fi

# Re-export so child processes (mysqld, node) see them
export MYSQL_ROOT_PASSWORD DB_USER DB_PASSWORD MYSQL_READONLY_PASSWORD

# ── Helper: wait for MySQL to be ready ──────────────────────────────────────
wait_for_mysql() {
  echo "[entrypoint] Waiting for MySQL to be ready..."
  local retries=30
  while ! /usr/bin/mysqladmin ping -u root --password="${MYSQL_ROOT_PASSWORD}" --socket=/run/mysqld/mysqld.sock --silent 2>/dev/null; do
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

  echo "[entrypoint] Creating directories..."
  mkdir -p "${MYSQL_DATA_DIR}" /run/mysqld /var/log/mysql
  echo "[entrypoint] Setting ownership..."
  chown -R mysql:mysql "${MYSQL_DATA_DIR}" /run/mysqld /var/log/mysql
  chmod 750 "${MYSQL_DATA_DIR}"
  echo "[entrypoint] Running mysqld --initialize-insecure..."
  /usr/sbin/mysqld --initialize-insecure --user=mysql --datadir="${MYSQL_DATA_DIR}" 2>&1
  echo "[entrypoint] mysqld init complete (exit $?)"

  # Start MySQL temporarily to run setup SQL (skip-networking so no external access yet)
  /usr/sbin/mysqld --user=mysql --skip-networking --socket=/run/mysqld/mysqld.sock &
  MYSQL_TEMP_PID=$!

  # Wait for the temp server
  local_retries=30
  while ! /usr/bin/mysqladmin ping --socket=/run/mysqld/mysqld.sock --silent 2>/dev/null; do
    local_retries=$((local_retries - 1))
    [ "$local_retries" -eq 0 ] && { echo "[entrypoint] ERROR: temp MySQL did not start."; exit 1; }
    sleep 2
  done

  echo "[entrypoint] Running first-boot SQL setup..."

  # Set root password
  /usr/bin/mysql -u root --socket=/run/mysqld/mysqld.sock <<-EOSQL
    ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
    FLUSH PRIVILEGES;
EOSQL

  # Run init scripts in order
  for f in /app/db/init/00-readonly-user.sh \
            /app/db/init/01-create-databases.sql \
            /app/db/init/02-schema.sql; do
    echo "[entrypoint] Running: $(basename "$f")"
    case "$f" in
      *.sh)
        MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD}" \
        MYSQL_PASSWORD="${DB_PASSWORD}" \
        MYSQL_READONLY_PASSWORD="${MYSQL_READONLY_PASSWORD:-${DB_PASSWORD}}" \
        MYSQL_SOCKET=/run/mysqld/mysqld.sock \
          bash "$f"
        ;;
      *.sql)
        /usr/bin/mysql -u root --password="${MYSQL_ROOT_PASSWORD}" --socket=/run/mysqld/mysqld.sock < "$f"
        ;;
    esac
  done

  # Create app user
  /usr/bin/mysql -u root --password="${MYSQL_ROOT_PASSWORD}" --socket=/run/mysqld/mysqld.sock <<-EOSQL
    CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
    GRANT ALL PRIVILEGES ON S0b.*        TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON S0b_Struct.* TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON Ven0m.*      TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON KryTek.*     TO '${DB_USER}'@'%';
    GRANT ALL PRIVILEGES ON S0b_Mart.*   TO '${DB_USER}'@'%';
    FLUSH PRIVILEGES;
EOSQL

  # Allow external connections
  mkdir -p /etc/mysql/conf.d
  cat > /etc/mysql/conf.d/eve.cnf <<-CNF
[mysqld]
bind-address = 0.0.0.0
port = 3306
CNF

  # Stop temp server gracefully
  /usr/bin/mysqladmin -u root --password="${MYSQL_ROOT_PASSWORD}" --socket=/run/mysqld/mysqld.sock shutdown || true
  wait $MYSQL_TEMP_PID 2>/dev/null || true
  sleep 2

  touch "${INIT_DONE_MARKER}"
  echo "[entrypoint] First-boot init complete."
else
  echo "[entrypoint] MySQL data directory exists — skipping init."
fi

# ── Start MySQL for real ─────────────────────────────────────────────────────
echo "[entrypoint] Starting MySQL server..."
mkdir -p /run/mysqld /var/log/mysql
chown -R mysql:mysql /run/mysqld /var/log/mysql "${MYSQL_DATA_DIR}"

/usr/sbin/mysqld --user=mysql \
       --bind-address=0.0.0.0 \
       --port=3306 \
       --socket=/run/mysqld/mysqld.sock &

wait_for_mysql

echo "[entrypoint] Starting EVE Data Aggregator..."
exec node /app/bin/index.mjs
