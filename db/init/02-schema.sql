-- ============================================================
-- EVE Data Aggregator — Full Schema
-- Creates all tables, views, and seed data for all 5 databases.
-- Runs automatically on first MySQL container start.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ─── S0b ─────────────────────────────────────────────────────────────────────
USE S0b;

CREATE TABLE IF NOT EXISTS `1_journal_entries` (
    amount DECIMAL(15, 2),
    balance DECIMAL(15, 2),
    context_id BIGINT,
    context_id_type VARCHAR(255),
    date DATETIME,
    description TEXT,
    first_party_id BIGINT,
    id BIGINT,
    reason TEXT,
    ref_type VARCHAR(255),
    second_party_id BIGINT,
    wallet_division SMALLINT,
    transaction_type TINYINT,
    unique_id VARCHAR(255) GENERATED ALWAYS AS (CONCAT(id, '-', wallet_division)) STORED,
    PRIMARY KEY (id, wallet_division),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_date (date),
    INDEX idx_context_id_type (context_id_type)
);

CREATE TABLE IF NOT EXISTS `2_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `3_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `4_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `5_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `6_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `7_journal_entries` LIKE S0b.`1_journal_entries`;

CREATE TABLE IF NOT EXISTS tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    access_token TEXT NOT NULL,
    expires_in INT NOT NULL,
    token_type VARCHAR(50),
    refresh_token TEXT NOT NULL,
    scp VARCHAR(255),
    sub VARCHAR(255),
    name VARCHAR(255),
    owner VARCHAR(255),
    exp INT NOT NULL,
    job VARCHAR(255),
    UNIQUE INDEX uq_tokens_job (job)
);

CREATE TABLE IF NOT EXISTS wallets (
    Id INT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL
);

INSERT IGNORE INTO wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'S0b Market Account'),
(3, 'S0b Sov Expense Account'),
(4, 'Srp Alliance Fund'),
(5, 'S0b Buy Back Account'),
(6, 'S0b Production Wallet'),
(7, 'S0b Rental Wallet');

CREATE OR REPLACE VIEW S0b.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`1_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`2_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`3_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`4_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`5_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`6_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b.`7_journal_entries`;

-- ─── S0b_Struct ──────────────────────────────────────────────────────────────
USE S0b_Struct;

CREATE TABLE IF NOT EXISTS `1_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `2_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `3_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `4_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `5_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `6_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `7_journal_entries` LIKE S0b.`1_journal_entries`;

CREATE TABLE IF NOT EXISTS tokens LIKE S0b.tokens;

CREATE TABLE IF NOT EXISTS wallets LIKE S0b.wallets;

INSERT IGNORE INTO wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'Structures'),
(3, 'System Upgrades'),
(4, 'Structure Upgrades'),
(5, 'Fuel Wallet'),
(6, 'Ore Tax'),
(7, 'Overflow');

CREATE TABLE IF NOT EXISTS contract (
    acceptor_id BIGINT,
    assignee_id BIGINT,
    availability VARCHAR(20),
    collateral DECIMAL(18,2),
    contract_id BIGINT PRIMARY KEY,
    date_accepted DATETIME,
    date_completed DATETIME,
    date_expired DATETIME,
    date_issued DATETIME,
    days_to_complete INT,
    end_location_id BIGINT,
    for_corporation BOOLEAN,
    issuer_corporation_id BIGINT,
    issuer_id BIGINT,
    price DECIMAL(18,2),
    reward DECIMAL(18,2),
    start_location_id BIGINT,
    status VARCHAR(20),
    title TEXT,
    type VARCHAR(50),
    volume DECIMAL(18,2),
    character_name VARCHAR(100),
    contract_type VARCHAR(100),
    total_value DECIMAL(20,2)
);

CREATE OR REPLACE VIEW S0b_Struct.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`1_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`2_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`3_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`4_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`5_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`6_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Struct.`7_journal_entries`;

-- ─── Ven0m ───────────────────────────────────────────────────────────────────
USE Ven0m;

CREATE TABLE IF NOT EXISTS `1_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `2_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `3_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `4_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `5_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `6_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `7_journal_entries` LIKE S0b.`1_journal_entries`;

CREATE TABLE IF NOT EXISTS tokens LIKE S0b.tokens;

CREATE TABLE IF NOT EXISTS wallets LIKE S0b.wallets;

INSERT IGNORE INTO wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'S0B Holdings - AT WALLET'),
(3, 'Spending Account'),
(4, 'Payroll Account'),
(5, 'Contract Account'),
(6, 'Maintenance Account'),
(7, 'Savings Account');

CREATE OR REPLACE VIEW Ven0m.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`1_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`2_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`3_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`4_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`5_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`6_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM Ven0m.`7_journal_entries`;

-- ─── KryTek ──────────────────────────────────────────────────────────────────
USE KryTek;

CREATE TABLE IF NOT EXISTS `1_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `2_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `3_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `4_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `5_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `6_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `7_journal_entries` LIKE S0b.`1_journal_entries`;

CREATE TABLE IF NOT EXISTS tokens LIKE S0b.tokens;

CREATE TABLE IF NOT EXISTS wallets LIKE S0b.wallets;

INSERT IGNORE INTO wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'Spending Account'),
(3, 'BPO Account'),
(4, 'unused'),
(5, 'unused 1'),
(6, 'unused 2'),
(7, 'unused 3');

CREATE OR REPLACE VIEW KryTek.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`1_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`2_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`3_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`4_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`5_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`6_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM KryTek.`7_journal_entries`;

-- ─── S0b_Mart ────────────────────────────────────────────────────────────────
USE S0b_Mart;

CREATE TABLE IF NOT EXISTS `1_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `2_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `3_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `4_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `5_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `6_journal_entries` LIKE S0b.`1_journal_entries`;
CREATE TABLE IF NOT EXISTS `7_journal_entries` LIKE S0b.`1_journal_entries`;

CREATE TABLE IF NOT EXISTS tokens LIKE S0b.tokens;

CREATE TABLE IF NOT EXISTS wallets LIKE S0b.wallets;

INSERT IGNORE INTO wallets (Id, Name) VALUES
(1, 'Master Wallet - Moon Goo'),
(2, 'Seeding'),
(3, 'Unused 3'),
(4, 'Unused 4'),
(5, 'Unused 5'),
(6, 'Unused 6'),
(7, 'Unused 7');

CREATE OR REPLACE VIEW S0b_Mart.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`1_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`2_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`3_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`4_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`5_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`6_journal_entries` UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date FROM S0b_Mart.`7_journal_entries`;
