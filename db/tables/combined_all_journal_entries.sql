-- Create the combined view in the S0b database
USE S0b;

CREATE OR REPLACE VIEW combined_all_journal_entries AS 
-- S0b Holdings
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.1_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.2_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.3_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.4_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.5_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.6_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Holdings' AS corporation
FROM S0b.7_journal_entries AS je JOIN S0b.wallets AS w ON je.wallet_division = w.Id
-- S0b Structure Management
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.1_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.2_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.3_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.4_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.5_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.6_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b Structure Management' AS corporation
FROM S0b_Struct.7_journal_entries AS je JOIN S0b_Struct.wallets AS w ON je.wallet_division = w.Id
-- Ven0m
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.1_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.2_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.3_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.4_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.5_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.6_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'Ven0m' AS corporation
FROM Ven0m.7_journal_entries AS je JOIN Ven0m.wallets AS w ON je.wallet_division = w.Id
-- KryTek Armaments
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.1_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.2_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.3_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.4_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.5_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.6_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'KryTek Armaments' AS corporation
FROM KryTek.7_journal_entries AS je JOIN KryTek.wallets AS w ON je.wallet_division = w.Id
-- S0b-Mart
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.1_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.2_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.3_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.4_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.5_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.6_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id
UNION ALL
SELECT je.amount, je.balance, je.context_id, je.context_id_type, je.date, je.description, 
       je.first_party_id, je.id, je.reason, je.ref_type, je.second_party_id, 
       je.wallet_division, je.transaction_type, je.unique_id,
       CAST(je.date AS DATE) AS entry_date, w.Name AS wallet_division_name, 'S0b-Mart' AS corporation
FROM S0b_Mart.7_journal_entries AS je JOIN S0b_Mart.wallets AS w ON je.wallet_division = w.Id;
