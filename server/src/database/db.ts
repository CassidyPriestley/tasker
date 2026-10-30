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
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
});

console.log("MySQL pool created");

export default db;
