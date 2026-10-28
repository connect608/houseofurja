interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

// In-memory store for rate limiting
const store = new Map<string, RateLimitRecord>();

// Clean up stale entries every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const MAX_STALE_MS = 60 * 60 * 1000; // 1 hour
  for (const [key, record] of store.entries()) {
    if (now - record.firstAttempt > MAX_STALE_MS && (!record.lockedUntil || now > record.lockedUntil)) {
      store.delete(key);
    }
  }
}

/**
 * Check if an action is currently rate limited
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };
  }

  // Check if currently in lockout period
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  // Check if window has expired
  if (now - record.firstAttempt > windowMs) {
    store.delete(key);
    return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };
  }

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxAttempts - record.attempts),
  };
}

/**
 * Record a failed attempt
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000
): { locked: boolean; retryAfterSeconds: number; remaining: number } {
  cleanupStaleEntries();
  const now = Date.now();
  let record = store.get(key);

  if (!record || now - record.firstAttempt > windowMs) {
    record = { attempts: 1, firstAttempt: now };
    store.set(key, record);
    return {
      locked: false,
      retryAfterSeconds: 0,
      remaining: Math.max(0, maxAttempts - 1),
    };
  }

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    return { locked: true, retryAfterSeconds, remaining: 0 };
  }

  return {
    locked: false,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxAttempts - record.attempts),
  };
}

/**
 * Reset rate limit upon successful action
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Safely extract client IP from headers
 */
export function getClientIp(headers: Headers): string {
  // Try X-Forwarded-For first (format: "client, proxy1, proxy2")
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (isValidIp(firstIp)) return firstIp;
  }

  // Try X-Real-IP
  const realIp = headers.get("x-real-ip");
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // Fallback to CF-Connecting-IP (if Cloudflare is ever used)
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  return "127.0.0.1";
}

function isValidIp(ip: string): boolean {
  // Basic IPv4 and IPv6 format validation
  const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Pattern = /^[a-fA-F0-9:]+$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}
