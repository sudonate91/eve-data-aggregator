-- Create the table
CREATE TABLE wallets (
    Id INT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL
);

-- Insert the data
INSERT INTO wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'S0b Market Account'),
(3, 'S0b Sov Expense Account'),
(4, 'Srp Alliance Fund'),
(5, 'S0b Buy Back Account'),
(6, 'S0b Production Wallet'),
(7, 'S0b Rental Wallet');


-- Insert the data
INSERT INTO S0b_Struct.wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'Structures'),
(3, 'System Upgrades'),
(4, 'Structure Upgrades'),
(5, 'Fuel Wallet'),
(6, 'Ore Tax'),
(7, 'Overflow');


-- Insert the data
INSERT INTO Ven0m.wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'S0B Holdings - AT WALLET'),
(3, 'Spending Account'),
(4, 'Payroll Account'),
(5, 'Contract Account'),
(6, 'Maintenance Account'),
(7, 'Savings Account');


-- Insert the data
INSERT INTO KryTek.wallets (Id, Name) VALUES
(1, 'Master Wallet'),
(2, 'Spending Account'),
(3, 'BPO Account'),
(4, 'unused'),
(5, 'unused 1'),
(6, 'unused 2'),
(7, 'unused 3');


-- Insert the data
INSERT INTO S0b_Mart.wallets (Id, Name) VALUES
(1, 'Master Wallet - Moon Goo'),
(2, 'Seeding'),
(3, 'Unused 3'),
(4, 'Unused 4'),
(5, 'Unused 5'),
(6, 'Unused 6'),
(7, 'Unused 7');

