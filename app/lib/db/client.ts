import initSqlJs from "sql.js";
import Idbkv from "idb-kv";
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import * as schema from "./schema";

type CreateSqliteDatabaseOptions = {
  name?: string;
  initSql?: string;
};

async function createSqliteDatabase(opts?: CreateSqliteDatabaseOptions) {
  const { name = "sqlite-buffer", initSql } = opts || {};
  const store = new Idbkv("sqlite-store");

  async function loadBuffer() {
    try {
      const arrayBuffer = await store.get(name);

      if (arrayBuffer == null) {
        return null;
      }

      const buffer = new Uint8Array(arrayBuffer as ArrayBuffer);
      return buffer;
    } catch (err) {
      console.error("Failed to load sqlite buffer", err);
      return null;
    }
  }

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const buffer = await loadBuffer();
  const shouldInit = buffer == null;
  const database = new SQL.Database(buffer);

  /**
   * Write this database to the browser storage.
   */
  async function write() {
    const data = database.export();
    await store.set(name, data.buffer);
  }

  if (shouldInit && initSql) {
    try {
      console.log("⌛ Initializing database...");
      console.log(`📝 Running: \n\n${initSql}`);
      const sqlResult = database.exec(initSql);
      await write();
      console.log(`✅ Database was initialized: '${sqlResult}'`);
    } catch (err) {
      console.error(`❌ Failed to initialize database`, err);
    }
  }

  return {
    database,
    write,
  };
}

type DrizzleDatabase = SQLJsDatabase<typeof schema> & {
  $write: () => Promise<void>;
};

let DATABASE: DrizzleDatabase | undefined;

export async function loadDatabase() {
  if (DATABASE) {
    return DATABASE;
  }

  const initSql = await fetch("/sql/0000_init.sql").then((x) => x.text());
  const { database, write } = await createSqliteDatabase({ initSql });
  const db = drizzle(database, { schema });

  DATABASE = Object.assign(db, { $write: write });
  return DATABASE;
}
