import { cookies } from "next/headers";
import crypto from "crypto";
import { findUserById, type AdminRole, type SafeAdminUser } from "./userService";

const SESSION_COOKIE_NAME = "hou_admin_session";
const SECRET = process.env.ADMIN_SESSION_SECRET || "house_of_urja_admin_secret_key_2026";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export interface TokenPayload {
  userId: number;
  role: AdminRole;
  expiresAt: number;
  nonce: string;
}

/**
 * Creates a cryptographically signed user session token
 * Token format: <userId>.<role>.<expiresAt>.<nonce>.<signature>
 */
export function createSessionToken(userId: number, role: AdminRole): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${userId}.${role}.${expiresAt}.${nonce}`;

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(`session:${payload}`);
  const signature = hmac.digest("hex");

  return `${payload}.${signature}`;
}

/**
 * Verifies if a token is valid, untampered, and unexpired
 */
export function verifySessionToken(token: string): { valid: boolean; payload?: TokenPayload } {
  if (!token || typeof token !== "string") return { valid: false };

  const parts = token.split(".");
  if (parts.length !== 5) return { valid: false };

  const [userIdStr, roleStr, expiresAtStr, nonce, signature] = parts;
  const userId = Number(userIdStr);
  const expiresAt = Number(expiresAtStr);

  if (Number.isNaN(userId) || Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false };
  }

  const role: AdminRole = roleStr === "superadmin" ? "superadmin" : "admin";
  const payload = `${userId}.${role}.${expiresAt}.${nonce}`;

  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(`session:${payload}`);
  const expectedSignature = hmac.digest("hex");

  const sigBuffer = Buffer.from(signature, "utf-8");
  const expectedSigBuffer = Buffer.from(expectedSignature, "utf-8");

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return { valid: false };
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false };
  }

  return {
    valid: true,
    payload: { userId, role, expiresAt, nonce },
  };
}

/**
 * Sets session cookie for authenticated user
 */
export async function setAdminSession(userId: number, role: AdminRole): Promise<void> {
  const token = createSessionToken(userId, role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Retrieves the currently authenticated admin user and verifies active status
 */
export async function getSessionUser(): Promise<SafeAdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.payload) return null;

  const user = await findUserById(verified.payload.userId);
  if (!user || user.status !== "active") {
    // If account was deleted or disabled, invalidate session immediately
    return null;
  }

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


export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && user.status === "active";
}

export async function isSuperAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && user.role === "superadmin" && user.status === "active";
}


