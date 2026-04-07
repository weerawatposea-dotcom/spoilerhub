import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

/**
 * Optimized postgres.js connection with pooling
 *
 * - max: 10 connections (Railway free tier friendly)
 * - idle_timeout: 20s (release idle connections)
 * - connect_timeout: 10s (fail fast on connection issues)
 * - prepare: true (use prepared statements = faster repeated queries)
 */
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
});

export const db = drizzle(client, { schema });
