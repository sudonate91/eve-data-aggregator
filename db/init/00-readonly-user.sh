#!/bin/bash
# ============================================================
# EVE Data Aggregator — Read-Only User Setup
# Creates the eve_readonly user for PowerBI / reporting tools.
#
# Password source: MYSQL_READONLY_PASSWORD env var on the container.
# If not set, defaults to the same value as MYSQL_PASSWORD so there
# is only one password to remember during initial setup.
#
# Connection details for PowerBI / MySQL Workbench:
#   Host:     <unraid-ip>
#   Port:     3307
#   Username: eve_readonly
#   Password: value of MYSQL_READONLY_PASSWORD (or MYSQL_PASSWORD if not set)
# ============================================================

set -euo pipefail

READONLY_PASSWORD="${MYSQL_READONLY_PASSWORD:-${MYSQL_PASSWORD}}"

SOCKET="${MYSQL_SOCKET:-/run/mysqld/mysqld.sock}"
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" --socket="${SOCKET}" <<-EOSQL
    -- Create or update read-only user (password may have changed)
    CREATE USER IF NOT EXISTS 'eve_readonly'@'%' IDENTIFIED BY '${READONLY_PASSWORD}';
    ALTER USER 'eve_readonly'@'%' IDENTIFIED BY '${READONLY_PASSWORD}';

    -- Grant SELECT on all tables AND views
    GRANT SELECT ON S0b.*        TO 'eve_readonly'@'%';
    GRANT SELECT ON S0b_Struct.* TO 'eve_readonly'@'%';
    GRANT SELECT ON Ven0m.*      TO 'eve_readonly'@'%';
    GRANT SELECT ON KryTek.*     TO 'eve_readonly'@'%';
    GRANT SELECT ON S0b_Mart.*   TO 'eve_readonly'@'%';

    -- Grant SHOW VIEW so user can see view definitions (helpful for PowerBI)
    GRANT SHOW VIEW ON S0b.*        TO 'eve_readonly'@'%';
    GRANT SHOW VIEW ON S0b_Struct.* TO 'eve_readonly'@'%';
    GRANT SHOW VIEW ON Ven0m.*      TO 'eve_readonly'@'%';
    GRANT SHOW VIEW ON KryTek.*     TO 'eve_readonly'@'%';
    GRANT SHOW VIEW ON S0b_Mart.*   TO 'eve_readonly'@'%';

    FLUSH PRIVILEGES;
EOSQL

echo "eve_readonly user created successfully."
