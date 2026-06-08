import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const structSequelize = new Sequelize(
  process.env.S0b_STRUCT_DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
  },
);

export default structSequelize;
