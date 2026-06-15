const { Pool } = require("pg");
require("dotenv").config();

const connectionOptions = {
  connectionString: process.env.DATABASE_URL,
};

// If DATABASE_URL contains `sslmode=require` or running in production, enable SSL
const dbUrl = process.env.DATABASE_URL || '';
if (process.env.NODE_ENV === 'production' || dbUrl.includes('sslmode=require') || dbUrl.includes('sslmode=require')) {
  connectionOptions.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(connectionOptions);

module.exports = pool;