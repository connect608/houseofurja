"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  updateTodaysSpecial,
  updateCategoryDish,
  addCategoryDish,
  deleteCategoryDish,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  toggleDishStatus,
  reorderCategoryDishes,
  type Dish,
} from "@/lib/menuService";
import { findUserByEmail, verifyPasswordHash } from "@/lib/userService";
import {
  isAuthenticated,
  setAdminSession,
  clearAdminSession,
} from "@/lib/auth";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import {
  validateTitle,
  validateDescription,
  validatePrice,
  validateCategoryKey,
  validateImageUrl,
} from "@/lib/validation";
import { validateAndSaveMenuImage } from "@/lib/fileSecurity";

/**
 * Administrator login action with email, scrypt hash, and brute-force protection
 */
export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const headersList = await headers();
  const clientIp = getClientIp(headersList);
  const rateLimitKey = `login:${clientIp}`;

  // 1. Check rate limit: 5 attempts per 15 minutes, with 15 min lockout
  const limitStatus = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!limitStatus.allowed) {
    const minutes = Math.ceil(limitStatus.retryAfterSeconds / 60);
    return {
      error: `Too many failed login attempts. Please wait ${minutes} minute(s) before trying again.`,
    };
  }

  const emailRaw = (formData.get("email") as string)?.trim().toLowerCase();
  const defaultSuperEmail = (process.env.SUPERADMIN_EMAIL || "admin@houseofurja.us").toLowerCase();
  const email = emailRaw || defaultSuperEmail;
  const password = (formData.get("password") as string)?.trim();

  if (!password) {
    return { error: "Please enter your password." };
  }

  // 2. Lookup user by email in MySQL or fallback store
  const user = await findUserByEmail(email);
  if (!user) {
    const attemptResult = recordFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    return {
      error: `Invalid email or password. (${attemptResult.remaining} attempts remaining)`,
    };
  }

  // 3. Verify account is not deactivated
  if (user.status === "disabled") {
    return {
      error: "This administrator account has been deactivated. Please contact the Superadmin.",
    };
  }

  // 4. Constant-time password verification via scrypt
  const isValid = verifyPasswordHash(password, user.passwordHash);
  if (!isValid) {
    const attemptResult = recordFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    if (attemptResult.locked) {
      return {
        error: "Too many failed login attempts. Account temporarily locked for 15 minutes.",
      };
    }
    return {
      error: `Invalid email or password. (${attemptResult.remaining} attempts remaining)`,
    };
  }

  // 5. Reset rate limit and set user session with role
  resetRateLimit(rateLimitKey);
  await setAdminSession(user.id, user.role);
  redirect("/admin");
}


export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function updateSpecialAction(formData: FormData) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const nameVal = validateTitle(formData.get("name"), "Special dish name");
  if (!nameVal.isValid) return { success: false, error: nameVal.error };

  const descVal = validateDescription(formData.get("description"), 500);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const priceVal = validatePrice(formData.get("price"));
  if (!priceVal.isValid) return { success: false, error: priceVal.error };

  const success = await updateTodaysSpecial({
    name: nameVal.sanitized!,
    description: descVal.sanitized!,
    price: priceVal.sanitized!,
  });

  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to update Today's Special in database." };
}

export async function updateDishAction(
  categoryKey: string,
  index: number,
  formData: FormData
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
    return { success: false, error: "Invalid dish identifier." };
  }

  const nameVal = validateTitle(formData.get("name"), "Dish name");
  if (!nameVal.isValid) return { success: false, error: nameVal.error };

  const descVal = validateDescription(formData.get("description"), 500);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const priceVal = validatePrice(formData.get("price"));
  if (!priceVal.isValid) return { success: false, error: priceVal.error };

  const success = await updateCategoryDish(catVal.sanitized!, index, {
    name: nameVal.sanitized!,
    description: descVal.sanitized!,
    price: priceVal.sanitized!,
  });

  if (success) {
    revalidatePath("/menu");
    return { success: true };
  }
  return { success: false, error: "Failed to update dish." };
}

export async function addDishAction(categoryKey: string, formData: FormData) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const nameVal = validateTitle(formData.get("name"), "Dish name");
  if (!nameVal.isValid) return { success: false, error: nameVal.error };

  const descVal = validateDescription(formData.get("description"), 500);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const priceVal = validatePrice(formData.get("price"));
  if (!priceVal.isValid) return { success: false, error: priceVal.error };

  const success = await addCategoryDish(catVal.sanitized!, {
    name: nameVal.sanitized!,
    description: descVal.sanitized!,
    price: priceVal.sanitized!,
  });

  if (success) {
    revalidatePath("/menu");
    return { success: true };
  }
  return { success: false, error: "Failed to add dish to category." };
}

export async function deleteDishAction(categoryKey: string, index: number) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
    return { success: false, error: "Invalid dish identifier." };
  }

  const success = await deleteCategoryDish(catVal.sanitized!, index);
  if (success) {
    revalidatePath("/menu");
    return { success: true };
  }
  return { success: false, error: "Failed to delete dish." };
}

