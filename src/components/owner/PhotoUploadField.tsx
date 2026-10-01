"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  ownerPhotoFolder,
} from "@/lib/photos";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads a photo straight from the browser to Supabase Storage under the
 * owner's own folder (owners/<uid>/, the only place the storage policies
 * let an owner write), and puts the resulting public URL in a hidden input
 * for the surrounding form. Going direct avoids Next's 1 MB server-action
 * body limit; the server re-checks the URL is in the owner's folder.
 *
 * Replaced photos aren't deleted from storage: the old file may still be
 * what the saved listing points at if the form is never submitted.
 */
export function PhotoUploadField({
  name,
  label,
  ownerId,
  defaultUrl,
  disabled,
  onUploadingChange,
}: {
  name: string;
  label: string;
  ownerId: string;
  defaultUrl?: string | null;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Photos must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setBusy(true);

    const supabase = createClient();
    const path = `${ownerPhotoFolder(ownerId)}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });

    setBusy(false);

    if (uploadError) {
      setError("Upload failed. Please try again.");
      return;
    }

    setUrl(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="space-y-2 text-sm">
      <span className="block font-medium text-slate-700">{label}</span>
      <input type="hidden" name={name} value={url} />

      {url ? (
        // Plain <img>: a small owner-only preview, and next/image would need
        // every environment's Supabase host in images.remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-32 w-48 rounded-2xl border border-slate-200 object-cover"
        />
      ) : null}

      <div className="flex items-center gap-3">
        <label
          className={`inline-flex cursor-pointer items-center rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-400 ${
            disabled || uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept={ALLOWED_PHOTO_TYPES.join(",")}
            onChange={handleFile}
            disabled={disabled || uploading}
            className="sr-only"
          />
        </label>
        {url && !disabled ? (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="font-medium text-slate-500 transition hover:text-slate-900"
          >
            Remove
          </button>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">JPEG, PNG or WebP, up to 5 MB.</p>
      {error ? <p className="text-rose-600">{error}</p> : null}
    </div>
  );
}
