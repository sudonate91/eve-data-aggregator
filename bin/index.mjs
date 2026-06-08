#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import { runOAuthFlow } from '../src/lib/eve-esi/esiOauthNative.mjs';
import { importWalletData } from '../src/lib/eve-esi/walletService.mjs';
import { importCorporationContracts } from '../src/lib/eve-esi/contractService.mjs';
import dotenv from 'dotenv';
import sequelize from '../src/utils/sequelizeClient.mjs';
import structSequelize from '../src/utils/structSequelizeClient.mjs';
import ven0mSequelize from '../src/utils/ven0mSequelizeClient.mjs';
import krytekSequelize from '../src/utils/krytekSequelizeClient.mjs';
import s0bMartSequelize from '../src/utils/s0bMartSequelizeClient.mjs';
import { importCsvToDb } from '../src/utils/csvWalletHistory.mjs';

dotenv.config();

program.version('1.0.0').description('My Node CLI');

console.log(
  chalk.yellow(
    figlet.textSync('Eve Data Aggregator', { horizontalLayout: 'full' }),
  ),
);

let jobSelections = {};

const runJobs = async () => {
  if (
    !jobSelections.importS0bHoldingsWalletData &&
    !jobSelections.importCsvToDb &&
    !jobSelections.importS0bStructureManagementWalletData &&
    !jobSelections.importVen0mWalletData &&
    !jobSelections.importKryTekWalletData &&
    !jobSelections.importS0bMartWalletData &&
    !jobSelections.importS0bStructContracts
  ) {
    jobSelections = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'importS0bHoldingsWalletData',
        message: 'Do you want to run importWalletData?',
        default: false,
      },
      // {
      //   type: 'confirm',
      //   name: 'importCsvToDb',
      //   message: 'Do you want to import CSV data to the database?',
      //   default: false,
      // },
      {
        type: 'confirm',
        name: 'importS0bStructureManagementWalletData',
        message: 'Do you want to import S0b Structure Management Wallet Data?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'importVen0mWalletData',
        message: 'Do you want to import Ven0m Wallet Data?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'importKryTekWalletData',
        message: 'Do you want to import KryTek Wallet Data?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'importS0bMartWalletData',
        message: 'Do you want to import S0b-Mart Wallet Data?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'importS0bStructContracts',
        message: 'Do you want to import S0b_Struct Contracts?',
        default: false,
      },
      // Add more prompts for other jobs here
    ]);
  }

  if (jobSelections.importS0bHoldingsWalletData) {
    try {
      const authData = await runOAuthFlow(
        'importS0bHoldingsWalletData',
        sequelize,
      );
      const { jwt, accessToken } = authData;
      await importWalletData(
        jwt,
        accessToken,
        sequelize,
        process.env.CORPORATION_ID,
      );
      console.log(
        chalk.green('importS0bHoldingsWalletData completed successfully.'),
      );
    } catch (error) {
      console.error(
        chalk.red(`Error during importWalletData: ${error.message}`),
      );
    }
  }

  if (jobSelections.importCsvToDb) {
    try {
      await importCsvToDb();
      console.log(chalk.green('importCsvToDb completed successfully.'));
    } catch (error) {
      console.error(chalk.red(`Error during importCsvToDb: ${error.message}`));
    }
  }

  if (jobSelections.importS0bStructureManagementWalletData) {
    try {
      const authData = await runOAuthFlow(
        'importS0bStructureManagementWalletData',
        structSequelize,
      );
      const { jwt, accessToken } = authData;
      await importWalletData(
        jwt,
        accessToken,
        structSequelize,
        process.env.STRUCT_CORPORATION_ID,
      );
      console.log(
        chalk.green(
          'importS0bStructureManagementWalletData completed successfully.',
        ),
      );
    } catch (error) {
      console.error(
        chalk.red(
          `Error during importStructureManagementWalletData: ${error.message}`,
        ),
      );
    }
  }

  if (jobSelections.importVen0mWalletData) {
    try {
      const authData = await runOAuthFlow(
        'importVen0mWalletData',
        ven0mSequelize,
      );
      const { jwt, accessToken } = authData;
      await importWalletData(
        jwt,
        accessToken,
        ven0mSequelize,
        process.env.VEN0M_CORPORATION_ID,
      );
      console.log(chalk.green('importVen0mWalletData completed successfully.'));
    } catch (error) {
      console.error(
        chalk.red(`Error during importVen0mWalletData: ${error.message}`),
      );
    }
  }

  if (jobSelections.importKryTekWalletData) {
    try {
      const authData = await runOAuthFlow(
        'importKryTekWalletData',
        krytekSequelize,
      );
      const { jwt, accessToken } = authData;
      await importWalletData(
        jwt,
        accessToken,
        krytekSequelize,
        process.env.KRYTEK_CORPORATION_ID,
      );
      console.log(chalk.green('importKryTekWalletData completed successfully.'));
    } catch (error) {
      console.error(
        chalk.red(`Error during importKryTekWalletData: ${error.message}`),
      );
    }
  }

  if (jobSelections.importS0bMartWalletData) {
    try {
      const authData = await runOAuthFlow(
        'importS0bMartWalletData',
        s0bMartSequelize,
      );
      const { jwt, accessToken } = authData;
      await importWalletData(
        jwt,
        accessToken,
        s0bMartSequelize,
        process.env.S0B_MART_CORPORATION_ID,
      );
      console.log(chalk.green('importS0bMartWalletData completed successfully.'));
    } catch (error) {
      console.error(
        chalk.red(`Error during importS0bMartWalletData: ${error.message}`),
      );
    }
  }

  if (jobSelections.importS0bStructContracts) {
    try {
      const authData = await runOAuthFlow(
        'importS0bStructContracts',
        structSequelize,
      );
      const { jwt, accessToken } = authData;
      await importCorporationContracts(
        jwt,
        accessToken,
        process.env.STRUCT_CORPORATION_ID,
        structSequelize,
      );
      console.log(
        chalk.green('importS0bStructContracts completed successfully.'),
      );
    } catch (error) {
      console.error(
        chalk.red(`Error during importS0bStructContracts: ${error.message}`),
      );
    }
  }

  // Add more job executions here based on user answers
};

