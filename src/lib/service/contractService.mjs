import chalk from 'chalk';
import defineContractsModel from '../../models/Contract.mjs';

const STATUS_UPDATE_FIELDS = [
  'status',
  'date_accepted',
  'date_completed',
  'acceptor_id',
];

const CONTRACT_UPDATE_FIELDS = [
  'acceptor_id',
  'assignee_id',
  'availability',
  'collateral',
  'date_accepted',
  'date_completed',
  'date_expired',
  'date_issued',
  'days_to_complete',
  'end_location_id',
  'for_corporation',
  'issuer_corporation_id',
  'issuer_id',
  'price',
  'reward',
  'start_location_id',
  'status',
  'title',
  'type',
  'volume',
  'character_name',
  'contract_type',
  'total_value',
];

export async function getExistingContractIds(sequelizeInstance) {
  const Contract = defineContractsModel(sequelizeInstance);
  const rows = await Contract.findAll({ attributes: ['contract_id'], raw: true });
  return new Set(rows.map((r) => r.contract_id));
}

export async function upsertContracts(contracts, sequelizeInstance) {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    console.log(chalk.yellow('No contracts to upsert.'));
    return;
  }
  try {
    const Contract = defineContractsModel(sequelizeInstance);
    const result = await Contract.bulkCreate(contracts, {
      updateOnDuplicate: CONTRACT_UPDATE_FIELDS,
    });
    console.log(chalk.green(`✓ ${result.length} Skyhook contract(s) upserted.`));
  } catch (error) {
    console.error(chalk.red('Error upserting contracts:', error));
    throw error;
  }
}

export async function updateContractStatuses(contracts, sequelizeInstance) {
  if (!Array.isArray(contracts) || contracts.length === 0) return;
  try {
    const Contract = defineContractsModel(sequelizeInstance);
    const result = await Contract.bulkCreate(contracts, {
      updateOnDuplicate: STATUS_UPDATE_FIELDS,
    });
    console.log(chalk.green(`✓ ${result.length} contract status(es) updated.`));
  } catch (error) {
    console.error(chalk.red('Error updating contract statuses:', error));
    throw error;
  }
}