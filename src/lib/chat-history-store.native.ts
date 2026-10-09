import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import type { StoredChatHistorySnapshot } from "./chat-history-store";

const DATABASE_NAME = "nook-chat-history.db";
const ENCRYPTION_KEY_NAME = "nook_chat_history_key";
const MAX_SNAPSHOT_BYTES = 512 * 1024;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getEncryptionKey() {
  const storedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (storedKey) return storedKey;

  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
  return key;
}

async function openEncryptedDatabase() {
  const key = await getEncryptionKey();
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await database.execAsync(`PRAGMA key = "x'${key}'";`);
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_history_cache (
        user_id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        saved_at INTEGER NOT NULL
      );
    `);
    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

function getDatabase() {
  databasePromise ??= openEncryptedDatabase().catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

export async function readChatHistorySnapshot(
  userId: string,
): Promise<StoredChatHistorySnapshot | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    payload: string;
    saved_at: number;
  }>(
    "SELECT payload, saved_at FROM chat_history_cache WHERE user_id = ?",
    userId,
  );
  return row ? { payload: row.payload, savedAt: row.saved_at } : null;
}

export async function writeChatHistorySnapshot(
  userId: string,
  payload: string,
  savedAt: number,
) {
  if (payload.length * 3 > MAX_SNAPSHOT_BYTES) {
    throw new Error("The encrypted chat history cache exceeded its size limit.");
  }
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO chat_history_cache (user_id, payload, saved_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       payload = excluded.payload,
       saved_at = excluded.saved_at`,
    userId,
    payload,
    savedAt,
  );
}

export async function deleteChatHistorySnapshot(userId: string) {
  const database = await getDatabase();
  await database.runAsync(
    "DELETE FROM chat_history_cache WHERE user_id = ?",
    userId,
  );
}
