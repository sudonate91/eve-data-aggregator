import chalk from 'chalk';

async function getTokenModel(sequelizeInstance) {
  const modelModule = await import(`../../models/tokens.mjs`);
  const defineModel = modelModule.default;
  return defineModel(sequelizeInstance);
}

export async function upsertAuthData(authData, job, sequelizeInstance) {
  try {
    const Token = await getTokenModel(sequelizeInstance);
    // Only stringify scp if it's an array
    let dataToSave = { ...authData, job };
    if (Array.isArray(dataToSave.scp)) {
      dataToSave.scp = dataToSave.scp.join(' ');
    }
    console.log(dataToSave)
    await Token.upsert(dataToSave, {
      updateOnDuplicate: [
        'access_token',
        'expires_in',
        'token_type',
        'refresh_token',
        'scp',
        'sub',
        'name',
        'owner',
        'exp',
        'job'
      ],
    });
    console.log(
      chalk.green(`Auth data successfully upserted into the tokens database.`),
    );
  } catch (error) {
    console.error(
      chalk.red(`Error upserting auth data into the tokens database:`, error),
    );
  }
}

export async function findByJobName(job, sequelizeInstance) {
  try {
    const Token = await getTokenModel(sequelizeInstance);
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