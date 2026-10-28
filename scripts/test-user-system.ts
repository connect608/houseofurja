import assert from "node:assert";
import {
  ensureUsersTable,
  findUserByEmail,
  createAdminUser,
  toggleAdminUserStatus,
  getAllAdminUsers,
  deleteAdminUser,
} from "../src/lib/userService";
import { verifyPasswordHash } from "../src/lib/userService";

console.log("=== TESTING MULTI-USER & RBAC SYSTEM ===");

async function run() {
  // 1. Ensure table and Superadmin seed
  await ensureUsersTable();
  const superadmin = await findUserByEmail("admin@houseofurja.us");
  assert.ok(superadmin, "Default Superadmin should exist");
  assert.strictEqual(superadmin?.role, "superadmin");
  assert.strictEqual(superadmin?.status, "active");
  console.log("  ✓ [PASS] Superadmin auto-seeded successfully");

  // 2. Create staff admin account
  const testEmail = `chef-${Date.now()}@houseofurja.us`;
  const createRes = await createAdminUser({
    email: testEmail,
    name: "Chef Vikram",
    password: "KitchenSecret2026!",
    role: "admin",
  });
  assert.strictEqual(createRes.success, true, "Staff creation should succeed");
  assert.ok(createRes.user, "Created user should be returned");
  assert.strictEqual(createRes.user?.email, testEmail);
  assert.strictEqual(createRes.user?.role, "admin");
  assert.strictEqual(createRes.user?.status, "active");
  console.log("  ✓ [PASS] Staff admin account created successfully");

  // 3. Verify password hash matches
  const createdUserWithHash = await findUserByEmail(testEmail);
  assert.ok(createdUserWithHash);
  assert.strictEqual(verifyPasswordHash("KitchenSecret2026!", createdUserWithHash.passwordHash), true);
  assert.strictEqual(verifyPasswordHash("WrongPassword", createdUserWithHash.passwordHash), false);
  console.log("  ✓ [PASS] Scrypt password verification verified");

  // 4. Toggle account status to 'disabled'
  const toggleRes = await toggleAdminUserStatus(createRes.user.id, superadmin.id);
  assert.strictEqual(toggleRes.success, true);
  assert.strictEqual(toggleRes.newStatus, "disabled");

  const disabledUser = await findUserByEmail(testEmail);
  assert.strictEqual(disabledUser?.status, "disabled");
  console.log("  ✓ [PASS] Superadmin deactivation toggle verified");

  // 5. Verify self-disable protection
  const selfToggle = await toggleAdminUserStatus(superadmin.id, superadmin.id);
  assert.strictEqual(selfToggle.success, false);
  console.log("  ✓ [PASS] Self-deactivation protection verified");

  // 6. Delete test staff account
  const delRes = await deleteAdminUser(createRes.user.id, superadmin.id);
  assert.strictEqual(delRes.success, true);
  const deletedUser = await findUserByEmail(testEmail);
  assert.strictEqual(deletedUser, null);
  console.log("  ✓ [PASS] Account deletion verified");

  // 7. Verify list
  const list = await getAllAdminUsers();
  assert.ok(list.length >= 1);
  console.log(`  ✓ [PASS] Retrieved ${list.length} active staff records`);

  console.log("\nALL RBAC MULTI-USER TESTS PASSED SUCCESSFULLY!\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
