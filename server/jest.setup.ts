import path from "path";
import dotenv from "dotenv";

// Load test settings FIRST. dotenv never overwrites a value that's already
// Set, so the app's own dotenv.config() calls can't switch back to .env
dotenv.config({ path: path.resolve(__dirname, ".env.test") });
