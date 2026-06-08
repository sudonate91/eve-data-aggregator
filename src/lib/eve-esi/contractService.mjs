import chalk from 'chalk';
import { upsertContracts, getExistingContractIds } from '../service/contractService.mjs';
import { esiRequest, getRateLimitStats } from '../../utils/esiClient.mjs';

const ESI_BASE = 'https://esi.evetech.net/latest';
const SKYHOOK_TYPE_IDS = new Set([81143, 81144]);
const ITEM_FETCH_BATCH_SIZE = 5;
const ITEM_FETCH_BATCH_SIZE_THROTTLED = 1;
const RATE_LIMIT_LOW_THRESHOLD = 30;
const INTER_BATCH_DELAY_MS = 500;
const PRICE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Janice price cache: { typeId -> { price, fetchedAt } }
const priceCache = new Map();

const formatISK = (value) => {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let suffix = '';
  if (value >= 1_000_000_000) {
    suffix = ` (${(value / 1_000_000_000).toFixed(2)} Billion)`;
  } else if (value >= 1_000_000) {
    suffix = ` (${(value / 1_000_000).toFixed(2)} Million)`;
  } else if (value >= 1_000) {
    suffix = ` (${(value / 1_000).toFixed(2)} Thousand)`;
  }
  return `${formatted} ISK${suffix}`;
};

async function fetchContractPage(corporationId, page, headers) {
  const url = `${ESI_BASE}/corporations/${corporationId}/contracts/?datasource=tranquility&page=${page}`;
  const res = await esiRequest(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} for contracts page ${page}: ${body}`);
  }
  const data = await res.json();
  const totalPages = parseInt(res.headers.get('X-Pages') ?? '1', 10);
  return { data, totalPages };
}

async function fetchContractItems(corporationId, contractId, headers) {
  const url = `${ESI_BASE}/corporations/${corporationId}/contracts/${contractId}/items/?datasource=tranquility`;
  const res = await esiRequest(url, { headers });
  if (!res.ok) {
    console.warn(chalk.yellow(`  [Contract ${contractId}] Items fetch failed (${res.status}) — skipping`));
    return [];
  }
  return res.json();
}

async function fetchCharacterName(issuerId, headers, nameCache) {
  if (nameCache.has(issuerId)) {
    return nameCache.get(issuerId);
  }
  const url = `${ESI_BASE}/characters/${issuerId}/?datasource=tranquility`;
  const res = await esiRequest(url, { headers });
  const name = res.ok ? (await res.json()).name ?? null : null;
  nameCache.set(issuerId, name);
  return name;
}

async function fetchPriceFromJanice(typeId) {
  const apiKey = process.env.JANICE_API_KEY;
  if (!apiKey) {
    console.warn(chalk.yellow('JANICE_API_KEY not set — skipping price lookup'));
    return null;
  }
  try {
    const res = await fetch(`https://janice.e-351.com/api/rest/v2/pricer/${typeId}?market=2`, {
      headers: { accept: 'application/json', 'X-ApiKey': apiKey },
    });
    if (!res.ok) {
      console.warn(chalk.yellow(`  Janice price fetch failed for type_id ${typeId}: ${res.status}`));
      return null;
    }
    const data = await res.json();
    const price = data?.top5AveragePrices?.splitPrice5DayMedian ?? null;
    if (price !== null) {
      const rounded = Math.round(price * 100) / 100;
      console.log(chalk.blue(`  ⓘ Janice price for ${typeId}: ${formatISK(rounded)}`));
      return rounded;
    }
    return null;
  } catch (err) {
    console.error(chalk.red(`  Janice fetch error for ${typeId}: ${err.message}`));
    return null;
  }
}

async function getPriceForType(typeId) {
  const cached = priceCache.get(typeId);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.price;
  }
  const price = await fetchPriceFromJanice(typeId);
  priceCache.set(typeId, { price, fetchedAt: Date.now() });
  return price;
}

async function calculateContractValue(items) {
  let totalValue = 0;
  for (const item of items) {
    if (!item.type_id || !item.quantity) continue;
    const price = await getPriceForType(item.type_id);
    if (price !== null) {
      const itemValue = Math.round(price * item.quantity * 100) / 100;
      totalValue += itemValue;
      console.log(
        chalk.gray(`    • ${item.type_id}: ${item.quantity.toLocaleString('en-US')} × ${price.toFixed(2)} ISK = ${formatISK(itemValue)}`),
      );
    }
  }
  return Math.round(totalValue * 100) / 100;
}

