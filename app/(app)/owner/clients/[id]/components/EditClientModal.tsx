"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Link2, MapPin, Save } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateInput } from "@/app/components/ui/date-input";
import { ModalFooter, ModalHeader, ModalOverlay } from "@/app/components/ui/modal";
import AvatarFilePicker from "../../../components/AvatarFilePicker";
import {
  OwnerTextArea,
  OwnerTextField,
} from "../../../components/OwnerFormControls";
import {
  showOwnerError,
  showOwnerSuccess,
} from "../../../components/owner-toast";
import {
  getClient,
  getClientTrainingPlan,
  updateClient,
  updateClientTrainingPlan,
  type Client,
  type ClientTrainingPlan,
  type UpdateClientTrainingPlanPayload,
  type UpdateClientPayload,
} from "@/app/lib/owner/clients";
import { isForbiddenError } from "@/app/lib/backend";
import {
  deleteClientAvatar,
  deleteTrainerClientAvatar,
  uploadClientAvatar,
  uploadTrainerClientAvatar,
} from "@/app/lib/avatars";
import {
  dateInputToIsoDateTime,
  toDateInputValue,
} from "@/app/lib/formatters/date";
import { getLocations, type Location } from "@/app/lib/owner/locations";
import { getTrainers, type Trainer } from "@/app/lib/owner/trainers";
import {
  getTrainerPortalClient,
  getTrainerPortalClientTrainingPlan,
  getTrainerPortalMe,
  updateTrainerPortalClient,
  updateTrainerPortalClientTrainingPlan,
  type TrainerPortalMe,
} from "@/app/lib/trainer/portal";
import {
  trainerPortalClientToClient,
  trainerPortalMeToLocations,
  trainerPortalMeToTrainer,
} from "@/app/lib/trainer/portal-mappers";

type EditClientModalProps = {
  open: boolean;
  client: Client | null;
  access?: "owner" | "trainer";
  trainerMe?: TrainerPortalMe | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
  onAvatarChanged?: (avatarUrl: string) => void;
  onTrainingPlanSaved?: (plan: ClientTrainingPlan) => void;
};

