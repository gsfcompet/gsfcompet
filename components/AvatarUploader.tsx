"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AvatarUploaderProps = {
  userId: string;
  currentAvatarUrl?: string | null;
  currentAvatarPath?: string | null;
  onUploaded: (avatarUrl: string, avatarPath: string) => void;
};

export default function AvatarUploader({
  userId,
  currentAvatarUrl,
  currentAvatarPath,
  onUploaded,
}: AvatarUploaderProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(file: File) {
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setMessage("Merci de choisir une image.");
      return;
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("Image trop lourde. Maximum : 3 Mo.");
      return;
    }

    setUploading(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const avatarPath = `${userId}/avatar-${Date.now()}.${extension}`;

    const uploadResult = await supabase.storage
      .from("avatars")
      .upload(avatarPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadResult.error) {
      setUploading(false);
      setMessage(`Erreur upload : ${uploadResult.error.message}`);
      return;
    }

    const publicUrlResult = supabase.storage
      .from("avatars")
      .getPublicUrl(avatarPath);

    const avatarUrl = publicUrlResult.data.publicUrl;

    const profileResult = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        avatar_path: avatarPath,
      })
      .eq("id", userId);

    if (profileResult.error) {
      setUploading(false);
      setMessage(`Erreur profil : ${profileResult.error.message}`);
      return;
    }

    if (currentAvatarPath && currentAvatarPath !== avatarPath) {
      await supabase.storage.from("avatars").remove([currentAvatarPath]);
    }

    setPreviewUrl(avatarUrl);
    onUploaded(avatarUrl, avatarPath);
    setUploading(false);
    setMessage("Avatar mis à jour ✅");
  }

  return (
    <div className="rounded-2xl border border-[#C39B55]/20 bg-[#0B1B33]/80 p-5 shadow-lg shadow-black/20">
      <h3 className="text-lg font-black text-[#DBC399]">Avatar membre</h3>

      <div className="mt-5 flex items-center gap-5">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-[#C39B55]/60 bg-[#12274A] shadow-lg shadow-black/30">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar membre"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-black text-[#DBC399]">?</span>
          )}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                handleUpload(file);
              }

              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-[#C39B55]/40 bg-[#12274A] px-5 py-2.5 text-sm font-semibold text-[#DBC399] shadow-lg shadow-black/20 transition hover:border-[#C39B55]/70 hover:bg-[#18345E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Envoi en cours..." : "Changer mon avatar"}
          </button>

          <p className="mt-2 text-xs text-[#CFC6AB]">
            PNG, JPG ou WEBP. Maximum 3 Mo.
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-[#C39B55]/20 bg-[#12274A] px-4 py-3 text-sm text-[#DBC399]">
          {message}
        </p>
      )}
    </div>
  );
}