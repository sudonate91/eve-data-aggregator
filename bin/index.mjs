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
import { configureAuthServer, startAuthServer, allTokensPresent } from '../src/lib/authServer.mjs';

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

// Build the enabled job list from env/interactive selections.
// Shared between authServer config and runJobs.
const buildJobDefs = (jobSelections) => {
  const defs = [];
  if (jobSelections.importS0bHoldingsWalletData)
    defs.push({ label: 'S0b Holdings wallet import', jobKey: 'importS0bHoldingsWalletData', db: sequelize, dataFn: (jwt, token) => importWalletData(jwt, token, sequelize, process.env.CORPORATION_ID) });
  if (jobSelections.importS0bStructureManagementWalletData)
    defs.push({ label: 'S0b Structure Management wallet import', jobKey: 'importS0bStructureManagementWalletData', db: structSequelize, dataFn: (jwt, token) => importWalletData(jwt, token, structSequelize, process.env.STRUCT_CORPORATION_ID) });
  if (jobSelections.importVen0mWalletData)
    defs.push({ label: 'Ven0m wallet import', jobKey: 'importVen0mWalletData', db: ven0mSequelize, dataFn: (jwt, token) => importWalletData(jwt, token, ven0mSequelize, process.env.VEN0M_CORPORATION_ID) });
  if (jobSelections.importKryTekWalletData)
    defs.push({ label: 'KryTek wallet import', jobKey: 'importKryTekWalletData', db: krytekSequelize, dataFn: (jwt, token) => importWalletData(jwt, token, krytekSequelize, process.env.KRYTEK_CORPORATION_ID) });
  if (jobSelections.importS0bMartWalletData)
    defs.push({ label: 'S0b-Mart wallet import', jobKey: 'importS0bMartWalletData', db: s0bMartSequelize, dataFn: (jwt, token) => importWalletData(jwt, token, s0bMartSequelize, process.env.S0B_MART_CORPORATION_ID) });
  if (jobSelections.importS0bStructContracts)
    defs.push({ label: 'S0b_Struct contracts import', jobKey: 'importS0bStructContracts', db: structSequelize, dataFn: (jwt, token) => importCorporationContracts(jwt, token, process.env.STRUCT_CORPORATION_ID, structSequelize) });
  return defs;
};

const runJobs = async () => {
  const jobSelections = await getJobSelections();
  const jobDefs = buildJobDefs(jobSelections);

  // ── Phase 1: Auth — sequential so prompts never collide ──────────────────
  const authResults = [];
  for (const job of jobDefs) {
    try {
      console.log(chalk.bold.cyan(`\n🔐 Authenticating: ${job.label}`));
      const { jwt, accessToken } = await runOAuthFlow(job.jobKey, job.db);
      authResults.push({ ...job, jwt, accessToken, authOk: true });
    } catch (err) {
      console.error(chalk.red(`✗ Auth failed for ${job.label}: ${err.message}`));
      authResults.push({ ...job, authOk: false, authError: err.message });
    }
  }

  // ── Phase 2: Data import — parallel now that all tokens are ready ─────────
  const jobs = [];
  for (const job of authResults) {
    if (!job.authOk) {
      jobs.push(Promise.resolve({ label: job.label, status: 'error', duration: '0.0', error: job.authError }));
      continue;
    }
    jobs.push(runJob(job.label, () => job.dataFn(job.jwt, job.accessToken)));
  }

  if (jobSelections.importCsvToDb) {
    jobs.push(runJob('CSV import', () => importCsvToDb()));
  }

  const results = await Promise.allSettled(jobs);

  const now = new Date().toLocaleTimeString();
  console.log(chalk.bold(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.bold(`📋 Run Summary — ${now}`));
  console.log(chalk.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

  const runTotals = new Map();
  for (const settled of results) {
    const r = settled.value;
    if (!r) continue;
    const icon = r.status === 'ok' ? chalk.green('✓') : chalk.red('✗');
    const label = r.status === 'ok' ? chalk.green(r.label) : chalk.red(r.label);
    const time = chalk.gray(`(${r.duration}s)`);
    let inserted = 0;
    let updated = '';
    if (r.count != null) {
      if (typeof r.count === 'object') {
        inserted = r.count.inserted;
        updated = chalk.cyan(` — ${r.count.inserted} new, ${r.count.updated} updated`);
      } else {
        inserted = r.count;
        updated = chalk.cyan(` — ${r.count} new`);
      }
    }
    runTotals.set(r.label, inserted);
    const err = r.error ? chalk.red(` — ${r.error}`) : '';
    console.log(`  ${icon} ${label} ${time}${updated}${err}`);
  }
  console.log(chalk.bold(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
  return runTotals;
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

  // Start the auth web server (always — useful for re-auth too)
  const authPort = parseInt(process.env.AUTH_PORT) || 3000;
  const jobSelections = await getJobSelections();
  const jobDefs = buildJobDefs(jobSelections);
  configureAuthServer(jobDefs, authPort);
  startAuthServer();

  // In non-interactive mode, wait for all tokens to be present via the web UI
  // before running the first job batch.
  if (useEnvConfig) {
    const ready = await allTokensPresent();
    if (!ready) {
      console.log(chalk.bold.yellow(
        `\n⚠  Some corps are not authenticated yet.\n` +
        `   Open https://<your-ip>:${authPort} in a browser and authenticate each corp.\n` +
        `   Jobs will start automatically once all tokens are present.\n`
      ));
      await new Promise((resolve) => {
        const poll = setInterval(async () => {
          if (await allTokensPresent()) {
            clearInterval(poll);
            console.log(chalk.green('\n✓ All tokens present — starting jobs.\n'));
            resolve();
          }
        }, 10_000);
      });
    }
  }

  await runJobs();

  let iterationCount = 0;
  const cumulativeTotals = new Map();

  const printCumulative = () => {
    if (cumulativeTotals.size === 0) return;
    console.log(chalk.bold.magenta(`\n📈 Cumulative new records this session (${iterationCount} run(s)):  `));
    for (const [label, total] of cumulativeTotals) {
      console.log(chalk.magenta(`     ${label}: ${total}`));
    }
    console.log();
  };

  if (intervalMs) {
    const scheduleNext = async () => {
      iterationCount++;
      console.log(chalk.blue(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.blue(`📊 Run #${iterationCount} — ${new Date().toLocaleTimeString()}`));
      console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));
      const runTotals = await runJobs();
      for (const [label, inserted] of runTotals) {
        cumulativeTotals.set(label, (cumulativeTotals.get(label) ?? 0) + inserted);
      }
      printCumulative();
      console.log(chalk.yellow(`🔄 Next run in ${intervalMs / 60000} minutes...\n`));
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
