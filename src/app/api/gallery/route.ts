import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export interface GalleryImageItem {
  url: string;
  filename: string;
  name: string;
  category: "menu" | "uploads" | "general";
  sizeKb: number;
  mtime: number;
}

const IMAGE_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export async function GET(request: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 60 requests per 5 minutes per IP
    const clientIp = getClientIp(request.headers);
    const limitStatus = checkRateLimit(`gallery:${clientIp}`, 60, 5 * 60 * 1000);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests to gallery. Please wait a moment." },
        { status: 429 }
      );
    }

    const images: GalleryImageItem[] = [];
    const publicDir = path.join(process.cwd(), "public");

    // 1. Scan public/uploads/menu asynchronously
    const uploadsDir = path.join(publicDir, "uploads", "menu");
    try {
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          const fullPath = path.join(uploadsDir, file);
          const stats = await fs.stat(fullPath);
          images.push({
            url: `/uploads/menu/${file}`,
            filename: file,
            name: file.replace(/^menu-[a-f0-9-]+-?/, "").replace(ext, "").replace(/_/g, " "),
            category: "uploads",
            sizeKb: Math.round(stats.size / 1024),
            mtime: stats.mtimeMs,
          });
        }
      }
    } catch {
      // uploads folder may not exist yet or be empty
    }

    // 2. Scan public/assets asynchronously
    const assetsDir = path.join(publicDir, "assets");
    try {
      const files = await fs.readdir(assetsDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          const fullPath = path.join(assetsDir, file);
          const stats = await fs.stat(fullPath);
          const isIconOrMark =
            file.includes("mark") ||
            file.includes("logo") ||
            file.includes("ornament") ||
            file.includes("illustration") ||
            file.includes("pepper");
          const isMenu =
            !isIconOrMark &&
            (file.startsWith("menu-") ||
              file.includes("dish") ||
              file.includes("chai") ||
              file.includes("special") ||
              file.includes("kofta") ||
              file.includes("sips"));

          images.push({
            url: `/assets/${file}`,
            filename: file,
            name: file.replace(ext, "").replace(/[-_]/g, " "),
            category: isMenu ? "menu" : "general",
            sizeKb: Math.round(stats.size / 1024),
            mtime: stats.mtimeMs,
          });
        }
      }
    } catch (err) {
      console.warn("Could not scan assets dir:", err);
    }

    // Sort: Uploads first (newest to oldest), then menu assets, then others
    images.sort((a, b) => {
      if (a.category === "uploads" && b.category !== "uploads") return -1;
      if (b.category === "uploads" && a.category !== "uploads") return 1;
      if (a.category === "menu" && b.category !== "menu") return -1;
      if (b.category === "menu" && a.category !== "menu") return 1;
      return b.mtime - a.mtime;
    });

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Gallery scan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load gallery images" },
      { status: 500 }
    );
  }
}

