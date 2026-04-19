const { Sequelize } = require("sequelize");
const pg = require("pg");

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      dialectModule: pg,
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME || "ecommerce_db",
      process.env.DB_USER || "postgres",
      requireEnv("DB_PASSWORD"),
      {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        dialect: "postgres",
        dialectModule: pg,
        logging: false,
      }
    );

module.exports = sequelize;