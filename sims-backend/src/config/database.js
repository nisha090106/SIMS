import dotenv from 'dotenv';

dotenv.config();

const config = {
  development: {
    username: process.env.DB_USER || 'sims_user',
    password: process.env.DB_PASSWORD || 'sims_password_123',
    database: process.env.DB_NAME || 'sims_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      charset: 'utf8mb4',
    },
  },
  test: {
    username: 'test_user',
    password: 'test_password',
    database: 'sims_test',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      ssl: 'Amazon RDS',
    },
  },
};

export default config;
