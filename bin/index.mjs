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

program.version('1.0.0').description('EVE Data Aggregator CLI');

// Check if running in non-interactive mode
const useEnvConfig = process.env.USE_ENV_CONFIG === 'true';

console.log(
  chalk.yellow(
    figlet.textSync('Eve Data Aggregator', { horizontalLayout: 'full' }),
  ),
);

// Load job selections from environment variables or use interactive prompts
const getJobSelections = async () => {
  if (useEnvConfig) {
    console.log(chalk.blue('📝 Using environment variable configuration...'));
    const config = {
      importS0bHoldingsWalletData: process.env.ENABLE_S0B_WALLET === 'true',
      importCsvToDb: process.env.ENABLE_CSV_IMPORT === 'true',
      importS0bStructureManagementWalletData:
        process.env.ENABLE_S0B_STRUCT_WALLET === 'true',
      importVen0mWalletData: process.env.ENABLE_VEN0M_WALLET === 'true',
      importKryTekWalletData: process.env.ENABLE_KRYTEK_WALLET === 'true',
      importS0bMartWalletData: process.env.ENABLE_S0B_MART_WALLET === 'true',
      importS0bStructContracts:
        process.env.ENABLE_S0B_STRUCT_CONTRACTS === 'true',
    };

    // Log enabled jobs
    console.log(chalk.cyan('\nEnabled jobs:'));
    const jobNames = {
      importS0bHoldingsWalletData: 'S0b Holdings Wallet Import',
      importS0bStructureManagementWalletData: 'S0b Structure Management Wallet Import',
      importVen0mWalletData: 'Ven0m Wallet Import',
      importKryTekWalletData: 'KryTek Wallet Import',
      importS0bMartWalletData: 'S0b-Mart Wallet Import',
      importS0bStructContracts: 'S0b_Struct Contracts Import',
      importCsvToDb: 'CSV Import',
    };
    let hasEnabledJobs = false;
    Object.entries(config).forEach(([key, value]) => {
      if (value) {
        console.log(chalk.green(`  ✓ ${jobNames[key]}`));
        hasEnabledJobs = true;
      }
    });
    if (!hasEnabledJobs) {
      console.log(chalk.yellow('  ⚠ No jobs enabled!'));
    }
    console.log('');

    return config;
  }

  // Interactive mode
  console.log(chalk.blue('🎮 Using interactive mode...'));
  return await inquirer.prompt([
    {
      type: 'confirm',
      name: 'importS0bHoldingsWalletData',
      message: 'Do you want to import S0b Holdings Wallet Data?',
      default: false,
    },
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
    // Uncomment if needed
    // {
    //   type: 'confirm',
    //   name: 'importCsvToDb',
    //   message: 'Do you want to import CSV data to the database?',
    //   default: false,
    // },
  ]);
};

async function runJob(label, fn) {
  const start = Date.now();
  try {
    console.log(chalk.blue(`🔄 Starting ${label}...`));
    const count = await fn();
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(chalk.green(`✓ ${label} completed successfully.`));
    return { label, status: 'ok', duration, count };
  } catch (error) {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.error(chalk.red(`✗ Error during ${label}: ${error.message}`));
    return { label, status: 'error', duration, error: error.message };
  }
}

