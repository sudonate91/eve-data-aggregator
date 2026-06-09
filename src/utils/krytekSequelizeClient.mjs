import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const krytekSequelize = new Sequelize(
  process.env.KRYTEK_DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  },
);

export default krytekSequelize;
