"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, isSuperAdmin } from "@/lib/auth";
import {
  createAdminUser,
  toggleAdminUserStatus,
  deleteAdminUser,
  type AdminRole,
} from "@/lib/userService";

/**
 * Superadmin action to register a new admin or chef account
 */
export async function createAdminUserAction(formData: FormData) {
  const superAuthed = await isSuperAdmin();
  if (!superAuthed) {
    return { success: false, error: "Unauthorized. Superadmin privilege required." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const roleRaw = (formData.get("role") as string)?.trim().toLowerCase();
  const role: AdminRole = roleRaw === "superadmin" ? "superadmin" : "admin";

  // Validations
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!name || name.length < 2 || name.length > 80) {
    return { success: false, error: "Name must be between 2 and 80 characters." };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const result = await createAdminUser({ email, name, password, role });
  if (result.success) {
    revalidatePath("/admin");
    return { success: true };
  }
  return { success: false, error: result.error || "Failed to create staff account." };
}

/**
 * Superadmin action to toggle staff account active / disabled
 */
export async function toggleAdminStatusAction(targetUserId: number) {
  const superAuthed = await isSuperAdmin();
  if (!superAuthed) {
    return { success: false, error: "Unauthorized. Superadmin privilege required." };
  }

  const currentUser = await getSessionUser();
  if (!currentUser) {
    return { success: false, error: "Session invalid." };
  }

  const result = await toggleAdminUserStatus(targetUserId, currentUser.id);
  if (result.success) {
    revalidatePath("/admin");
    return { success: true, newStatus: result.newStatus };
  }
  return { success: false, error: result.error || "Failed to toggle account status." };
}

/**
 * Superadmin action to delete a staff account
 */
export async function deleteAdminUserAction(targetUserId: number) {
  const superAuthed = await isSuperAdmin();
  if (!superAuthed) {
    return { success: false, error: "Unauthorized. Superadmin privilege required." };
  }

  const currentUser = await getSessionUser();
  if (!currentUser) {
    return { success: false, error: "Session invalid." };
  }

  const result = await deleteAdminUser(targetUserId, currentUser.id);
  if (result.success) {
    revalidatePath("/admin");
    return { success: true };
  }
  return { success: false, error: result.error || "Failed to delete account." };
}