const initialize = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      chalk.green(
        'Database connection to S0b has been established successfully.',
      ),
    );

    await structSequelize.authenticate();
    console.log(
      chalk.green(
        'Database connection to S0b_Struct has been established successfully.',
      ),
    );

    await krytekSequelize.authenticate();
    console.log(
      chalk.green(
        'Database connection to KryTek has been established successfully.',
      ),
    );

    await s0bMartSequelize.authenticate();
    console.log(
      chalk.green(
        'Database connection to S0b_Mart has been established successfully.',
      ),
    );
  } catch (err) {
    console.error(chalk.red('Unable to connect to the database:', err));
    process.exit(1);
  }
};

const main = async () => {
  await initialize();

  const intervalAnswer = await inquirer.prompt([
    {
      type: 'input',
      name: 'interval',
      message:
        'Enter the interval in minutes to repeat the jobs (leave blank for no repeat):',
      validate: (input) => {
        if (input === '' || !isNaN(input)) {
          return true;
        }
        return 'Please enter a valid number.';
      },
    },
  ]);

  const intervalMs = intervalAnswer.interval
    ? parseInt(intervalAnswer.interval) * 60 * 1000
    : null;

  await runJobs();

  let iterationCount = 0;

  if (intervalMs) {
    setInterval(async () => {
      iterationCount++;
      console.log(chalk.blue(`Iteration count: ${iterationCount}`));
      await runJobs();
    }, intervalMs);
  }
};

program.action(async () => {
  await main();
});

program.parse(process.argv);