const runJobs = async () => {
  const jobSelections = await getJobSelections();

  const jobs = [];

  if (jobSelections.importS0bHoldingsWalletData) {
    jobs.push(runJob('S0b Holdings wallet import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importS0bHoldingsWalletData', sequelize);
      return importWalletData(jwt, accessToken, sequelize, process.env.CORPORATION_ID);
    }));
  }

  if (jobSelections.importS0bStructureManagementWalletData) {
    jobs.push(runJob('S0b Structure Management wallet import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importS0bStructureManagementWalletData', structSequelize);
      return importWalletData(jwt, accessToken, structSequelize, process.env.STRUCT_CORPORATION_ID);
    }));
  }

  if (jobSelections.importVen0mWalletData) {
    jobs.push(runJob('Ven0m wallet import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importVen0mWalletData', ven0mSequelize);
      return importWalletData(jwt, accessToken, ven0mSequelize, process.env.VEN0M_CORPORATION_ID);
    }));
  }

  if (jobSelections.importKryTekWalletData) {
    jobs.push(runJob('KryTek wallet import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importKryTekWalletData', krytekSequelize);
      return importWalletData(jwt, accessToken, krytekSequelize, process.env.KRYTEK_CORPORATION_ID);
    }));
  }

  if (jobSelections.importS0bMartWalletData) {
    jobs.push(runJob('S0b-Mart wallet import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importS0bMartWalletData', s0bMartSequelize);
      return importWalletData(jwt, accessToken, s0bMartSequelize, process.env.S0B_MART_CORPORATION_ID);
    }));
  }

  if (jobSelections.importS0bStructContracts) {
    jobs.push(runJob('S0b_Struct contracts import', async () => {
      const { jwt, accessToken } = await runOAuthFlow('importS0bStructContracts', structSequelize);
      return importCorporationContracts(jwt, accessToken, process.env.STRUCT_CORPORATION_ID, structSequelize);
    }));
  }

  if (jobSelections.importCsvToDb) {
    jobs.push(runJob('CSV import', () => importCsvToDb()));
  }

  const results = await Promise.allSettled(jobs);

  const now = new Date().toLocaleTimeString();
  console.log(chalk.bold(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.bold(`📋 Run Summary — ${now}`));
  console.log(chalk.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  for (const settled of results) {
    const r = settled.value;
    if (!r) continue;
    const icon = r.status === 'ok' ? chalk.green('✓') : chalk.red('✗');
    const label = r.status === 'ok' ? chalk.green(r.label) : chalk.red(r.label);
    const time = chalk.gray(`(${r.duration}s)`);
    const updated = r.count != null ? chalk.cyan(` — ${r.count} updated`) : '';
    const err = r.error ? chalk.red(` — ${r.error}`) : '';
    console.log(`  ${icon} ${label} ${time}${updated}${err}`);
  }
  console.log(chalk.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
};

const initialize = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      chalk.green(
        '✓ Database connection to S0b has been established successfully.',
      ),
    );

    await structSequelize.authenticate();
    console.log(
      chalk.green(
        '✓ Database connection to S0b_Struct has been established successfully.',
      ),
    );

    await ven0mSequelize.authenticate();
    console.log(
      chalk.green(
        '✓ Database connection to Ven0m has been established successfully.',
      ),
    );

    await krytekSequelize.authenticate();
    console.log(
      chalk.green(
        '✓ Database connection to KryTek has been established successfully.',
      ),
    );

    await s0bMartSequelize.authenticate();
    console.log(
      chalk.green(
        '✓ Database connection to S0b_Mart has been established successfully.',
      ),
    );
  } catch (err) {
    console.error(chalk.red('✗ Unable to connect to the database:', err));
    process.exit(1);
  }
};

const getRunInterval = async () => {
  if (useEnvConfig) {
    const intervalMinutes = process.env.RUN_INTERVAL_MINUTES;
    if (intervalMinutes && !isNaN(intervalMinutes) && parseInt(intervalMinutes) > 0) {
      const minutes = parseInt(intervalMinutes);
      console.log(chalk.cyan(`⏱️  Run interval set to ${minutes} minutes`));
      return minutes * 60 * 1000;
    }
    console.log(chalk.cyan('⏱️  No run interval set - will run once and exit'));
    return null;
  }

  // Interactive mode
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

  return intervalAnswer.interval
    ? parseInt(intervalAnswer.interval) * 60 * 1000
    : null;
};

const main = async () => {
  await initialize();

  const intervalMs = await getRunInterval();

  await runJobs();

  let iterationCount = 0;

  if (intervalMs) {
    const scheduleNext = async () => {
      iterationCount++;
      console.log(chalk.blue(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.blue(`📊 Iteration count: ${iterationCount}`));
      console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
      await runJobs();
      console.log(chalk.yellow(`\n🔄 Next run in ${intervalMs / 60000} minutes...\n`));
      setTimeout(scheduleNext, intervalMs);
    };
    console.log(chalk.yellow(`\n🔄 Next run in ${intervalMs / 60000} minutes...\n`));
    setTimeout(scheduleNext, intervalMs);
  } else {
    console.log(chalk.green('\n✓ Job execution completed. Exiting...\n'));
    process.exit(0);
  }
};

program.action(async () => {
  await main();
});

program.parse(process.argv);
