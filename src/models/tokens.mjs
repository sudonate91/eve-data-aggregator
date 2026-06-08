// src/models/Token.mjs
import { DataTypes } from 'sequelize';

const defineModel = (sequelizeInstance) => {
  return sequelizeInstance.define(
    'Token',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      access_token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      expires_in: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      token_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      scp: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      sub: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      owner: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      exp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      job: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'tokens',
      timestamps: false,
      indexes: [
        { unique: true, fields: ['job'] },
      ],
    },
  );
};

export default defineModel;
