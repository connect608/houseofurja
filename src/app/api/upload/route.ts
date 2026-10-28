import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { validateAndSaveMenuImage } from "@/lib/fileSecurity";
import { checkRateLimit, recordFailedAttempt, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to admin portal." },
        { status: 401 }
      );
    }

    // Rate limiting on uploads: max 30 uploads per 10 minutes per IP
    const clientIp = getClientIp(request.headers);
    const limitCheck = checkRateLimit(`upload:${clientIp}`, 30, 10 * 60 * 1000, 10 * 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Upload rate limit reached. Please wait ${limitCheck.retryAfterSeconds} seconds before uploading more images.`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    const result = await validateAndSaveMenuImage(file);
    if (!result.success) {
      recordFailedAttempt(`upload:${clientIp}`, 30, 10 * 60 * 1000);
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("API upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing the image upload.",
      },
      { status: 500 }
    );
  }
}

