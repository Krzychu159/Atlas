"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type AvatarFilePickerProps = {
  label?: string;
  value: string;
  fallbackText: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<string>;
  onRemove: () => Promise<void>;
  disabled?: boolean;
  className?: string;
};

const maxSourceSize = 8 * 1024 * 1024;
const avatarSize = 640;

export default function AvatarFilePicker({
  label = "Zdjęcie",
  value,
  fallbackText,
  onChange,
  onUpload,
  onRemove,
  disabled = false,
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
      const avatarUrl = await onUpload(compressedFile);
      onChange(avatarUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : "Nie udało się zapisać zdjęcia.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemove() {
    try {
      setError(null);
      setIsProcessing(true);
      await onRemove();
      onChange("");
    } catch (removeError) {
      setError(
        removeError instanceof Error && removeError.message
          ? removeError.message
          : "Nie udało się usunąć zdjęcia.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className={className}>
      <span className="text-label text-on-surface-muted">{label}</span>

      <div className="mt-2 flex flex-col gap-5 rounded-[var(--radius-xl)] border border-white/6 bg-surface-container-low p-4 sm:flex-row sm:items-center sm:p-5">
        <div
          role="img"
          aria-label={
            value ? "Aktualne zdjęcie profilowe" : "Podgląd inicjałów profilu"
          }
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface-container bg-surface-container-lowest bg-cover bg-center text-2xl font-semibold text-primary-light shadow-soft sm:h-28 sm:w-28"
          style={value ? { backgroundImage: `url(${value})` } : undefined}
        >
          {value ? null : fallbackText.slice(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface">Zdjęcie profilowe</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-on-surface-muted">
            JPG, PNG lub WEBP, maksymalnie 8 MB. Zdjęcie zostanie automatycznie
            zmniejszone przed zapisaniem.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isProcessing}
              icon={<ImagePlus size={15} />}
            >
              {isProcessing
                ? "Przetwarzanie..."
                : value
                  ? "Zmień zdjęcie"
                  : "Dodaj zdjęcie"}
            </Button>

            {value ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isProcessing}
                icon={<Trash2 size={14} />}
                className="text-error-light"
              >
                Usuń zdjęcie
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 text-xs font-semibold text-error-light">
              {error}
            </p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot load image."));
    image.src = src;
  });
}
