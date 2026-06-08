import { DataTypes } from 'sequelize';

const DIVISION_NAMES = [
  null,
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
];

const modelCache = new Map();

export function defineJournalEntryDivisionModel(sequelizeInstance, division) {
  const cacheKey = `${sequelizeInstance.config.database}:${division}`;
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey);
  }

  const name = DIVISION_NAMES[division];
  if (!name) {
    throw new Error(`No journal entry model for division ${division}`);
  }

  const model = sequelizeInstance.define(
    `${name}_JournalEntry`,
    {
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      context_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      context_id_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      first_party_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      ref_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      second_party_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      wallet_division: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        primaryKey: true,
      },
      transaction_type: {
        type: DataTypes.TINYINT,
        allowNull: false,
      },
      unique_id: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.id}-${this.wallet_division}`;
        },
      },
    },
    {
      tableName: `${division}_journal_entries`,
      timestamps: false,
      indexes: [
        { fields: ['transaction_type'] },
        { fields: ['date'] },
        { fields: ['context_id_type'] },
      ],
      primaryKey: {
        name: 'pk_journal_entries',
        fields: ['id', 'wallet_division'],
      },
    },
  );

  modelCache.set(cacheKey, model);
  return model;
}
