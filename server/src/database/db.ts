import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// SAFEGUARD: never let tests run against a non-test database
if (
  process.env.NODE_ENV === "test" &&
  !process.env.DB_NAME?.endsWith("_test")
) {
  throw new Error(`Refusing to run tests against "${process.env.DB_NAME}"`);
}

const db = mysql.createPool({
  host: process.env.DB_HOST as string,
  port: Number(process.env.DB_PORT ?? 3306) as number,
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  // Cloud databases require an encrypted connection; local MySQL doesn't
  // NOTE:  Possible AWS cloud integration in the future
  ssl:
    process.env.DB_SSL === "true"
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined,
});

console.log("MySQL pool created");

export default db;