export default function EditClientModal({
  open,
  client,
  access = "owner",
  trainerMe,
  onClose,
  onSaved,
  onAvatarChanged,
  onTrainingPlanSaved,
}: EditClientModalProps) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [goal, setGoal] = useState("");
  const [trainingStartDate, setTrainingStartDate] = useState("");
  const [trainingPlan, setTrainingPlan] = useState<ClientTrainingPlan | null>(
    null,
  );
  const [trainingPlanUrl, setTrainingPlanUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      getTrainersForEditModal(access, trainerMe),
      getLocationsForEditModal(access, trainerMe),
    ])
      .then(([trainersData, locationsData]) => {
        setTrainers(trainersData);
        setLocations(locationsData);
      })
      .catch(() => {
        setTrainers([]);
        setLocations([]);
      });
  }, [access, open, trainerMe]);

  useEffect(() => {
    if (!client || !open) return;

    void Promise.resolve().then(() => {
      setFirstName(client.firstName || "");
      setLastName(client.lastName || "");
      setEmail(client.email || "");
      setPhoneNumber(client.phoneNumber || "");
      setAvatarUrl(client.avatarUrl || "");
      setTrainerId(client.trainerId ? String(client.trainerId) : "");
      setLocationId(resolveClientLocationId(client, locations));
      setGoal(client.goal || "");
      setTrainingStartDate(toDateInputValue(client.trainingStartDate));
    });
  }, [client, locations, open]);

  useEffect(() => {
    if (!client || !open) return;

    getTrainingPlanForEditModal(client.id, access)
      .then((plan) => {
        setTrainingPlan(plan);
        setTrainingPlanUrl(plan.url || plan.googleDriveFolderUrl || "");
      })
      .catch(() => {
        setTrainingPlan(null);
        setTrainingPlanUrl("");
      });
  }, [access, client, open]);

  if (!open || !client) return null;
  const clientId = client.id;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client) return;

    const resolvedLocationId = Number(locationId);

    if (!resolvedLocationId) {
      showOwnerError(new Error("Wybierz lokalizację klienta."), "", {
        id: "owner-client-location-required",
      });
      return;
    }

    const payload: UpdateClientPayload = {
      trainerId: trainerId ? Number(trainerId) : null,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
      goal: goal.trim() || null,
      locationId: resolvedLocationId,
      progressPercent: client.progressPercent ?? 0,
      billingStatus: client.billingStatus || null,
      status: client.status || null,
      trainingStartDate: dateInputToIsoDateTime(trainingStartDate),
      nextSessionAt: client.nextSessionAt || null,
    };
    const cleanTrainingPlanUrl = trainingPlanUrl.trim();
    const originalTrainingPlanUrl = normalizeText(
      trainingPlan?.url || trainingPlan?.googleDriveFolderUrl,
    );
    const shouldSaveTrainingPlan =
      cleanTrainingPlanUrl !== originalTrainingPlanUrl;

    if (cleanTrainingPlanUrl && !isValidUrl(cleanTrainingPlanUrl)) {
      showOwnerError(new Error("Wklej poprawny link do pliku klienta."), "", {
        id: "owner-client-training-plan-url-invalid",
      });
      return;
    }

    try {
      setIsSaving(true);
      await updateClientForEditModal(client.id, payload, access);
      const confirmedClient = await getConfirmedClientForEditModal(
        client.id,
        access,
        trainerMe,
      );
      const failedFields = getClientUpdateFailedFields(confirmedClient, payload);

      if (failedFields.length) {
        throw new Error(
          `Backend zwrócił sukces, ale nie zapisał pól: ${failedFields.join(", ")}.`,
        );
      }

      if (shouldSaveTrainingPlan) {
        const driveMeta = parseGoogleDriveLink(cleanTrainingPlanUrl);
        const savedPlan = await updateTrainingPlanForEditModal(
          client.id,
          {
          googleDriveFolderId:
            driveMeta.folderId || trainingPlan?.googleDriveFolderId || "",
          fileId: driveMeta.fileId || trainingPlan?.fileId || "",
          fileName: cleanTrainingPlanUrl ? "Folder klienta" : "",
          url: cleanTrainingPlanUrl,
          },
          access,
        );
        const normalizedPlan = {
          ...savedPlan,
          fileName: savedPlan.fileName || "Folder klienta",
          url: savedPlan.url || cleanTrainingPlanUrl,
        };

        setTrainingPlan(normalizedPlan);
        setTrainingPlanUrl(
          normalizedPlan.url || normalizedPlan.googleDriveFolderUrl || "",
        );
        onTrainingPlanSaved?.(normalizedPlan);
      }

      onSaved(confirmedClient);
      showOwnerSuccess("Dane klienta zostały zaktualizowane.", {
        id: "owner-client-edit-success",
      });
      onClose();
    } catch (err) {
      showOwnerError(err, "Nie udało się zaktualizować klienta.", {
        id: "owner-client-edit-error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const trainerOptions = [
    { value: "", label: "Brak przypisania" },
    ...trainers.map((trainer) => ({
      value: String(trainer.id),
      label: trainer.fullName || `${trainer.firstName} ${trainer.lastName}`,
    })),
  ];
  const locationOptions = locations.length
    ? locations.map((location) => ({
        value: String(location.id),
        label: formatLocationLabel(location),
      }))
    : [
        {
          value: locationId,
          label: client.locationName || "Brak lokalizacji",
        },
      ];
  const avatarFallback = `${firstName[0] || ""}${lastName[0] || ""}` || "K";

  async function handleAvatarUpload(file: File) {
    const uploadedUrl =
      access === "trainer"
        ? await uploadTrainerClientAvatar(clientId, file)
        : await uploadClientAvatar(clientId, file);
    onAvatarChanged?.(uploadedUrl);
    showOwnerSuccess("Avatar klienta został zmieniony.", {
      id: "client-avatar-upload-success",
    });
    return uploadedUrl;
  }

  async function handleAvatarRemove() {
    if (access === "trainer") {
      await deleteTrainerClientAvatar(clientId);
    } else {
      await deleteClientAvatar(clientId);
    }
    onAvatarChanged?.("");
    showOwnerSuccess("Avatar klienta został usunięty.", {
      id: "client-avatar-delete-success",
    });
  }

  return (
    <ModalOverlay onClose={onClose} className="px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-full w-full max-w-[820px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-white/8 bg-surface-container shadow-ambient"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
        <ModalHeader eyebrow="Edycja" title="Dane klienta" onClose={onClose} />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OwnerTextField
            label="Imię"
            value={firstName}
            onChange={setFirstName}
          />
          <OwnerTextField
            label="Nazwisko"
            value={lastName}
            onChange={setLastName}
          />
          <OwnerTextField label="E-mail" value={email} onChange={setEmail} />
          <OwnerTextField
            label="Telefon"
            value={phoneNumber}
            onChange={setPhoneNumber}
          />
          <AvatarFilePicker
            label="Zdjęcie klienta"
            value={avatarUrl}
            onChange={setAvatarUrl}
            onUpload={handleAvatarUpload}
            onRemove={handleAvatarRemove}
            fallbackText={avatarFallback}
            className="md:col-span-2"
          />

          <div>
            <span className="text-label text-on-surface-muted">Trener</span>
            <CustomSelect
              value={trainerId}
              onChange={setTrainerId}
              className="mt-2"
              options={trainerOptions}
            />
          </div>

          <div>
            <span className="text-label text-on-surface-muted">
              Lokalizacja
            </span>
            <CustomSelect
              value={locationId}
              onChange={setLocationId}
              icon={<MapPin size={16} />}
              className="mt-2"
              options={locationOptions}
            />
          </div>

          <DateInput
            label="Data rozpoczęcia treningów"
            value={trainingStartDate}
            onChange={setTrainingStartDate}
          />

          <OwnerTextArea
            label="Cel"
            value={goal}
            onChange={setGoal}
            rows={2}
            className="md:col-span-2"
          />

          <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-3 md:col-span-2">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-lg)] bg-primary/15 text-primary-light">
                <Link2 size={18} />
              </div>
              <p className="font-semibold text-on-surface">Pliki</p>
            </div>

            <OwnerTextField
              label="Link do folderu"
              value={trainingPlanUrl}
              onChange={setTrainingPlanUrl}
              placeholder="https://drive.google.com/drive/folders/..."
            />
          </div>
        </div>

        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            icon={<Save size={16} />}
          >
            {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </ModalFooter>
      </form>
    </ModalOverlay>
  );
}

function formatLocationLabel(location: Location) {
  return location.name || location.city || `Lokalizacja ${location.id}`;
}

async function getTrainersForEditModal(
  access: "owner" | "trainer",
  trainerMe?: TrainerPortalMe | null,
) {
  try {
    return await getTrainers();
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    const me = trainerMe || (await getTrainerPortalMe().catch(() => null));
    const trainer = trainerPortalMeToTrainer(me);

    return trainer ? [trainer] : [];
  }
}

async function getLocationsForEditModal(
  access: "owner" | "trainer",
  trainerMe?: TrainerPortalMe | null,
) {
  try {
    return await getLocations();
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    const me = trainerMe || (await getTrainerPortalMe().catch(() => null));

    return trainerPortalMeToLocations(me);
  }
}

async function getTrainingPlanForEditModal(
  clientId: number,
  access: "owner" | "trainer",
) {
  try {
    return await getClientTrainingPlan(clientId);
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    return getTrainerPortalClientTrainingPlan(clientId);
  }
}

async function updateClientForEditModal(
  clientId: number,
  payload: UpdateClientPayload,
  access: "owner" | "trainer",
) {
  try {
    return await updateClient(clientId, payload);
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    return updateTrainerPortalClient(clientId, payload);
  }
}

async function getConfirmedClientForEditModal(
  clientId: number,
  access: "owner" | "trainer",
  trainerMe?: TrainerPortalMe | null,
) {
  try {
    return await getClient(clientId);
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    const [clientData, me] = await Promise.all([
      getTrainerPortalClient(clientId),
      trainerMe ? Promise.resolve(trainerMe) : getTrainerPortalMe().catch(() => null),
    ]);

    return trainerPortalClientToClient(clientData, me);
  }
}

async function updateTrainingPlanForEditModal(
  clientId: number,
  payload: UpdateClientTrainingPlanPayload,
  access: "owner" | "trainer",
) {
  try {
    return await updateClientTrainingPlan(clientId, payload);
  } catch (err) {
    if (access !== "trainer" || !isForbiddenError(err)) throw err;

    return updateTrainerPortalClientTrainingPlan(clientId, payload);
  }
}

function normalizeLocationName(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function resolveClientLocationId(client: Client, locations: Location[]) {
  if (client.locationId) return String(client.locationId);

  const clientLocationName = normalizeLocationName(client.locationName);
  const matchedLocation = locations.find((location) =>
    [location.name, location.city]
      .map(normalizeLocationName)
      .filter(Boolean)
      .includes(clientLocationName),
  );

  return matchedLocation ? String(matchedLocation.id) : "";
}

function normalizeText(value?: string | null) {
  return (value || "").trim();
}

function isSameOptionalText(
  actual?: string | null,
  expected?: string | null,
) {
  return normalizeText(actual) === normalizeText(expected);
}

function parseGoogleDriveLink(value: string) {
  const parsedUrl = parseUrl(value);

  if (!parsedUrl) {
    return { fileId: "", folderId: "" };
  }

  const folderMatch = parsedUrl.pathname.match(/\/folders\/([^/?]+)/);
  const fileMatch =
    parsedUrl.pathname.match(/\/d\/([^/?]+)/) ||
    parsedUrl.pathname.match(/\/file\/d\/([^/?]+)/);

  return {
    fileId: parsedUrl.searchParams.get("id") || fileMatch?.[1] || "",
    folderId: folderMatch?.[1] || "",
  };
}

function parseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isValidUrl(value: string) {
  const parsedUrl = parseUrl(value);

  return Boolean(
    parsedUrl?.protocol === "http:" || parsedUrl?.protocol === "https:",
  );
}

function getClientUpdateFailedFields(
  client: Client,
  payload: UpdateClientPayload,
) {
  const failedFields: string[] = [];

  if (client.trainerId !== payload.trainerId) failedFields.push("trener");
  if (client.locationId !== payload.locationId) failedFields.push("lokalizacja");
  if (!isSameOptionalText(client.firstName, payload.firstName)) {
    failedFields.push("imię");
  }
  if (!isSameOptionalText(client.lastName, payload.lastName)) {
    failedFields.push("nazwisko");
  }
  if (!isSameOptionalText(client.email, payload.email)) {
    failedFields.push("e-mail");
  }
  if (!isSameOptionalText(client.phoneNumber, payload.phoneNumber)) {
    failedFields.push("telefon");
  }
  if (!isSameOptionalText(client.goal, payload.goal)) failedFields.push("cel");
  if (
    toDateInputValue(client.trainingStartDate) !==
    toDateInputValue(payload.trainingStartDate)
  ) {
    failedFields.push("data rozpoczęcia treningów");
  }

  return failedFields;
}
