import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Next.js keeps local secrets in .env.local. Load that first; dotenv does not override.
dotenv.config({ path: ".env.local" });
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Убедитесь, что здесь используется переменная окружения
    url: process.env.DATABASE_URL!, 
  },
});