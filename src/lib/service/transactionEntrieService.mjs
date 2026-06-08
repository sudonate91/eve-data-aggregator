import chalk from 'chalk';
import { defineJournalEntryDivisionModel } from '../../models/JournalEntryDivision.mjs';
import { sanitizeEntry } from '../../utils/helpers.mjs';

const UPSERT_FIELDS = [
  'amount',
  'balance',
  'context_id',
  'context_id_type',
  'date',
  'description',
  'first_party_id',
  'reason',
  'ref_type',
  'second_party_id',
  'wallet_division',
  'transaction_type',
];

export async function upsertJournalEntries(entries, sequelizeInstance) {
  const groupedEntries = entries.reduce((acc, entry) => {
    const { wallet_division } = entry;
    if (!acc[wallet_division]) {
      acc[wallet_division] = [];
    }
    acc[wallet_division].push(sanitizeEntry(entry));
    return acc;
  }, {});

  const counts = await Promise.all(
    Object.entries(groupedEntries).map(async ([division, divisionEntries]) => {
      const divisionNum = parseInt(division, 10);
      try {
        const model = defineJournalEntryDivisionModel(sequelizeInstance, divisionNum);
        const result = await model.bulkCreate(divisionEntries, {
          updateOnDuplicate: UPSERT_FIELDS,
        });
        console.log(
          chalk.green(
            `Bulk upserted ${result.length} entries into ${divisionNum}_journal_entries`,
          ),
        );
        return result.length;
      } catch (err) {
        console.error(
          chalk.red(
            `Failed to upsert entries into ${divisionNum}_journal_entries: ${err.message}`,
          ),
        );
        return 0;
      }
    }),
  );
  return counts.reduce((sum, n) => sum + n, 0);
}
