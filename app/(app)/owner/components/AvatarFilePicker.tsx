"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

type AvatarFilePickerProps = {
  label?: string;
  value: string;
  fallbackText: string;
  onChange: (value: string) => void;
  className?: string;
};

const maxSourceSize = 8 * 1024 * 1024;
const avatarSize = 640;

export default function AvatarFilePicker({
  label = "Zdjęcie",
  value,
  fallbackText,
  onChange,
  className,
}: AvatarFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Wybierz plik graficzny.");
      return;
    }

    if (file.size > maxSourceSize) {
      setError("Zdjęcie może mieć maksymalnie 8 MB.");
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);
      const compressedFile = await compressImage(file);
      const avatarUrl = await uploadAvatar(compressedFile);
      onChange(avatarUrl);
    } catch {
      setError("Nie udało się zapisać zdjęcia.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>

      <div className="mt-2 flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface-container-lowest p-3">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-container-low bg-cover bg-center text-xl font-semibold text-primary-light"
          style={value ? { backgroundImage: `url(${value})` } : undefined}
        >
          {value ? null : fallbackText.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-3 text-xs font-semibold text-on-primary transition hover:bg-primary-container disabled:opacity-60"
            >
              <ImagePlus size={15} />
              {isProcessing ? "Przetwarzanie..." : "Wgraj plik"}
            </button>

            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-surface-container-low px-3 text-xs font-semibold text-on-surface transition hover:bg-surface-container-high"
              >
                <Trash2 size={14} />
                Usuń
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-xs leading-5 text-on-surface-muted">
            JPG, PNG lub WEBP. Obraz zostanie zmniejszony przed zapisem.
          </p>
          {error ? (
            <p className="mt-1 text-xs font-semibold text-error">{error}</p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

async function compressImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, avatarSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#111418";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.84);
    });

    if (!blob) {
      throw new Error("Cannot encode image.");
    }

    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads/avatar", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json().catch(() => null)) as {
    url?: string;
    message?: string;
  } | null;

  if (!response.ok || !data?.url) {
    throw new Error(data?.message || "Nie udało się wgrać zdjęcia.");
  }

  return data.url;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot load image."));
    image.src = src;
  });
}