export async function uploadCategoryImageAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const headersList = await headers();
  const clientIp = getClientIp(headersList);
  const rateLimitKey = `upload:${clientIp}`;

  const limitStatus = checkRateLimit(rateLimitKey, 30, 10 * 60 * 1000, 10 * 60 * 1000);
  if (!limitStatus.allowed) {
    return {
      success: false,
      error: `Upload rate limit reached. Please wait ${limitStatus.retryAfterSeconds} seconds.`,
    };
  }

  const file = formData.get("file") as File | null;
  const result = await validateAndSaveMenuImage(file);
  if (!result.success) {
    recordFailedAttempt(rateLimitKey, 30, 10 * 60 * 1000);
  }
  return result;
}

export async function addCategoryAction(formData: FormData) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(formData.get("categoryKey"));
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const rawTitle = formData.get("title");
  const titleVal = validateTitle(rawTitle || catVal.sanitized!, "Category title");
  if (!titleVal.isValid) return { success: false, error: titleVal.error };

  const descVal = validateDescription(formData.get("description") || "", 1000);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const rawImage = (formData.get("image") as string)?.trim() || "/assets/menu-chai.webp";
  const imgVal = validateImageUrl(rawImage);
  if (!imgVal.isValid) return { success: false, error: imgVal.error };

  const imageAlt = (formData.get("imageAlt") as string)?.trim().slice(0, 150) || titleVal.sanitized!;

  const description = descVal.sanitized!
    ? descVal.sanitized!
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : ["Handcrafted dishes and beverages prepared fresh daily."];

  const success = await addCategory({
    categoryKey: catVal.sanitized!,
    title: titleVal.sanitized!,
    description,
    image: imgVal.sanitized!,
    imageAlt,
  });

  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return {
    success: false,
    error: "Failed to create category or category already exists.",
  };
}

export async function updateCategoryAction(
  categoryKey: string,
  formData: FormData
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const rawTitle = formData.get("title");
  const titleVal = validateTitle(rawTitle || catVal.sanitized!, "Category title");
  if (!titleVal.isValid) return { success: false, error: titleVal.error };

  const descVal = validateDescription(formData.get("description") || "", 1000);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const rawImage = (formData.get("image") as string)?.trim() || "/assets/menu-chai.webp";
  const imgVal = validateImageUrl(rawImage);
  if (!imgVal.isValid) return { success: false, error: imgVal.error };

  const imageAlt = (formData.get("imageAlt") as string)?.trim().slice(0, 150) || titleVal.sanitized!;

  const description = descVal.sanitized!
    ? descVal.sanitized!
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : ["Handcrafted dishes and beverages prepared fresh daily."];

  const success = await updateCategory(catVal.sanitized!, {
    title: titleVal.sanitized!,
    description,
    image: imgVal.sanitized!,
    imageAlt,
  });

  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to update category details." };
}

export async function updateCategoryVisualAction(
  categoryKey: string,
  formData: FormData
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const imgVal = validateImageUrl(formData.get("image"));
  if (!imgVal.isValid) return { success: false, error: imgVal.error };

  const imageAlt = (formData.get("imageAlt") as string)?.trim().slice(0, 150) || catVal.sanitized!;

  const success = await updateCategory(catVal.sanitized!, {
    image: imgVal.sanitized!,
    imageAlt,
  });

  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to update category visual." };
}

export async function updateCategoryInfoAction(
  categoryKey: string,
  formData: FormData
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const titleVal = validateTitle(formData.get("title") || catVal.sanitized!, "Category title");
  if (!titleVal.isValid) return { success: false, error: titleVal.error };

  const descVal = validateDescription(formData.get("description") || "", 1000);
  if (!descVal.isValid) return { success: false, error: descVal.error };

  const description = descVal.sanitized!
    ? descVal.sanitized!
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : ["Handcrafted dishes and beverages prepared fresh daily."];

  const success = await updateCategory(catVal.sanitized!, {
    title: titleVal.sanitized!,
    description,
  });

  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to update category info." };
}

export async function deleteCategoryAction(categoryKey: string) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  if (categoryKey === "Today's Special") {
    return {
      success: false,
      error: "Cannot delete the core 'Today's Special' category.",
    };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const success = await deleteCategory(catVal.sanitized!);
  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to delete category." };
}

export async function toggleCategoryStatusAction(categoryKey: string) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  const success = await toggleCategoryStatus(catVal.sanitized!);
  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to toggle category status." };
}

export async function toggleDishStatusAction(categoryKey: string, index: number) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
    return { success: false, error: "Invalid dish identifier." };
  }

  const success = await toggleDishStatus(catVal.sanitized!, index);
  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to toggle dish availability." };
}

export async function reorderDishesAction(
  categoryKey: string,
  orderedItems: Dish[]
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  const catVal = validateCategoryKey(categoryKey);
  if (!catVal.isValid) return { success: false, error: catVal.error };

  if (!Array.isArray(orderedItems)) {
    return { success: false, error: "Invalid items list format." };
  }

  for (const dish of orderedItems) {
    if (!dish || typeof dish.name !== "string" || typeof dish.price !== "string") {
      return { success: false, error: "Invalid dish data encountered." };
    }
  }

  const success = await reorderCategoryDishes(catVal.sanitized!, orderedItems);
  if (success) {
    revalidatePath("/menu");
    revalidatePath("/");
    return { success: true };
  }
  return { success: false, error: "Failed to save reordered dish list." };
}

