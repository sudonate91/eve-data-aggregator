import chalk from 'chalk';
import { defineJournalEntryDivisionModel } from '../../models/JournalEntryDivision.mjs';
import { sanitizeEntry } from '../../utils/helpers.mjs';

const COMPARE_FIELDS = [
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

const DECIMAL_FIELDS = new Set(['amount', 'balance']);
const DATE_FIELDS = new Set(['date']);

function normalizeField(field, value) {
  if (value == null) return null;
  if (DATE_FIELDS.has(field)) return new Date(value).toISOString();
  if (DECIMAL_FIELDS.has(field)) return parseFloat(value).toFixed(2);
  return String(value);
}

function hasChanged(incoming, existing) {
  for (const field of COMPARE_FIELDS) {
    const a = normalizeField(field, incoming[field]);
    const b = normalizeField(field, existing[field]);
    if (a !== b) return true;
  }
  return false;
}

export async function upsertJournalEntries(entries, sequelizeInstance) {
  const groupedEntries = entries.reduce((acc, entry) => {
    const { wallet_division } = entry;
    if (!acc[wallet_division]) acc[wallet_division] = [];
    acc[wallet_division].push(sanitizeEntry(entry));
    return acc;
  }, {});

  const counts = await Promise.all(
    Object.entries(groupedEntries).map(async ([division, divisionEntries]) => {
      const divisionNum = parseInt(division, 10);
      try {
        const model = defineJournalEntryDivisionModel(sequelizeInstance, divisionNum);

        const incomingIds = divisionEntries.map((e) => e.id);
        const existingRows = await model.findAll({
          attributes: ['id', ...COMPARE_FIELDS],
          where: { id: incomingIds },
          raw: true,
        });
        const existingMap = new Map(existingRows.map((r) => [String(r.id), r]));

        const toInsert = [];
        const toUpdate = [];
        let skipped = 0;

        for (const entry of divisionEntries) {
          const existing = existingMap.get(String(entry.id));
          if (!existing) {
            toInsert.push(entry);
          } else if (hasChanged(entry, existing)) {
            toUpdate.push(entry);
          } else {
            skipped++;
          }
        }

        if (toInsert.length > 0) {
          await model.bulkCreate(toInsert, { ignoreDuplicates: true });
        }
        if (toUpdate.length > 0) {
          await model.bulkCreate(toUpdate, { updateOnDuplicate: COMPARE_FIELDS });
        }

        console.log(
          chalk.green(
            `Division ${divisionNum}: ${toInsert.length} new, ${toUpdate.length} updated, ${skipped} unchanged`,
          ),
        );
        return { inserted: toInsert.length, updated: toUpdate.length };
      } catch (err) {
        console.error(
          chalk.red(`Failed to process ${divisionNum}_journal_entries: ${err.message}`),
        );
        return { inserted: 0, updated: 0 };
      }
    }),
  );

  return counts.reduce(
    (acc, n) => ({ inserted: acc.inserted + n.inserted, updated: acc.updated + n.updated }),
    { inserted: 0, updated: 0 },
  );
}
