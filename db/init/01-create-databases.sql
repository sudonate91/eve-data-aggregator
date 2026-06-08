-- ============================================================
-- EVE Data Aggregator — Database & User Bootstrap
-- Runs automatically on first MySQL container start via
-- /docker-entrypoint-initdb.d/
--
-- Users:
--   S0b_Admin  — app read/write user, created automatically by MySQL
--                from MYSQL_USER / MYSQL_PASSWORD env vars on the container.
--                No password is hardcoded here.
--
--   eve_readonly — read-only user for PowerBI / Workbench / reporting tools.
--                  Password is set from the MYSQL_READONLY_PASSWORD env var
--                  via db/init/00-readonly-user.sh (runs before this file).
-- ============================================================

-- Create the extra four databases (MySQL auto-creates MYSQL_DATABASE for S0b)
CREATE DATABASE IF NOT EXISTS S0b CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS S0b_Struct CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS Ven0m CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS KryTek CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS S0b_Mart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant S0b_Admin (created by MySQL from MYSQL_USER/MYSQL_PASSWORD) access to all DBs.
-- MYSQL_DATABASE only grants access to the one DB named there; we extend it here.
GRANT ALL PRIVILEGES ON S0b.*        TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON S0b_Struct.* TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON Ven0m.*      TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON KryTek.*     TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON S0b_Mart.*   TO 'S0b_Admin'@'%';

FLUSH PRIVILEGES;
