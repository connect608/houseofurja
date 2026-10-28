/**
 * Server-side input validation and sanitization utilities
 */

export interface ValidationResult<T = string> {
  isValid: boolean;
  sanitized?: T;
  error?: string;
}

/**
 * Validates and normalizes category key / tab identifier
 */
export function validateCategoryKey(key: unknown): ValidationResult<string> {
  if (typeof key !== "string") {
    return { isValid: false, error: "Category tab name is required." };
  }

  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Category tab name cannot be empty." };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: "Category tab name cannot exceed 50 characters." };
  }

  // Safe characters: letters, numbers, spaces, apostrophes, ampersands, hyphens
  const safePattern = /^[a-zA-Z0-9\s'&,-]+$/;
  if (!safePattern.test(trimmed)) {
    return {
      isValid: false,
      error: "Category tab name contains invalid characters. Use letters, numbers, and common punctuation.",
    };
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates and sanitizes dish or category heading title
 */
export function validateTitle(title: unknown, fieldName: string = "Title"): ValidationResult<string> {
  if (typeof title !== "string") {
    return { isValid: false, error: `${fieldName} is required.` };
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty.` };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: `${fieldName} cannot exceed 100 characters.` };
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates and sanitizes description text
 */
export function validateDescription(
  description: unknown,
  maxLength: number = 600
): ValidationResult<string> {
  if (typeof description !== "string") {
    return { isValid: false, error: "Description must be text." };
  }

  const trimmed = description.trim();
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `Description cannot exceed ${maxLength} characters.`,
    };
  }

  return { isValid: true, sanitized: trimmed };
}

/**
 * Validates and normalizes price (e.g. "14", "$14", "14.50", "$16.50")
 */
export function validatePrice(price: unknown): ValidationResult<string> {
  if (typeof price !== "string") {
    return { isValid: false, error: "Price is required." };
  }

  const trimmed = price.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Price cannot be empty." };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: "Price string is too long." };
  }

  // Matches formats like "14", "$14", "14.50", "$14.50", "14.00"
  const priceRegex = /^\$?\s*(\d{1,4}(?:\.\d{1,2})?)$/;
  const match = trimmed.match(priceRegex);

  if (!match) {
    return {
      isValid: false,
      error: "Invalid price format. Please enter a valid amount like '$14' or '$16.50'.",
    };
  }

  const numericValue = parseFloat(match[1]);
  if (Number.isNaN(numericValue) || numericValue < 0 || numericValue > 9999) {
    return {
      isValid: false,
      error: "Price must be a valid positive amount under $9,999.",
    };
  }

  // Format cleanly with currency symbol
  const formatted = numericValue % 1 === 0 ? `$${numericValue}` : `$${numericValue.toFixed(2)}`;
  return { isValid: true, sanitized: formatted };
}

/**
 * Validates image path to prevent javascript:, data:, or SSRF URLs
 */
export function validateImageUrl(url: unknown): ValidationResult<string> {
  if (typeof url !== "string") {
    return { isValid: false, error: "Image URL is required." };
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: "Image URL cannot be empty." };
  }

  if (trimmed.length > 500) {
    return { isValid: false, error: "Image URL exceeds maximum length." };
  }

  // Must be a relative path (/assets/... or /uploads/...) or safe HTTPS URL
  const isRelative = trimmed.startsWith("/") && !trimmed.startsWith("//");
  const isHttps = trimmed.startsWith("https://");

  if (!isRelative && !isHttps) {
    return {
      isValid: false,
      error: "Invalid image URL. Must be an internal site path (/assets/..., /uploads/...) or secure HTTPS link.",
    };
  }

  // Explicitly deny dangerous schemes
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return { isValid: false, error: "Dangerous image URL scheme detected." };
  }

  return { isValid: true, sanitized: trimmed };
}
