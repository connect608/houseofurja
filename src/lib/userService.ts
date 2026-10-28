import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isMongoConfigured, getMongoDb } from "./mongodb";

export type AdminRole = "superadmin" | "admin";
export type AdminStatus = "active" | "disabled";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: number;
  updatedAt: number;
}

export type SafeAdminUser = Omit<AdminUser, "passwordHash">;

const USERS_STORE_PATH = path.join(process.cwd(), "src", "data", "adminUsersStore.json");
const USERS_COLLECTION = "admin_users";

let isInitialized = false;

/**
 * Derives a cryptographic password hash using scrypt
 * Format: scrypt:<salt>:<hash>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password.trim(), salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies a password against a scrypt hash in constant time
 */
export function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith("scrypt:")) return false;

  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;

  const [, salt, expectedHash] = parts;
  const derivedKey = crypto.scryptSync(password.trim(), salt, 64).toString("hex");

  const derivedBuffer = Buffer.from(derivedKey, "utf-8");
  const expectedBuffer = Buffer.from(expectedHash, "utf-8");

  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
}

/**
 * Ensures admin_users collection exists in MongoDB Atlas or JSON store, and seeds initial Superadmin
 */
export async function ensureUsersTable(): Promise<boolean> {
  if (isInitialized) return true;

  const defaultEmail = (process.env.SUPERADMIN_EMAIL || "admin@houseofurja.us").toLowerCase().trim();
  const defaultPassword = process.env.ADMIN_PASSWORD || "hou2026!";
  const defaultName = "Superadmin";

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const collection = db.collection<AdminUser>(USERS_COLLECTION);
        await collection.createIndex({ email: 1 }, { unique: true });
        await collection.createIndex({ id: 1 }, { unique: true });

        const count = await collection.countDocuments();
        if (count === 0) {
          console.log("Seeding primary Superadmin account in MongoDB Atlas:", defaultEmail);
          const initialUser: AdminUser = {
            id: 1,
            email: defaultEmail,
            name: defaultName,
            passwordHash: hashPassword(defaultPassword),
            role: "superadmin",
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await collection.insertOne(initialUser);
        }

        isInitialized = true;
        return true;
      }
    } catch (err) {
      console.error("Failed to initialize MongoDB Atlas admin_users collection:", err);
    }
  }

  // Fallback to JSON store
  try {
    let users = await getJsonUsersFallback();
    if (users.length === 0) {
      console.log("Seeding primary Superadmin account in JSON store:", defaultEmail);
      const initialUser: AdminUser = {
        id: 1,
        email: defaultEmail,
        name: defaultName,
        passwordHash: hashPassword(defaultPassword),
        role: "superadmin",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      users = [initialUser];
      await saveJsonUsersFallback(users);
    }
    isInitialized = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize fallback admin users store:", err);
    return false;
  }
}

