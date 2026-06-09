import chalk from 'chalk';

/**
 * Ensures the eve_readonly user exists with SELECT privileges on all corp databases.
 * This runs automatically on app startup, creating the user if missing.
 * Works on both fresh databases and existing ones (where init scripts already ran).
 */
export async function ensureReadonlyUser(sequelizeInstance) {
  try {
    const dbName = sequelizeInstance.config.database;
    const readonlyPassword = process.env.MYSQL_READONLY_PASSWORD || process.env.DB_PASSWORD;

    if (!readonlyPassword) {
      console.log(chalk.yellow('⚠ MYSQL_READONLY_PASSWORD or DB_PASSWORD not set — skipping eve_readonly user setup'));
      return;
    }

    // Try to create user, or update password if exists
    try {
      await sequelizeInstance.query(
        `CREATE USER IF NOT EXISTS 'eve_readonly'@'%' IDENTIFIED BY :password`,
        { replacements: { password: readonlyPassword } }
      );
      console.log(chalk.blue(`  → Created eve_readonly user`));
    } catch (e) {
      // User might exist with different auth plugin, try ALTER
      await sequelizeInstance.query(
        `ALTER USER 'eve_readonly'@'%' IDENTIFIED BY :password`,
        { replacements: { password: readonlyPassword } }
      );
      console.log(chalk.blue(`  → Updated eve_readonly password`));
    }

    // Grant SELECT on current database (covers tables AND views)
    await sequelizeInstance.query(
      `GRANT SELECT ON \`${dbName}\`.* TO 'eve_readonly'@'%'`
    );
    console.log(chalk.blue(`  → Granted SELECT on ${dbName}.* (tables + views)`));

    // Also grant on other corp databases (idempotent — safe to re-run)
    const databases = ['S0b', 'S0b_Struct', 'Ven0m', 'KryTek', 'S0b_Mart'];
    for (const db of databases) {
      try {
        await sequelizeInstance.query(`GRANT SELECT ON \`${db}\`.* TO 'eve_readonly'@'%'`);
      } catch (e) {
        // Ignore if database doesn't exist yet
        if (!e.message.includes('Unknown database')) {
          throw e;
        }
      }
    }

    // Grant SHOW VIEW privilege so user can see view definitions (helpful for PowerBI)
    for (const db of [dbName, 'S0b', 'S0b_Struct', 'Ven0m', 'KryTek', 'S0b_Mart']) {
      try {
        await sequelizeInstance.query(`GRANT SHOW VIEW ON \`${db}\`.* TO 'eve_readonly'@'%'`);
      } catch (e) {
        // Ignore if database doesn't exist
        if (!e.message.includes('Unknown database')) {
          throw e;
        }
      }
    }

    await sequelizeInstance.query('FLUSH PRIVILEGES');

    console.log(chalk.green(`✓ eve_readonly user ready (SELECT on all tables/views in ${dbName})`));
  } catch (error) {
    // Don't fail startup if we can't create the user (might not have admin privs)
    console.log(chalk.yellow(`⚠ Could not ensure eve_readonly user on ${sequelizeInstance.config.database}: ${error.message}`));
  }
}
