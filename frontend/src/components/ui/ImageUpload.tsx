"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  folder = "products",
  label,
  className,
}: {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file, folder);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-sm font-medium text-navy-700">{label}</label>}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-navy-200 bg-navy-50">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-navy-500 shadow hover:text-danger-600"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <ImagePlus className="h-6 w-6 text-navy-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50",
              uploading && "cursor-not-allowed opacity-60",
            )}
          >
            {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          <p className="mt-1 text-xs text-navy-400">PNG or JPG, up to 5 MB.</p>
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
