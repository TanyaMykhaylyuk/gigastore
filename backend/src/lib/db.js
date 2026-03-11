import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_SIZE || "5", 10),
  ssl: { rejectUnauthorized: false }
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle pg client", err);
});

export default pool;