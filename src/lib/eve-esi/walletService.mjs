import { upsertJournalEntries } from '../service/transactionEntrieService.mjs';
import { esiRequest } from '../../utils/esiClient.mjs';
import chalk from 'chalk';

export async function importWalletData(
  jwt,
  accessToken,
  sequelizeInstance,
  corporationId,
) {
  const characterName = jwt['name'];

  for (let walletDivision = 1; walletDivision <= 7; walletDivision++) {
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages && page <= 10) {
      const walletPath = `https://esi.evetech.net/latest/corporations/${corporationId}/wallets/${walletDivision}/journal/?datasource=tranquility&page=${page}`;

      console.log(
        chalk.blue(
          `\nFetching data for wallet division ${walletDivision}, page ${page}...`,
        ),
      );

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      try {
        const res = await esiRequest(walletPath, { headers: headers });
        console.log(
          chalk.cyan(
            `\nMade request to ${walletPath} with headers: ${JSON.stringify(
              [...res.headers.entries()].reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
              }, {}),
            )}`,
          ),
        );

        if (res.status === 404) {
          console.log(
            chalk.yellow(
              `Page ${page} does not exist for wallet division ${walletDivision}. Stopping pagination.`,
            ),
          );
          hasMorePages = false;
          break;
        }

        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            chalk.red(
              `HTTP error ${res.status} for wallet division ${walletDivision}, page ${page}: ${errorText}`,
            ),
          );
          hasMorePages = false;
          continue;
        }

        const data = await res.json();
        if (data.length === 0) {
          hasMorePages = false;
        } else {
          data.forEach((entry) => {
            entry.wallet_division = walletDivision;
            entry.amount = parseFloat(entry.amount).toFixed(2);
            entry.balance = parseFloat(entry.balance).toFixed(2);
            entry.transaction_type = entry.amount < 0 ? 0 : 1;
          });
          console.log(
            chalk.green(
              `\n${characterName} has ${data.length} wallet journal entries in division ${walletDivision}, page ${page}`,
            ),
          );
          await upsertJournalEntries(data, sequelizeInstance);
          page++;
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error fetching data for wallet division ${walletDivision}, page ${page}: ${error.message}`,
          ),
        );
        hasMorePages = false;
      }
    }
  }
}
// fetchWithRetry is now handled by esiClient.mjs
