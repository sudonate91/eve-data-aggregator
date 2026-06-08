-- ============================================================
-- EVE Data Aggregator — Database & User Bootstrap
-- Runs automatically on first MySQL container start via
-- /docker-entrypoint-initdb.d/
-- ============================================================

-- Create all five corporation databases
CREATE DATABASE IF NOT EXISTS S0b CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS S0b_Struct CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS Ven0m CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS KryTek CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS S0b_Mart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user (password set via MYSQL_APP_PASSWORD env var at container start)
CREATE USER IF NOT EXISTS 'S0b_Admin'@'%' IDENTIFIED BY 'changeme';

-- Grant full access to all corp databases
GRANT ALL PRIVILEGES ON S0b.*        TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON S0b_Struct.* TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON Ven0m.*      TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON KryTek.*     TO 'S0b_Admin'@'%';
GRANT ALL PRIVILEGES ON S0b_Mart.*   TO 'S0b_Admin'@'%';

FLUSH PRIVILEGES;
