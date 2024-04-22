import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqliteDb = new Database("./data/sqlite.db");

export const db = drizzle(sqliteDb, { schema, logger: true });
