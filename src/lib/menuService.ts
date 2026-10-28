import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isMongoConfigured, getMongoDb } from "./mongodb";
import { menuCategories as defaultCategories, MenuCategory, Dish } from "@/data/menuData";

export type { Dish, MenuCategory };
export type MenuRecord = Record<string, MenuCategory>;

const JSON_STORE_PATH = path.join(process.cwd(), "src", "data", "menuStore.json");
const MENU_COLLECTION = "menu_categories";

export interface MongoMenuCategoryDoc {
  categoryKey: string;
  title: string;
  description: string[];
  image: string;
  imageAlt: string;
  displayOrder: number;
  isActive: boolean;
  items: Dish[];
}

let isInitialized = false;

/**
 * Ensures MongoDB Atlas collection exists and is seeded with initial categories
 */
async function ensureCollections(): Promise<boolean> {
  if (isInitialized || !isMongoConfigured()) return false;

  try {
    const db = await getMongoDb();
    if (!db) return false;

    const collection = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
    await collection.createIndex({ categoryKey: 1 }, { unique: true });
    await collection.createIndex({ displayOrder: 1 });

    const count = await collection.countDocuments();
    if (count === 0) {
      console.log("Seeding MongoDB Atlas menu collection from default menuData...");
      let order = 0;
      const initialDocs: MongoMenuCategoryDoc[] = Object.entries(defaultCategories).map(
        ([key, cat]) => ({
          categoryKey: key,
          title: cat.title,
          description: cat.description,
          image: cat.image,
          imageAlt: cat.imageAlt,
          displayOrder: order++,
          isActive: true,
          items: cat.items.map((d) => ({ ...d, isAvailable: d.isAvailable !== false })),
        })
      );
      await collection.insertMany(initialDocs);
    }

    isInitialized = true;
    return true;
  } catch (err) {
    console.error("Failed to initialize MongoDB Atlas menu collections:", err);
    return false;
  }
}

/**
 * Reads menu categories from JSON fallback store
 */