async function getJsonUsersFallback(): Promise<AdminUser[]> {
  try {
    const raw = await fs.readFile(USERS_STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveJsonUsersFallback(users: AdminUser[]): Promise<void> {
  const tempPath = `${USERS_STORE_PATH}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.mkdir(path.dirname(USERS_STORE_PATH), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(users, null, 2), "utf-8");
    await fs.rename(tempPath, USERS_STORE_PATH);
  } catch (err) {
    console.warn("Could not atomically write adminUsersStore.json:", err);
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore
    }
  }
}

function toSafeUser(user: AdminUser): SafeAdminUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Finds an admin user by email
 */
export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  await ensureUsersTable();
  const normalizedEmail = email.toLowerCase().trim();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const user = await db.collection<AdminUser>(USERS_COLLECTION).findOne({ email: normalizedEmail });
        if (user) return user;
      }
    } catch (err) {
      console.error("Error finding user by email in MongoDB:", err);
    }
  }

  const users = await getJsonUsersFallback();
  return users.find((u) => u.email === normalizedEmail) || null;
}

/**
 * Finds an admin user by ID
 */
export async function findUserById(id: number): Promise<AdminUser | null> {
  await ensureUsersTable();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const user = await db.collection<AdminUser>(USERS_COLLECTION).findOne({ id });
        if (user) return user;
      }
    } catch (err) {
      console.error("Error finding user by id in MongoDB:", err);
    }
  }

  const users = await getJsonUsersFallback();
  return users.find((u) => u.id === id) || null;
}

/**
 * Returns all admin users without password hashes
 */
export async function getAllAdminUsers(): Promise<SafeAdminUser[]> {
  await ensureUsersTable();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const users = await db.collection<AdminUser>(USERS_COLLECTION).find().sort({ id: 1 }).toArray();
        return users.map(toSafeUser);
      }
    } catch (err) {
      console.error("Error fetching admin users from MongoDB:", err);
    }
  }

  const users = await getJsonUsersFallback();
  return users.map(toSafeUser);
}

/**
 * Creates a new admin or superadmin user
 */
export async function createAdminUser(data: {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}): Promise<{ success: boolean; user?: SafeAdminUser; error?: string }> {
  await ensureUsersTable();

  const normalizedEmail = data.email.toLowerCase().trim();
  const trimmedName = data.name.trim();

  // Check duplicate
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return { success: false, error: "An account with this email address already exists." };
  }

  const passwordHash = hashPassword(data.password);
  const role: AdminRole = data.role === "superadmin" ? "superadmin" : "admin";
  const status: AdminStatus = "active";

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const collection = db.collection<AdminUser>(USERS_COLLECTION);
        const lastUser = await collection.find().sort({ id: -1 }).limit(1).toArray();
        const nextId = (lastUser[0]?.id || 0) + 1;

        const newUser: AdminUser = {
          id: nextId,
          email: normalizedEmail,
          name: trimmedName,
          passwordHash,
          role,
          status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await collection.insertOne(newUser);
        return { success: true, user: toSafeUser(newUser) };
      }
    } catch (err) {
      console.error("Failed to insert admin user in MongoDB:", err);
      return { success: false, error: "Database error creating user." };
    }
  }

  // JSON Fallback
  const users = await getJsonUsersFallback();
  const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const newUser: AdminUser = {
    id: nextId,
    email: normalizedEmail,
    name: trimmedName,
    passwordHash,
    role,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  users.push(newUser);
  await saveJsonUsersFallback(users);

  return { success: true, user: toSafeUser(newUser) };
}

/**
 * Toggles an admin user between active and disabled status
 */
export async function toggleAdminUserStatus(
  targetUserId: number,
  requesterId: number
): Promise<{ success: boolean; newStatus?: AdminStatus; error?: string }> {
  await ensureUsersTable();

  if (targetUserId === requesterId) {
    return { success: false, error: "You cannot disable your own administrator account." };
  }

  const target = await findUserById(targetUserId);
  if (!target) {
    return { success: false, error: "Target administrator account not found." };
  }

  const newStatus: AdminStatus = target.status === "active" ? "disabled" : "active";

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        await db.collection<AdminUser>(USERS_COLLECTION).updateOne(
          { id: targetUserId },
          { $set: { status: newStatus, updatedAt: Date.now() } }
        );
        return { success: true, newStatus };
      }
    } catch (err) {
      console.error("Failed to toggle admin status in MongoDB:", err);
      return { success: false, error: "Database error updating user status." };
    }
  }

  const users = await getJsonUsersFallback();
  const user = users.find((u) => u.id === targetUserId);
  if (user) {
    user.status = newStatus;
    user.updatedAt = Date.now();
    await saveJsonUsersFallback(users);
    return { success: true, newStatus };
  }

  return { success: false, error: "User not found in storage." };
}

/**
 * Deletes an administrator account
 */
export async function deleteAdminUser(
  targetUserId: number,
  requesterId: number
): Promise<{ success: boolean; error?: string }> {
  await ensureUsersTable();

  if (targetUserId === requesterId) {
    return { success: false, error: "You cannot delete your own account." };
  }

  const target = await findUserById(targetUserId);
  if (!target) {
    return { success: false, error: "Administrator account not found." };
  }

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        await db.collection<AdminUser>(USERS_COLLECTION).deleteOne({ id: targetUserId });
        return { success: true };
      }
    } catch (err) {
      console.error("Failed to delete admin user in MongoDB:", err);
      return { success: false, error: "Database error deleting user." };
    }
  }

  const users = await getJsonUsersFallback();
  const filtered = users.filter((u) => u.id !== targetUserId);
  await saveJsonUsersFallback(filtered);
  return { success: true };
}
