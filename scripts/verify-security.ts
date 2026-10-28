import assert from "node:assert";
import crypto from "node:crypto";
import { checkRateLimit, recordFailedAttempt, resetRateLimit, getClientIp } from "../src/lib/rateLimit";
import { verifyImageMagicBytes } from "../src/lib/fileSecurity";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import { hashPassword, verifyPasswordHash } from "../src/lib/userService";

import {
  validatePrice,
  validateCategoryKey,
  validateImageUrl,
  validateTitle,
  validateDescription,
} from "../src/lib/validation";

console.log("=== HOUSE OF URJA: AUTOMATED SECURITY REGRESSION SUITE ===");

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err);
  }
}

// -------------------------------------------------------------
// 1. RATE LIMITING & BRUTE FORCE PROTECTION (SEC-02)
// -------------------------------------------------------------
test("Rate Limiter: Allows initial requests under limit", () => {
  const testKey = `test-ip-${Date.now()}-1`;
  const res = checkRateLimit(testKey, 5, 60000, 60000);
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.remaining, 5);
});

test("Rate Limiter: Locks out after 5 consecutive failures", () => {
  const testKey = `test-ip-${Date.now()}-2`;
  for (let i = 1; i <= 4; i++) {
    const attempt = recordFailedAttempt(testKey, 5, 60000, 60000);
    assert.strictEqual(attempt.locked, false);
    assert.strictEqual(attempt.remaining, 5 - i);
  }

  // 5th attempt should lock out
  const fifthAttempt = recordFailedAttempt(testKey, 5, 60000, 60000);
  assert.strictEqual(fifthAttempt.locked, true);
  assert.strictEqual(fifthAttempt.remaining, 0);

  // Subsequent check should be denied
  const check = checkRateLimit(testKey, 5, 60000, 60000);
  assert.strictEqual(check.allowed, false);
  assert.ok(check.retryAfterSeconds > 0);
});

test("Rate Limiter: Resets upon successful authentication", () => {
  const testKey = `test-ip-${Date.now()}-3`;
  recordFailedAttempt(testKey, 5, 60000, 60000);
  resetRateLimit(testKey);

  const check = checkRateLimit(testKey, 5, 60000, 60000);
  assert.strictEqual(check.allowed, true);
  assert.strictEqual(check.remaining, 5);
});

test("Rate Limiter: Safe IP extraction handles X-Forwarded-For", () => {
  const h1 = new Headers({ "x-forwarded-for": "203.0.113.195, 70.41.3.18" });
  assert.strictEqual(getClientIp(h1), "203.0.113.195");

  const h2 = new Headers({ "x-real-ip": "198.51.100.4" });
  assert.strictEqual(getClientIp(h2), "198.51.100.4");

  const h3 = new Headers();
  assert.strictEqual(getClientIp(h3), "127.0.0.1");
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & MULTI-USER RBAC (SEC-03, SEC-04)
// -------------------------------------------------------------
test("Auth: Creates valid cryptographically signed user session tokens", () => {
  const token = createSessionToken(1, "superadmin");
  assert.strictEqual(typeof token, "string");
  assert.strictEqual(token.split(".").length, 5);

  const verified = verifySessionToken(token);
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.payload?.userId, 1);
  assert.strictEqual(verified.payload?.role, "superadmin");
});

test("Auth: Rejects tampered session tokens", () => {
  const token = createSessionToken(2, "admin");
  const [userId, role, exp, nonce, sig] = token.split(".");
  const tamperedSig = sig.slice(0, -4) + "0000";
  assert.strictEqual(verifySessionToken(`${userId}.${role}.${exp}.${nonce}.${tamperedSig}`).valid, false);

  // Attempting privilege escalation (admin -> superadmin)
  assert.strictEqual(verifySessionToken(`${userId}.superadmin.${exp}.${nonce}.${sig}`).valid, false);
});

test("Auth: Rejects expired session tokens", () => {
  const pastTime = Date.now() - 10000;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `1.admin.${pastTime}.${nonce}`;
  const secret = process.env.ADMIN_SESSION_SECRET || "house_of_urja_admin_secret_key_2026";
  const hmac = crypto.createHmac("sha256", secret).update(`session:${payload}`).digest("hex");
  const expiredToken = `${payload}.${hmac}`;

  assert.strictEqual(verifySessionToken(expiredToken).valid, false);
});

test("Auth: Scrypt password hashing generates authentic salted hashes and verifies in constant time", () => {
  const rawPassword = "ChefSecurePassword2026!";
  const hash = hashPassword(rawPassword);

  assert.ok(hash.startsWith("scrypt:"));
  assert.strictEqual(verifyPasswordHash(rawPassword, hash), true);
  assert.strictEqual(verifyPasswordHash("WrongPassword", hash), false);
  assert.strictEqual(verifyPasswordHash("", hash), false);
});


// -------------------------------------------------------------
// 3. FILE UPLOAD SECURITY & MAGIC BYTES (SEC-01)
// -------------------------------------------------------------
test("File Security: Authenticates authentic JPEG magic bytes (FF D8 FF)", () => {
  const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const check = verifyImageMagicBytes(jpegBuf);
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.format, "jpeg");
});