export async function getJsonMenuFallback(): Promise<MenuRecord> {
  try {
    const data = await fs.readFile(JSON_STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return defaultCategories;
  }
}

/**
 * Atomically writes menu categories to JSON fallback store
 */
export async function saveJsonMenuFallback(menu: MenuRecord): Promise<void> {
  const tempPath = `${JSON_STORE_PATH}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.mkdir(path.dirname(JSON_STORE_PATH), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(menu, null, 2), "utf-8");
    await fs.rename(tempPath, JSON_STORE_PATH);
  } catch (err) {
    console.warn("Could not atomically write menuStore.json:", err);
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Retrieves the full menu, optionally including inactive/hidden categories and dishes
 */
export async function getMenu(includeInactive = false): Promise<MenuRecord> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const filter = includeInactive ? {} : { isActive: { $ne: false } };
        const docs = await db
          .collection<MongoMenuCategoryDoc>(MENU_COLLECTION)
          .find(filter)
          .sort({ displayOrder: 1 })
          .toArray();

        if (docs && docs.length > 0) {
          const result: MenuRecord = {};
          for (const doc of docs) {
            const items = includeInactive
              ? doc.items || []
              : (doc.items || []).filter((item) => item.isAvailable !== false);

            result[doc.categoryKey] = {
              title: doc.title,
              description: doc.description,
              image: doc.image,
              imageAlt: doc.imageAlt,
              isActive: doc.isActive !== false,
              items,
            };
          }
          return result;
        }
      }
    } catch (err) {
      console.error("MongoDB Atlas getMenu error, falling back to JSON:", err);
    }
  }

  // JSON Fallback
  const fallback = await getJsonMenuFallback();
  if (includeInactive) {
    return fallback;
  }

  const activeOnly: MenuRecord = {};
  for (const [key, category] of Object.entries(fallback)) {
    if (category.isActive !== false) {
      activeOnly[key] = {
        ...category,
        items: category.items.filter((item) => item.isAvailable !== false),
      };
    }
  }
  return activeOnly;
}

/**
 * Updates Today's Special dish
 */
export async function updateTodaysSpecial(dish: Dish): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const spec = await col.findOne({ categoryKey: "Today's Special" });
        if (spec) {
          const items = [...(spec.items || [])];
          items[0] = { ...dish, isAvailable: true };
          const res = await col.updateOne({ categoryKey: "Today's Special" }, { $set: { items } });
          return res.acknowledged && (res.matchedCount > 0 || res.modifiedCount > 0);
        }
      }
      return false;
    } catch (err) {
      console.error("MongoDB Atlas updateTodaysSpecial error:", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Cannot update Today's Special: MONGODB_URI is not configured in production.");
    return false;
  }

  const menu = await getJsonMenuFallback();
  if (menu["Today's Special"]) {
    menu["Today's Special"].items[0] = { ...dish, isAvailable: true };
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Updates a specific dish inside any category
 */
export async function updateCategoryDish(
  categoryKey: string,
  dishIndex: number,
  dish: Dish
): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const cat = await col.findOne({ categoryKey });
        if (cat && cat.items && cat.items[dishIndex]) {
          const items = [...cat.items];
          const prevAvailable = items[dishIndex].isAvailable !== false;
          items[dishIndex] = { ...dish, isAvailable: prevAvailable };
          const res = await col.updateOne({ categoryKey }, { $set: { items } });
          return res.acknowledged && (res.matchedCount > 0 || res.modifiedCount > 0);
        }
      }
      return false;
    } catch (err) {
      console.error("MongoDB Atlas updateCategoryDish error:", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Cannot update dish: MONGODB_URI is not configured in production.");
    return false;
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey] && menu[categoryKey].items[dishIndex]) {
    const prevAvailable = menu[categoryKey].items[dishIndex].isAvailable !== false;
    menu[categoryKey].items[dishIndex] = { ...dish, isAvailable: prevAvailable };
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Adds a new dish to a category
 */
export async function addCategoryDish(categoryKey: string, dish: Dish): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const res = await col.updateOne(
          { categoryKey },
          { $push: { items: { ...dish, isAvailable: true } } }
        );
        return res.acknowledged && (res.modifiedCount > 0 || res.matchedCount > 0);
      }
      return false;
    } catch (err) {
      console.error("MongoDB Atlas addCategoryDish error:", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Cannot add dish: MONGODB_URI is not configured in production.");
    return false;
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey]) {
    menu[categoryKey].items.push({ ...dish, isAvailable: true });
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Deletes a dish from a category
 */
export async function deleteCategoryDish(categoryKey: string, dishIndex: number): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const cat = await col.findOne({ categoryKey });
        if (cat && cat.items && cat.items[dishIndex]) {
          const items = cat.items.filter((_, idx) => idx !== dishIndex);
          await col.updateOne({ categoryKey }, { $set: { items } });
          return true;
        }
      }
    } catch (err) {
      console.error("MongoDB Atlas deleteCategoryDish error:", err);
    }
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey] && menu[categoryKey].items[dishIndex]) {
    menu[categoryKey].items.splice(dishIndex, 1);
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Toggles a dish availability between Live and Disabled
 */
export async function toggleDishStatus(categoryKey: string, dishIndex: number): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const cat = await col.findOne({ categoryKey });
        if (cat && cat.items && cat.items[dishIndex]) {
          const items = [...cat.items];
          const current = items[dishIndex].isAvailable !== false;
          items[dishIndex].isAvailable = !current;
          const res = await col.updateOne({ categoryKey }, { $set: { items } });
          return res.acknowledged && (res.matchedCount > 0 || res.modifiedCount > 0);
        }
      }
      return false;
    } catch (err) {
      console.error("MongoDB Atlas toggleDishStatus error:", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Cannot toggle dish status: MONGODB_URI is not configured in production.");
    return false;
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey] && menu[categoryKey].items[dishIndex]) {
    const current = menu[categoryKey].items[dishIndex].isAvailable !== false;
    menu[categoryKey].items[dishIndex].isAvailable = !current;
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Creates a new category
 */
export async function addCategory(
  categoryKeyOrData:
    | string
    | {
        categoryKey: string;
        title: string;
        description: string[];
        image: string;
        imageAlt: string;
      },
  title?: string,
  description?: string[],
  image?: string,
  imageAlt?: string
): Promise<boolean> {
  await ensureCollections();

  const categoryKey =
    typeof categoryKeyOrData === "object" ? categoryKeyOrData.categoryKey : categoryKeyOrData;
  const finalTitle =
    typeof categoryKeyOrData === "object" ? categoryKeyOrData.title : title || "";
  const finalDescription =
    typeof categoryKeyOrData === "object"
      ? categoryKeyOrData.description
      : description || ["Fresh selections daily."];
  const finalImage =
    typeof categoryKeyOrData === "object"
      ? categoryKeyOrData.image
      : image || "/assets/menu-chai.webp";
  const finalImageAlt =
    typeof categoryKeyOrData === "object" ? categoryKeyOrData.imageAlt : imageAlt || "";

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const last = await col.find().sort({ displayOrder: -1 }).limit(1).toArray();
        const displayOrder = (last[0]?.displayOrder ?? -1) + 1;

        await col.insertOne({
          categoryKey,
          title: finalTitle,
          description: finalDescription,
          image: finalImage,
          imageAlt: finalImageAlt,
          displayOrder,
          isActive: true,
          items: [],
        });
        return true;
      }
    } catch (err) {
      console.error("MongoDB Atlas addCategory error:", err);
    }
  }

  const menu = await getJsonMenuFallback();
  if (!menu[categoryKey]) {
    menu[categoryKey] = {
      title: finalTitle,
      description: finalDescription,
      image: finalImage,
      imageAlt: finalImageAlt,
      isActive: true,
      items: [],
    };
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Updates category details
 */
export async function updateCategory(
  categoryKey: string,
  updates: Partial<Omit<MenuCategory, "items">>
): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const setObj: Partial<MongoMenuCategoryDoc> = {};
        if (updates.title !== undefined) setObj.title = updates.title;
        if (updates.description !== undefined) setObj.description = updates.description;
        if (updates.image !== undefined) setObj.image = updates.image;
        if (updates.imageAlt !== undefined) setObj.imageAlt = updates.imageAlt;
        if (updates.isActive !== undefined) setObj.isActive = updates.isActive;

        const res = await col.updateOne({ categoryKey }, { $set: setObj });
        return res.modifiedCount > 0;
      }
    } catch (err) {
      console.error("MongoDB Atlas updateCategory error:", err);
    }
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey]) {
    menu[categoryKey] = {
      ...menu[categoryKey],
      ...updates,
    };
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Updates visual image for a category
 */
export async function updateCategoryVisual(
  categoryKey: string,
  image: string,
  imageAlt: string
): Promise<boolean> {
  return updateCategory(categoryKey, { image, imageAlt });
}

/**
 * Updates title and description copy for a category
 */
export async function updateCategoryInfo(
  categoryKey: string,
  title: string,
  description: string[]
): Promise<boolean> {
  return updateCategory(categoryKey, { title, description });
}

/**
 * Toggles a category between Live and Disabled
 */
export async function toggleCategoryStatus(categoryKey: string): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const cat = await col.findOne({ categoryKey });
        if (cat) {
          const current = cat.isActive !== false;
          await col.updateOne({ categoryKey }, { $set: { isActive: !current } });
          return true;
        }
      }
    } catch (err) {
      console.error("MongoDB Atlas toggleCategoryStatus error:", err);
    }
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey]) {
    const current = menu[categoryKey].isActive !== false;
    menu[categoryKey].isActive = !current;
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Deletes an entire category and all its items
 */
export async function deleteCategory(categoryKey: string): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const res = await col.deleteOne({ categoryKey });
        return res.deletedCount > 0;
      }
    } catch (err) {
      console.error("MongoDB Atlas deleteCategory error:", err);
    }
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey]) {
    delete menu[categoryKey];
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

/**
 * Updates the order of all dishes inside a category
 */
export async function reorderCategoryDishes(
  categoryKey: string,
  items: Dish[]
): Promise<boolean> {
  await ensureCollections();

  if (isMongoConfigured()) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection<MongoMenuCategoryDoc>(MENU_COLLECTION);
        const res = await col.updateOne({ categoryKey }, { $set: { items } });
        return res.acknowledged && (res.matchedCount > 0 || res.modifiedCount > 0);
      }
      return false;
    } catch (err) {
      console.error("MongoDB Atlas reorderCategoryDishes error:", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Cannot reorder dishes: MONGODB_URI is not configured in production.");
    return false;
  }

  const menu = await getJsonMenuFallback();
  if (menu[categoryKey]) {
    menu[categoryKey].items = items;
    await saveJsonMenuFallback(menu);
    return true;
  }
  return false;
}

