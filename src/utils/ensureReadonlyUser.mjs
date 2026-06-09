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

    // Create user if not exists (MySQL 8 syntax)
    await sequelizeInstance.query(
      `CREATE USER IF NOT EXISTS 'eve_readonly'@'%' IDENTIFIED BY :password`,
      { replacements: { password: readonlyPassword } }
    );

    // Grant SELECT on current database
    await sequelizeInstance.query(
      `GRANT SELECT ON \`${dbName}\`.* TO 'eve_readonly'@'%'`
    );

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

    await sequelizeInstance.query('FLUSH PRIVILEGES');
    
    console.log(chalk.green(`✓ eve_readonly user ensured for database: ${dbName}`));
  } catch (error) {
    // Don't fail startup if we can't create the user (might not have admin privs)
    console.log(chalk.yellow(`⚠ Could not ensure eve_readonly user on ${sequelizeInstance.config.database}: ${error.message}`));
  }
}
