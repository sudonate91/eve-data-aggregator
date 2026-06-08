import chalk from 'chalk';
import defineTokenModel from '../../models/tokens.mjs';

const TOKEN_UPDATE_FIELDS = [
  'access_token',
  'expires_in',
  'token_type',
  'refresh_token',
  'scp',
  'sub',
  'name',
  'owner',
  'exp',
];

function getTokenModel(sequelizeInstance) {
  return defineTokenModel(sequelizeInstance);
}

export async function upsertAuthData(authData, job, sequelizeInstance) {
  try {
    const Token = getTokenModel(sequelizeInstance);

    const dataToSave = { ...authData, job };
    if (Array.isArray(dataToSave.scp)) {
      dataToSave.scp = dataToSave.scp.join(' ');
    }

    const existing = await Token.findOne({ where: { job } });
    if (existing) {
      await existing.update(
        Object.fromEntries(TOKEN_UPDATE_FIELDS.map((f) => [f, dataToSave[f]])),
      );
      console.log(chalk.green(`Token for job "${job}" updated in the database.`));
    } else {
      await Token.create(dataToSave);
      console.log(chalk.green(`Token for job "${job}" created in the database.`));
    }
  } catch (error) {
    console.error(
      chalk.red(`Error upserting auth data for job "${job}":`, error),
    );
  }
}

export async function findByJobName(job, sequelizeInstance) {
  try {
    const Token = getTokenModel(sequelizeInstance);
    const token = await Token.findOne({ where: { job } });
    if (token) {
      console.log(chalk.green(`Token found for job: ${job}`));
    } else {
      console.log(chalk.yellow(`No token found for job: ${job}`));
    }
    return token;
  } catch (error) {
    console.error(chalk.red(`Error finding token by job name:`, error));
    throw error;
  }
}