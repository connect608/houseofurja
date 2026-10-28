import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Only set custom DNS on Windows where local SRV lookups may fail
if (process.platform === "win32") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch {
    // Ignore in restricted environments
  }
}

/**
 * MongoDB Atlas connection manager with serverless caching
 */
export function isMongoConfigured(): boolean {
  const uri = process.env.MONGODB_URI || "";
  return Boolean(uri.trim().length > 0);
}

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: "mongodb" | "json";
  dbName: string;
  error?: string;
}

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

const globalWithMongo = globalThis as typeof globalThis & GlobalMongo;

function getClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI || "";
  if (!uri.trim()) return null;

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      // Clear cached promise on rejection so subsequent calls retry
      globalWithMongo._mongoClientPromise = undefined;
      throw err;
    });
  }

  return globalWithMongo._mongoClientPromise;
}

/**
 * Retrieves the MongoDB Atlas database instance
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!isMongoConfigured()) {
    return null;
  }

  const clientPromise = getClientPromise();
  if (!clientPromise) {
    return null;
  }

  const dbName = process.env.MONGODB_DB || "house_of_urja";

  try {
    const client = await clientPromise;
    return client.db(dbName);
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err);
    globalWithMongo._mongoClientPromise = undefined;
    return null;
  }
}

/**
 * Live health check of database connectivity for admin diagnostics
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const dbName = process.env.MONGODB_DB || "house_of_urja";

  if (!isMongoConfigured()) {
    return {
      isConfigured: false,
      isConnected: false,
      provider: "json",
      dbName,
      error: "MONGODB_URI is not set in environment variables.",
    };
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: "json",
        dbName,
        error: "Failed to initialize MongoDB client.",
      };
    }

    await db.command({ ping: 1 });
    return {
      isConfigured: true,
      isConnected: true,
      provider: "mongodb",
      dbName,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isConfigured: true,
      isConnected: false,
      provider: "json",
      dbName,
      error: message,
    };
  }
}
