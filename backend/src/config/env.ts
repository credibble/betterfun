import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  SOMNIA_INDEXER_URL: z.string().url(),
  SOMNIA_WS_RPC_URL: z.string().url(),
  POT_MASTER_SEED: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_API_URL: z.string().url().optional(),
  LIVEKIT_WS_URL: z.string().url().optional(),
  MM_BOT_PRIVATE_KEY: z.string().optional(),
  GAS_FUNDER_PRIVATE_KEY: z.string().optional(),
  POT_GAS_FUND_AMT: z.string().default("1.0"),
  VENUE_ID: z.string().optional(),
  SETTLEMENT_BUFFER_MIN: z.coerce.number().default(2),
  EPOCH_LENGTH_MIN: z.coerce.number().default(30),
  EPOCH_FUNDING_WINDOW_MIN: z.coerce.number().default(5),
  EPOCH_ROLLOVER: z.coerce.number().default(1),
  DEPOSIT_CONFIRM_BLOCKS: z.coerce.number().default(1),
  AI_CYCLE_INTERVAL_MS: z.coerce.number().default(300000),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
