import chalk from 'chalk';
import { upsertContracts } from '../service/contractService.mjs';
import { esiRequest } from '../../utils/esiClient.mjs';
import dotenv from 'dotenv';

dotenv.config();

// Global price cache for the entire script run
const globalPriceCache = {};

/**
 * Format ISK value with commas and scale suffix
 * @param {number} value - ISK amount
 * @returns {string} - Formatted string like "1,234,567.89 ISK (1.23 Million)"
 */
const formatISK = (value) => {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  let suffix = '';
  if (value >= 1_000_000_000) {
    const billions = (value / 1_000_000_000).toFixed(2);
    suffix = ` (${billions} Billion)`;
  } else if (value >= 1_000_000) {
    const millions = (value / 1_000_000).toFixed(2);
    suffix = ` (${millions} Million)`;
  } else if (value >= 1_000) {
    const thousands = (value / 1_000).toFixed(2);
    suffix = ` (${thousands} Thousand)`;
  }
  
  return `${formatted} ISK${suffix}`;
};

/**
 * Import corporation contracts, including issuer character info and contract items.
 * Fetches contracts from the past month by paginating until contracts older than 1 month are found.
 * @param {string} jwt - JWT token (for logging character name)
 */
export async function importCorporationContracts(jwt, accessToken, corporationId, sequelizeInstance) {
  const characterName = jwt['name'];
  const contractsToUpsert = [];
  let page = 1;
  let hasMorePages = true;

  // Calculate the date 1 month ago
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  while (hasMorePages) {
    const contractsUrl = `https://esi.evetech.net/latest/corporations/${corporationId}/contracts/?datasource=tranquility&page=${page}`;
    console.log(
      chalk.blue(
        `\nFetching contracts for corporation ${corporationId}, page ${page}...`
      )
    );

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      const res = await esiRequest(contractsUrl, { headers });
      console.log(
        chalk.cyan(
          `\nMade request to ${contractsUrl} with headers: ${JSON.stringify(
            [...res.headers.entries()].reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {})
          )}`
        )
      );

      if (res.status === 500) {
        const errorText = await res.text();
        console.error(
          chalk.red(
            `Received 500 error for contracts page ${page}. Error: ${errorText}`
          )
        );
        hasMorePages = false;
        continue;
      }

      if (res.status === 404) {
        console.log(
          chalk.yellow(
            `Page ${page} does not exist for contracts. Stopping pagination.`
          )
        );
        hasMorePages = false;
        break;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! status: ${res.status}, body: ${errorText}`
        );
      }

      const contracts = await res.json();
      if (contracts.length === 0) {
        hasMorePages = false;
        break;
      }

      // Check if any contract is older than 1 month
      let foundOldContract = false;
      for (const contract of contracts) {
        const issuedDate = new Date(contract.date_issued);
        if (issuedDate < oneMonthAgo) {
          foundOldContract = true;
          break;
        }
      }

      for (const contract of contracts) {
        const issuedDate = new Date(contract.date_issued);
        if (issuedDate < oneMonthAgo) {
          // Skip contracts older than 1 month
          continue;
        }

        // Fetch issuer character info
        const characterUrl = `https://esi.evetech.net/latest/characters/${contract.issuer_id}/?datasource=tranquility`;
        const characterRes = await esiRequest(characterUrl, { headers });
        let characterInfo = {};
        if (characterRes.ok) {
          characterInfo = await characterRes.json();
        }

        // Fetch contract items
        const itemsUrl = `https://esi.evetech.net/latest/corporations/${corporationId}/contracts/${contract.contract_id}/items/?datasource=tranquility`;
        const itemsRes = await esiRequest(itemsUrl, { headers });
        let items = [];
        if (itemsRes.ok) {
          items = await itemsRes.json();
        }

        // Determine contract type label
        let contractType = contract.type;
        const isSkyhook = items.some(item => item.type_id === 81143 || item.type_id === 81144);
        if (isSkyhook) {
          contractType = 'Skyhook';
        }

        // Log contract header
        console.log(
          chalk.green(
            `\n${characterName} processing contract ${contract.contract_id} (type: ${contractType}) with ${items.length} item${items.length !== 1 ? 's' : ''}...`
          )
        );

        // Calculate total value of contract items (only for Skyhook contracts)
        let totalValue = 0;
        if (isSkyhook) {
          totalValue = await calculateContractValue(items);
          console.log(
            chalk.cyan(
              `  → Total value: ${formatISK(totalValue)}`
            )
          );
        } else {
          console.log(
            chalk.gray(
              `  → Skipping value calculation (not a Skyhook contract)`
            )
          );
        }

        // Prepare contract for upsert
        contractsToUpsert.push({
          ...contract,
          contract_type: contractType,
          character_name: characterInfo.name || null,
          total_value: totalValue,
        });
      }

      // If any contract was older than 1 month, stop paginating
      if (foundOldContract) {
        hasMorePages = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Error fetching contracts for corporation ${corporationId}, page ${page}: ${error.message}`
        )
      );
      hasMorePages = false;
    }
  }

  // Upsert all contracts at once
  if (contractsToUpsert.length > 0 && sequelizeInstance) {
    await upsertContracts(contractsToUpsert, sequelizeInstance);
  }

  // Log price cache statistics
  const cachedTypes = Object.keys(globalPriceCache).length;
  console.log(
    chalk.blue(
      `\nPrice cache statistics: ${cachedTypes} unique item types cached for this run`
    )
  );
}

/**
 * Fetch price for a specific type_id from Janice API
 * @param {number} typeId - EVE Online type ID
 * @returns {number|null} - Price per unit or null if unavailable
 */
const fetchPriceFromJanice = async (typeId) => {
  const apiKey = process.env.JANICE_API_KEY;
  if (!apiKey) {
    console.warn(chalk.yellow('JANICE_API_KEY not found in environment variables'));
    return null;
  }

  const url = `https://janice.e-351.com/api/rest/v2/pricer/${typeId}?market=2`;
  const headers = {
    'accept': 'application/json',
    'X-ApiKey': apiKey,
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(chalk.yellow(`Failed to fetch price for type_id ${typeId}: ${res.status}`));
      return null;
    }

    const data = await res.json();
    // Use splitPrice5DayMedian from top5AveragePrices
    const price = data?.top5AveragePrices?.splitPrice5DayMedian;
    if (price !== undefined && price !== null) {
      // Round to 2 decimal places
      const roundedPrice = Math.round(price * 100) / 100;
      console.log(chalk.blue(`    ⓘ Fetched price for type_id ${typeId}: ${formatISK(roundedPrice)}`));
      return roundedPrice;
    }
    return null;
  } catch (error) {
    console.error(chalk.red(`Error fetching price for type_id ${typeId}: ${error.message}`));
    return null;
  }
};

/**
 * Calculate total value of contract items
 * @param {Array} items - Array of contract items with type_id and quantity
 * @returns {number} - Total value in ISK
 */
const calculateContractValue = async (items) => {
  if (!items || items.length === 0) {
    return 0;
  }

  let totalValue = 0;

  for (const item of items) {
    if (!item.type_id || !item.quantity) {
      continue;
    }

    // Check global cache first
    if (globalPriceCache[item.type_id] === undefined) {
      globalPriceCache[item.type_id] = await fetchPriceFromJanice(item.type_id);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const price = globalPriceCache[item.type_id];
    if (price !== null) {
      const itemValue = Math.round(price * item.quantity * 100) / 100;
      totalValue += itemValue;
      console.log(
        chalk.gray(
          `    • Item ${item.type_id}: ${item.quantity.toLocaleString('en-US')} × ${price.toFixed(2)} ISK = ${formatISK(itemValue)}`
        )
      );
    }
  }

  // Round final total to 2 decimal places
  return Math.round(totalValue * 100) / 100;
};

// fetchWithRetry replaced by esiClient
