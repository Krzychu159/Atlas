"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Save, User } from "lucide-react";
import AvatarFilePicker from "@/app/components/ui/avatar-file-picker";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import { showAppError, showAppSuccess } from "@/app/components/ui/app-toast";
import {
  deleteCurrentUserAvatar,
  uploadCurrentUserAvatar,
} from "@/app/lib/avatars";
import {
  getCurrentUser,
  updateCurrentUserProfile,
} from "@/app/lib/auth/current-user";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
};

const emptyProfile: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  avatarUrl: "",
};

export default function ProfileSettingsCard({
  fallbackLabel,
}: {
  fallbackLabel: string;
}) {
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getCurrentUser()
        .then((user) => {
          const names = getUserNames(user);
          setProfile({
            firstName: names.firstName,
            lastName: names.lastName,
            email: user.email === "Brak e-maila" ? "" : user.email,
            avatarUrl: user.avatarUrl || "",
          });
        })
        .catch((error: unknown) => {
          showAppError(error, "Nie udało się pobrać profilu.", {
            id: "profile-settings-load-error",
          });
        })
        .finally(() => setIsLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const email = profile.email.trim();

    if (!firstName || !lastName || !email) {
      showAppError(
        new Error("Uzupełnij imię, nazwisko i adres e-mail."),
        "Uzupełnij wymagane pola.",
        { id: "profile-settings-required" },
      );
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateCurrentUserProfile({
        firstName,
        lastName,
        email,
      });
      const names = getUserNames(updated);
      setProfile((current) => ({
        ...current,
        firstName: names.firstName,
        lastName: names.lastName,
        email: updated.email,
        avatarUrl: updated.avatarUrl || current.avatarUrl,
      }));
      showAppSuccess("Dane profilu zostały zapisane.", {
        id: "profile-settings-save-success",
      });
    } catch (error) {
      showAppError(error, "Nie udało się zapisać profilu.", {
        id: "profile-settings-save-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    const avatarUrl = await uploadCurrentUserAvatar(file);
    showAppSuccess("Avatar został zmieniony.", {
      id: "profile-avatar-upload-success",
    });
    return avatarUrl;
  }

  async function handleAvatarRemove() {
    await deleteCurrentUserAvatar();
    showAppSuccess("Avatar został usunięty.", {
      id: "profile-avatar-delete-success",
    });
  }

  const initials = getInitials(profile.firstName, profile.lastName);

  return (
    <section className="card-shell p-5 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-primary-light">
          <User size={18} />
        </div>
        <p className="text-section-title">Ustawienia profilu</p>
      </div>

      <form onSubmit={handleSave} className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <AvatarFilePicker
            value={profile.avatarUrl}
            fallbackText={initials || fallbackLabel}
            onChange={(avatarUrl) =>
              setProfile((current) => ({ ...current, avatarUrl }))
            }
            onUpload={handleAvatarUpload}
            onRemove={handleAvatarRemove}
            disabled={isLoading}
          />

          <div className="grid content-start gap-4 md:grid-cols-2">
            <TextField
              label="Imię"
              value={profile.firstName}
              onChange={(firstName) =>
                setProfile((current) => ({ ...current, firstName }))
              }
              autoComplete="given-name"
              disabled={isLoading}
            />
            <TextField
              label="Nazwisko"
              value={profile.lastName}
              onChange={(lastName) =>
                setProfile((current) => ({ ...current, lastName }))
              }
              autoComplete="family-name"
              disabled={isLoading}
            />
            <TextField
              label="E-mail"
              value={profile.email}
              onChange={(email) =>
                setProfile((current) => ({ ...current, email }))
              }
              type="email"
              autoComplete="email"
              disabled={isLoading}
              className="md:col-span-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-white/5 pt-5">
          <Button
            type="submit"
            icon={<Save size={16} />}
            disabled={isLoading || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany w profilu"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function getUserNames(user: {
  firstName: string;
  lastName: string;
  fullName: string;
}) {
  if (user.firstName || user.lastName) {
    return { firstName: user.firstName, lastName: user.lastName };
  }

  const parts = user.fullName.trim().split(" ").filter(Boolean);
  return {
    firstName: parts.shift() || "",
    lastName: parts.join(" "),
  };
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}
