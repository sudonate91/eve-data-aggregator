import { upsertJournalEntries } from '../service/transactionEntrieService.mjs';
import { esiRequest } from '../../utils/esiClient.mjs';
import chalk from 'chalk';

const ESI_BASE = 'https://esi.evetech.net/latest';

function buildJournalUrl(corporationId, division, page) {
  return `${ESI_BASE}/corporations/${corporationId}/wallets/${division}/journal/?datasource=tranquility&page=${page}`;
}

function tagEntries(entries, walletDivision) {
  entries.forEach((entry) => {
    entry.wallet_division = walletDivision;
    entry.transaction_type = parseFloat(entry.amount) < 0 ? 0 : 1;
  });
  return entries;
}

async function fetchDivisionPage(corporationId, division, page, headers) {
  const url = buildJournalUrl(corporationId, division, page);
  const res = await esiRequest(url, { headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} for division ${division} page ${page}: ${body}`);
  }

  const data = await res.json();
  const totalPages = parseInt(res.headers.get('X-Pages') ?? '1', 10);
  return { data, totalPages };
}

async function importDivision(corporationId, division, headers, sequelizeInstance, characterName) {
  console.log(chalk.blue(`\n[Division ${division}] Fetching page 1...`));

  let firstPageData, totalPages;
  try {
    ({ data: firstPageData, totalPages } = await fetchDivisionPage(
      corporationId, division, 1, headers,
    ));
  } catch (err) {
    console.error(chalk.red(`[Division ${division}] Failed to fetch page 1: ${err.message}`));
    return { inserted: 0, updated: 0 };
  }

  if (firstPageData.length === 0) {
    console.log(chalk.yellow(`[Division ${division}] No entries found.`));
    return { inserted: 0, updated: 0 };
  }

  console.log(
    chalk.cyan(`[Division ${division}] ${totalPages} page(s) total — fetching concurrently...`),
  );

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  const remainingResults = await Promise.allSettled(
    remainingPages.map((page) => fetchDivisionPage(corporationId, division, page, headers)),
  );

  const allEntries = [...tagEntries(firstPageData, division)];

  for (const [idx, result] of remainingResults.entries()) {
    const page = remainingPages[idx];
    if (result.status === 'fulfilled') {
      allEntries.push(...tagEntries(result.value.data, division));
    } else {
      console.error(
        chalk.red(`[Division ${division}] Page ${page} failed: ${result.reason?.message}`),
      );
    }
  }

  console.log(
    chalk.green(
      `[Division ${division}] ${characterName} — ${allEntries.length} total entries across ${totalPages} page(s)`,
    ),
  );

  return await upsertJournalEntries(allEntries, sequelizeInstance);
}

export async function importWalletData(
  jwt,
  accessToken,
  sequelizeInstance,
  corporationId,
) {
  const characterName = jwt['name'];
  const headers = { Authorization: `Bearer ${accessToken}` };

  const counts = await Promise.all(
    Array.from({ length: 7 }, (_, i) => i + 1).map((division) =>
      importDivision(corporationId, division, headers, sequelizeInstance, characterName),
    ),
  );
  return counts.reduce(
    (acc, n) => ({
      inserted: acc.inserted + (n?.inserted ?? 0),
      updated: acc.updated + (n?.updated ?? 0),
    }),
    { inserted: 0, updated: 0 },
  );
}
