import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { sanitizeEntry } from './helpers.mjs';
import { upsertJournalEntries } from '../lib/service/transactionEntrieService.mjs';
import chalk from 'chalk';

export async function importCsvToDb() {
  const csvFilePath = path.resolve('S0B-All-cleaned.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.warn(chalk.yellow(`CSV import skipped — file not found: ${csvFilePath}`));
    return;
  }

  const entries = [];

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvFilePath);
    const parser = parse({ columns: true });

    stream.on('error', (error) => {
      console.error(chalk.red('Error opening CSV file:', error.message));
      reject(error);
    });

    parser.on('data', (row) => {
      row.amount = isNaN(parseFloat(row.amount))
        ? 0
        : parseFloat(row.amount).toFixed(2);
      row.balance = isNaN(parseFloat(row.balance))
        ? 0
        : parseFloat(row.balance).toFixed(2);
      row.transaction_type = row.amount < 0 ? 0 : 1;

      entries.push(sanitizeEntry(row));
    });

    parser.on('end', async () => {
      try {
        console.log(chalk.blue('CSV file successfully processed.'));
        await upsertJournalEntries(entries);
        console.log(chalk.green('Data successfully inserted into the database.'));
        resolve();
      } catch (error) {
        console.error(chalk.red('Error inserting data into the database:', error));
        reject(error);
      }
    });

    parser.on('error', (error) => {
      console.error(chalk.red('Error parsing CSV file:', error.message));
      reject(error);
    });

    stream.pipe(parser);
  });
}
