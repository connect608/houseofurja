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

interface GlobalMongo {
  _mongoClientPromise?: Promise<MongoClient>;
}

const globalWithMongo = globalThis as typeof globalThis & GlobalMongo;

function getClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI || "";
  if (!uri.trim()) return null;

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  }
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
    return null;
  }
}