async function fetchItemsInBatches(corporationId, contracts, headers) {
  const results = new Map();
  for (let i = 0; i < contracts.length; i += ITEM_FETCH_BATCH_SIZE) {
    const stats = getRateLimitStats();
    const corpContractRemaining = stats['corp-contract']?.remaining ?? Infinity;
    const batchSize = corpContractRemaining <= RATE_LIMIT_LOW_THRESHOLD
      ? ITEM_FETCH_BATCH_SIZE_THROTTLED
      : ITEM_FETCH_BATCH_SIZE;

    const batch = contracts.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map((c) => fetchContractItems(corporationId, c.contract_id, headers)),
    );
    for (const [j, result] of settled.entries()) {
      const contractId = batch[j].contract_id;
      results.set(contractId, result.status === 'fulfilled' ? result.value : []);
    }
    if (i + batchSize < contracts.length) {
      await new Promise((resolve) => setTimeout(resolve, INTER_BATCH_DELAY_MS));
    }
  }
  return results;
}

export async function importCorporationContracts(jwt, accessToken, corporationId, sequelizeInstance) {
  const characterName = jwt['name'];
  const headers = { Authorization: `Bearer ${accessToken}` };
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // ── Step 1: Fetch all contract pages via X-Pages ──────────────────────────
  console.log(chalk.blue(`\n[Contracts] Fetching page 1 for corporation ${corporationId}...`));

  let firstPageData, totalPages;
  try {
    ({ data: firstPageData, totalPages } = await fetchContractPage(corporationId, 1, headers));
  } catch (err) {
    console.error(chalk.red(`[Contracts] Failed to fetch page 1: ${err.message}`));
    return;
  }

  const remainingPageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const remainingResults = await Promise.allSettled(
    remainingPageNums.map((p) => fetchContractPage(corporationId, p, headers)),
  );

  const allContracts = [...firstPageData];
  for (const [idx, result] of remainingResults.entries()) {
    if (result.status === 'fulfilled') {
      allContracts.push(...result.value.data);
    } else {
      console.error(chalk.red(`[Contracts] Page ${remainingPageNums[idx]} failed: ${result.reason?.message}`));
    }
  }

  console.log(chalk.cyan(`[Contracts] ${allContracts.length} total contracts across ${totalPages} page(s)`));

  // ── Step 2: Filter to recent finished item_exchange contracts ────────────
  const finishedContracts = allContracts.filter(
    (c) =>
      c.type === 'item_exchange' &&
      (c.status === 'finished' || c.status === 'finished_issuer' || c.status === 'finished_contractor') &&
      new Date(c.date_issued) >= oneMonthAgo,
  );

  if (finishedContracts.length === 0) {
    console.log(chalk.yellow('[Contracts] No recent finished item_exchange contracts found.'));
    return;
  }

  // ── Step 3: Skip contracts already in DB ─────────────────────────────────
  const existingIds = await getExistingContractIds(sequelizeInstance);
  const newContracts = finishedContracts.filter((c) => !existingIds.has(c.contract_id));

  if (newContracts.length === 0) {
    console.log(chalk.green(`[Contracts] All ${finishedContracts.length} finished contract(s) already stored — nothing to do.`));
    return;
  }

  console.log(chalk.cyan(
    `[Contracts] ${newContracts.length} new (${finishedContracts.length - newContracts.length} already stored) — fetching items in batches of ${ITEM_FETCH_BATCH_SIZE}...`,
  ));

  // ── Step 4: Batch-fetch items for new contracts only ─────────────────────
  const itemsMap = await fetchItemsInBatches(corporationId, newContracts, headers);

  // ── Step 5: Confirm Skyhook contracts ─────────────────────────────────────
  const skyhookContracts = newContracts.filter((c) => {
    const items = itemsMap.get(c.contract_id) ?? [];
    return items.some((item) => SKYHOOK_TYPE_IDS.has(item.type_id));
  });

  if (skyhookContracts.length === 0) {
    console.log(chalk.yellow('[Contracts] No finished Skyhook contracts found this run.'));
    return;
  }

  console.log(chalk.green(`[Contracts] ${skyhookContracts.length} finished Skyhook contract(s) confirmed`));

  // ── Step 5: Fetch character names (deduped by issuer_id) ──────────────────
  const nameCache = new Map();
  for (const c of skyhookContracts) {
    await fetchCharacterName(c.issuer_id, headers, nameCache);
  }

  // ── Step 6: Calculate values and assemble upsert payload ──────────────────
  const contractsToUpsert = [];
  for (const contract of skyhookContracts) {
    const items = itemsMap.get(contract.contract_id) ?? [];
    const totalValue = await calculateContractValue(items);
    const character_name = nameCache.get(contract.issuer_id) ?? null;

    console.log(
      chalk.green(
        `  [Contract ${contract.contract_id}] ${character_name ?? contract.issuer_id} — ${items.length} item(s) — ${formatISK(totalValue)}`,
      ),
    );

    contractsToUpsert.push({
      ...contract,
      contract_type: 'Skyhook',
      character_name,
      total_value: totalValue,
    });
  }

  // ── Step 7: Upsert ────────────────────────────────────────────────────────
  await upsertContracts(contractsToUpsert, sequelizeInstance);

  const cachedCount = priceCache.size;
  console.log(chalk.blue(`\n[Contracts] Done. ${characterName} — ${contractsToUpsert.length} finished Skyhook contract(s) upserted. Janice cache: ${cachedCount} type(s).`));
}
