"use client";

import { useState, useRef } from "react";
import type { GalleryImageItem } from "@/app/api/gallery/route";

interface CategoryImageUploaderProps {
  currentImageUrl: string;
  currentImageAlt: string;
  onImageChange: (url: string, alt: string) => void;
  disabled?: boolean;
  variant?: "featured" | "compact";
}

export default function CategoryImageUploader({
  currentImageUrl,
  currentImageAlt,
  onImageChange,
  disabled = false,
  variant = "compact",
}: CategoryImageUploaderProps) {
  const selectedUrl = currentImageUrl || "/assets/menu-chai.webp";
  const altText = currentImageAlt || "";

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Gallery Modal State
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState<"all" | "menu" | "uploads" | "general">("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images from /api/gallery when modal opens
  const handleOpenGallery = async () => {
    setShowGallery(true);
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (res.ok && data.success) {
        setGalleryImages(data.images || []);
      } else {
        setGalleryError(data.error || "Failed to load gallery images.");
      }
    } catch (err) {
      console.error("Gallery fetch error:", err);
      setGalleryError("Network error while loading image gallery.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleSelectFromGallery = (image: GalleryImageItem) => {
    const newAlt = altText || image.name;
    setUploadError(null);
    onImageChange(image.url, newAlt);
    setShowGallery(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Max size validation: 10 MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 10 MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. MIME type check
    const validTypes = ["image/webp", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a WebP, JPG, or PNG image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Upload via dedicated API endpoint
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.url) {
        const defaultAlt =
          altText || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        onImageChange(data.url, defaultAlt);
        setUploadError(null);
      } else {
        setUploadError(data.error || `Upload failed (Status ${response.status})`);
      }
    } catch (err: unknown) {
      console.error("Upload network error:", err);
      setUploadError("Network error while uploading image. Please check your connection.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filtered gallery images
  const filteredGallery = galleryImages.filter((img) => {
    if (galleryFilter !== "all" && img.category !== galleryFilter) return false;
    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase();
      return img.name.toLowerCase().includes(q) || img.filename.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* VARIANT 1: FEATURED (Clean, focused view for left-column Visual Editor)  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {variant === "featured" ? (
        <div className="space-y-3.5">
          {/* Main Portrait Preview */}
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#2e1c18]/5 border border-[#2e1c18]/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedUrl}
              alt={altText || "Category visual preview"}
              className="h-full w-full object-cover object-center"
            />

            <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Preview
            </div>

            {isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white text-xs font-semibold p-3 text-center backdrop-blur-xs">
                <span className="inline-block animate-spin text-xl mb-1.5">⟳</span>
                Uploading image...
              </div>
            )}
          </div>

          {/* Action Buttons: Choose from Gallery or Upload */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={handleOpenGallery}
              className="flex items-center justify-center gap-1.5 border border-[#2e1c18]/30 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#2e1c18] hover:bg-gray-100 transition shadow-xs disabled:opacity-50"
            >
              <span>🖼️</span> Gallery
            </button>

            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 bg-[#df8b32] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c97924] transition shadow-xs disabled:opacity-50"
            >
              <span>↑</span> Upload
            </button>
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
              ✕ {uploadError}
            </div>
          )}

          {/* Alt Text Input */}
          <div>
            <label className="block text-[11px] font-semibold text-[#2e1c18]/70 mb-1">
              Image Description (Alt Text)
            </label>
            <input
              type="text"
              value={altText}
              disabled={disabled || isUploading}
              onChange={(e) => onImageChange(selectedUrl, e.target.value)}
              placeholder="e.g. Fragrant house-brewed masala chai"
              className="w-full border border-[#2e1c18]/20 bg-white px-3 py-2 text-xs text-[#2e1c18] placeholder-[#2e1c18]/40 focus:border-[#df8b32] focus:outline-none"
            />
          </div>

          {/* Image Guidelines Block */}
          <div className="border-l-4 border-l-[#df8b32] border border-[#2e1c18]/15 bg-[#fbf9f5] p-3.5 text-xs text-[#2e1c18] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#2e1c18]/10 pb-1.5">
              <span className="font-bold text-[#df8b32] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span>📐</span> Image Upload Guidelines
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2e1c18]/5 text-[#2e1c18]/70 px-2 py-0.5">
                3:4 Portrait
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/80 p-2.5 border border-[#2e1c18]/10">
                <span className="text-[#2e1c18]/50 block text-[10px] uppercase font-bold tracking-wider">
                  Recommended Dimensions
                </span>
                <span className="font-serif text-sm font-bold text-[#2e1c18] block mt-0.5">
                  1200 × 1600 px
                </span>
                <span className="text-[10px] text-[#2e1c18]/60 block mt-0.5">
                  3:4 ratio portrait (mirrors public menu split-screen)
                </span>
              </div>
              <div className="bg-white/80 p-2.5 border border-[#2e1c18]/10">
                <span className="text-[#2e1c18]/50 block text-[10px] uppercase font-bold tracking-wider">
                  Maximum File Size
                </span>
                <span className="font-serif text-sm font-bold text-[#2e1c18] block mt-0.5">
                  10 MB Max
                </span>
                <span className="text-[10px] text-[#2e1c18]/60 block mt-0.5">
                  Formats: WebP (best), JPG, or PNG
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[#2e1c18]/65 italic leading-tight">
              Tip: Sharp portrait photos look best on both mobile phones and desktop split-screen views.
            </p>
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────────────────── */
        /* VARIANT 2: COMPACT (Used inside modals like "Add New Category")          */
        /* ──────────────────────────────────────────────────────────────────────── */
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#2e1c18]/70">
            Category Visual Image
          </label>
          <div className="flex gap-4 items-start">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden bg-[#2e1c18]/5 border border-[#2e1c18]/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedUrl}
                alt={altText || "Category visual preview"}
                className="h-full w-full object-cover object-center"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-[10px] font-semibold p-1 text-center">
                  Uploading...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={handleOpenGallery}
                  className="inline-flex items-center gap-1.5 border border-[#2e1c18]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#2e1c18] hover:bg-gray-100 transition shadow-xs disabled:opacity-50"
                >
                  <span>🖼️</span> Select from Gallery
                </button>
                <button
                  type="button"
                  disabled={disabled || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-[#df8b32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#c97924] transition shadow-xs disabled:opacity-50"
                >
                  <span>↑</span> Upload
                </button>
              </div>

              <input
                type="text"
                value={altText}
                disabled={disabled || isUploading}
                onChange={(e) => onImageChange(selectedUrl, e.target.value)}
                placeholder="Image description (alt text)..."
                className="w-full border border-[#2e1c18]/20 bg-white px-2.5 py-1.5 text-xs text-[#2e1c18] placeholder-[#2e1c18]/40 focus:border-[#df8b32] focus:outline-none"
              />

              <div className="border border-[#2e1c18]/15 bg-[#2e1c18]/5 p-2 text-[11px] text-[#2e1c18]/80 flex flex-wrap items-center justify-between gap-1.5">
                <span>📐 <strong>Recommended:</strong> 1200×1600 px (3:4)</span>
                <span>📦 <strong>Max:</strong> 10 MB (WebP, JPG, PNG)</span>
              </div>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 px-2 py-1 text-[11px] text-red-700">
                  ✕ {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png,image/jpg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* IMAGE GALLERY MODAL (Clean, clutter-free photo picker)                  */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white p-5 sm:p-6 border border-[#2e1c18]/25 shadow-2xl my-6 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2e1c18]/15 pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-serif text-[#2e1c18]">Choose Image from Gallery</h3>
                <p className="text-xs text-[#2e1c18]/70 mt-0.5">
                  Click any photo below to set as category visual. Standard: <strong className="text-[#2e1c18]">1200 × 1600 px (3:4)</strong> • Max: <strong className="text-[#2e1c18]">10 MB</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGallery(false)}
                className="border border-[#2e1c18]/20 bg-white px-2.5 py-1 text-xs text-[#2e1c18]/70 hover:bg-gray-100 transition"
              >
                ✕ Close
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="py-3 border-b border-[#2e1c18]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "menu", label: "Menu Visuals" },
                    { key: "uploads", label: "Uploaded" },
                    { key: "general", label: "Site Assets" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setGalleryFilter(f.key)}
                    className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition border ${
                      galleryFilter === f.key
                        ? "border-[#2e1c18] bg-[#2e1c18] text-[#f7f4ee]"
                        : "border-transparent bg-gray-100 text-[#2e1c18]/70 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-56">
                <input
                  type="text"
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full border border-[#2e1c18]/20 bg-white px-2.5 py-1.5 text-xs text-[#2e1c18] placeholder-[#2e1c18]/40 focus:border-[#df8b32] focus:outline-none"
                />
              </div>
            </div>

            {/* Gallery Image Grid */}
            <div className="flex-1 overflow-y-auto py-3">
              {galleryLoading ? (
                <div className="py-16 text-center text-xs text-[#2e1c18]/70">
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Loading images...
                </div>
              ) : galleryError ? (
                <div className="py-8 text-center text-xs text-red-700 bg-red-50 p-3 border border-red-200">
                  ✕ {galleryError}
                </div>
              ) : filteredGallery.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#2e1c18]/60">
                  No images match your search.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredGallery.map((img) => {
                    const isCurrent = selectedUrl === img.url;

                    return (
                      <div
                        key={img.url}
                        onClick={() => handleSelectFromGallery(img)}
                        className={`group relative cursor-pointer border p-1.5 transition flex flex-col justify-between ${
                          isCurrent
                            ? "border-[#df8b32] bg-[#df8b32]/10 ring-2 ring-[#df8b32]"
                            : "border-[#2e1c18]/15 bg-white hover:border-[#df8b32] hover:shadow-xs"
                        }`}
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.name}
                            loading="lazy"
                            className="h-full w-full object-cover object-center group-hover:scale-102 transition duration-150"
                          />

                          {isCurrent && (
                            <div className="absolute top-1.5 right-1.5 bg-[#df8b32] text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              ✓ Active
                            </div>
                          )}

                          <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1 py-0.5 text-[9px] font-mono">
                            {img.sizeKb} KB
                          </div>
                        </div>

                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-xs font-semibold text-[#2e1c18] capitalize truncate">
                            {img.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectFromGallery(img);
                            }}
                            className={`w-full py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                              isCurrent
                                ? "bg-[#df8b32] text-white"
                                : "bg-[#2e1c18]/5 text-[#2e1c18] group-hover:bg-[#2e1c18] group-hover:text-white"
                            }`}
                          >
                            {isCurrent ? "Active" : "Select"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#2e1c18]/15 pt-2.5 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#2e1c18]/60">
                {filteredGallery.length} image{filteredGallery.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setShowGallery(false)}
                className="border border-[#2e1c18]/25 bg-white px-3 py-1 text-xs font-medium text-[#2e1c18] hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
