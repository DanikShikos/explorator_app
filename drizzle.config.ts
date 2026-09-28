import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Загружаем переменные из .env
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