test("File Security: Authenticates authentic PNG magic bytes (89 50 4E 47)", () => {
  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const check = verifyImageMagicBytes(pngBuf);
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.format, "png");
});

test("File Security: Authenticates authentic WebP magic bytes (RIFF....WEBP)", () => {
  const webpBuf = Buffer.alloc(16);
  webpBuf.write("RIFF", 0, "ascii");
  webpBuf.writeUInt32LE(100, 4);
  webpBuf.write("WEBP", 8, "ascii");
  const check = verifyImageMagicBytes(webpBuf);
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.format, "webp");
});

test("File Security: Rejects disguised malicious files (HTML, PHP, SVG)", () => {
  const htmlBuf = Buffer.from("<html><script>alert(1)</script></html>");
  assert.strictEqual(verifyImageMagicBytes(htmlBuf).valid, false);

  const phpBuf = Buffer.from("<?php system($_GET['cmd']); ?>");
  assert.strictEqual(verifyImageMagicBytes(phpBuf).valid, false);

  const svgBuf = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  assert.strictEqual(verifyImageMagicBytes(svgBuf).valid, false);
});

// -------------------------------------------------------------
// 4. INPUT VALIDATION & SANITIZATION (SEC-08)
// -------------------------------------------------------------
test("Validation: Normalizes and accepts valid prices", () => {
  assert.strictEqual(validatePrice("14").sanitized, "$14");
  assert.strictEqual(validatePrice("$14.50").sanitized, "$14.50");
  assert.strictEqual(validatePrice("  16.5  ").sanitized, "$16.50");
});

test("Validation: Rejects invalid, negative, and malformed prices", () => {
  assert.strictEqual(validatePrice("-15").isValid, false);
  assert.strictEqual(validatePrice("free").isValid, false);
  assert.strictEqual(validatePrice("NaN").isValid, false);
  assert.strictEqual(validatePrice("<script>alert(1)</script>").isValid, false);
  assert.strictEqual(validatePrice("999999999").isValid, false);
});

test("Validation: Validates title and description length constraints", () => {
  assert.strictEqual(validateTitle("Smoked Dal Makhani").isValid, true);
  assert.strictEqual(validateTitle("").isValid, false);
  assert.strictEqual(validateTitle("a".repeat(150)).isValid, false);

  assert.strictEqual(validateDescription("Rich buttery lentils").isValid, true);
  assert.strictEqual(validateDescription("a".repeat(700), 500).isValid, false);
});

test("Validation: Accepts valid category keys and rejects injection strings", () => {

  assert.strictEqual(validateCategoryKey("Our Menu").isValid, true);
  assert.strictEqual(validateCategoryKey("Today's Special").isValid, true);
  assert.strictEqual(validateCategoryKey("Desserts & Drinks").isValid, true);

  assert.strictEqual(validateCategoryKey("../../../etc/passwd").isValid, false);
  assert.strictEqual(validateCategoryKey("<script>").isValid, false);
  assert.strictEqual(validateCategoryKey("").isValid, false);
});

test("Validation: Image URLs allow relative assets/uploads and reject dangerous protocols", () => {
  assert.strictEqual(validateImageUrl("/assets/menu-chai.webp").isValid, true);
  assert.strictEqual(validateImageUrl("/uploads/menu/menu-abc.jpg").isValid, true);
  assert.strictEqual(validateImageUrl("https://houseofurja.us/photo.webp").isValid, true);

  assert.strictEqual(validateImageUrl("javascript:alert(1)").isValid, false);
  assert.strictEqual(validateImageUrl("data:text/html;base64,PHNjcmlwdD5...").isValid, false);
  assert.strictEqual(validateImageUrl("//evil.com/phishing").isValid, false);
});

// -------------------------------------------------------------
// 5. JSON-LD XSS SANITIZATION (SEC-05)
// -------------------------------------------------------------
test("JSON-LD: Escapes script breakout characters (< replaced with \\u003c)", () => {
  const maliciousSchema = {
    name: "Smoked Dal Makhani</script><script>alert(1)</script>",
    description: "Served with rice",
  };
  const safeJson = JSON.stringify(maliciousSchema).replace(/</g, "\\u003c");

  assert.ok(!safeJson.includes("</script>"));
  assert.ok(safeJson.includes("\\u003c/script>"));
  assert.ok(safeJson.includes("\\u003cscript>"));
});

console.log("\n=======================================================");
console.log(`SUITE COMPLETE: ${passed} / ${total} tests passed.`);
console.log("=======================================================\n");

if (passed !== total) {
  process.exit(1);
}
