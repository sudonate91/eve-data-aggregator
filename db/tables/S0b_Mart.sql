-- Create the S0b_Mart database if it doesn't exist
CREATE DATABASE IF NOT EXISTS S0b_Mart;

-- Switch to S0b_Mart database
USE S0b_Mart;

-- Create tables based on S0b structure
CREATE TABLE IF NOT EXISTS 1_journal_entries LIKE S0b.1_journal_entries;
CREATE TABLE IF NOT EXISTS 2_journal_entries LIKE S0b.2_journal_entries;
CREATE TABLE IF NOT EXISTS 3_journal_entries LIKE S0b.3_journal_entries;
CREATE TABLE IF NOT EXISTS 4_journal_entries LIKE S0b.4_journal_entries;
CREATE TABLE IF NOT EXISTS 5_journal_entries LIKE S0b.5_journal_entries;
CREATE TABLE IF NOT EXISTS 6_journal_entries LIKE S0b.6_journal_entries;
CREATE TABLE IF NOT EXISTS 7_journal_entries LIKE S0b.7_journal_entries;
CREATE TABLE IF NOT EXISTS tokens LIKE S0b.tokens;
CREATE TABLE IF NOT EXISTS wallets LIKE S0b.wallets;



CREATE OR REPLACE VIEW S0b_Mart.all_journal_entries AS
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.1_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.2_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.3_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.4_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.5_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.6_journal_entries
UNION ALL
SELECT *, CAST(date AS DATE) AS entry_date
FROM S0b_Mart.7_journal_entries;


GRANT ALL PRIVILEGES ON S0b_Mart.* TO S0b_Admin;
