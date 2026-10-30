import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import db from "./database/db";

const PORT = process.env.PORT || 4000;

// Test db connection
db.getConnection()
  .then((conn) => {
    console.log("DB connected successfully");
    conn.release();
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
