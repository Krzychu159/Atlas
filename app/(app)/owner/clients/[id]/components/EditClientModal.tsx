"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, Link2, MapPin, Save } from "lucide-react";

import { isNotFoundError } from "@/app/lib/backend";
import { safeExternalUrl } from "@/app/lib/safe-url";

import { Button } from "@/app/components/ui/button";
import { CustomSelect } from "@/app/components/ui/custom-select";
import { DateInput } from "@/app/components/ui/date-input";
import {
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@/app/components/ui/modal";

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
  groupLocationNames?: string[];
  groupLocationsAvailable?: boolean;
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
  groupLocationNames = [],
  groupLocationsAvailable = true,
}: EditClientModalProps) {
  const saveLock = useRef(false);
  const lifecycle = useRef(0);
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

  const [trainingPlan, setTrainingPlan] =
    useState<ClientTrainingPlan | null>(null);

  const [trainingPlanUrl, setTrainingPlanUrl] = useState("");
  const [planReady, setPlanReady] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.all([getTrainersForEditModal(access, trainerMe), getLocationsForEditModal(access, trainerMe)])
      .then(([trainersData, locationsData]) => {
        if (!active) return;
        setTrainers(trainersData); setLocations(locationsData);
      }).catch(() => { if (active) { setTrainers([]); setLocations([]); } });
    return () => { active = false; };
  }, [access, open, trainerMe]);

  const currentClientId = client?.id;
  useEffect(() => {
    const revision = ++lifecycle.current;
    if (!client || !open) return;
    const current = client;
    void Promise.resolve().then(() => {
      if (revision !== lifecycle.current) return;
      setFirstName(current.firstName || ""); setLastName(current.lastName || "");
      setEmail(current.email || ""); setPhoneNumber(current.phoneNumber || "");
      setAvatarUrl(current.avatarUrl || ""); setTrainerId(current.trainerId ? String(current.trainerId) : "");
      setLocationId(current.locationId ? String(current.locationId) : resolveClientLocationId(current, locations));
      setGoal(current.goal || ""); setTrainingStartDate(toDateInputValue(current.trainingStartDate));
    });
    return () => { lifecycle.current += 1; };
    // A new client object (e.g. after avatar upload) must not overwrite the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClientId, open]);

  useEffect(() => {
    if (!client || !open) return;
    setLocationId(value => value || resolveClientLocationId(client, locations));
  }, [client, locations, open]);

  useEffect(() => {
    if (!currentClientId || !open) return;
    let active = true;
    const controller = new AbortController();
    setTrainingPlan(null); setTrainingPlanUrl(""); setPlanReady(false); setPlanError(null);
    getTrainingPlanForEditModal(currentClientId, access, controller.signal)
      .then(plan => { if (active) { setTrainingPlan(plan); setTrainingPlanUrl(plan.url || plan.googleDriveFolderUrl || ""); setPlanReady(true); } })
      .catch(error => { if (active) { setTrainingPlan(null); setTrainingPlanUrl(""); if (isNotFoundError(error)) setPlanReady(true); else setPlanError("Nie udało się pobrać linku do plików. Zamknij edycję i spróbuj ponownie."); } });
    return () => { active = false; controller.abort(); };
  }, [access, currentClientId, open]);

  if (!open || !client) return null;

  const currentClient = client;
  const clientId = currentClient.id;
  const hasUserAccount = typeof currentClient.userId === "number";

  const trainerOptions = [
    {
      value: "",
      label: "Brak przypisania",
    },
    ...trainers.map((trainer) => ({
      value: String(trainer.id),
      label:
        trainer.fullName ||
        `${trainer.firstName} ${trainer.lastName}`.trim(),
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
          label: currentClient.locationName || "Brak lokalizacji",
        },
      ];

  const avatarFallback =
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "K";
  const selectedTrainer = trainers.find(
    (trainer) => String(trainer.id) === trainerId,
  );
  const trainerChanged =
    (currentClient.trainerId ? String(currentClient.trainerId) : "") !==
    trainerId;
  const selectedLocationId = Number(locationId);
  const trainerLocationMismatch = Boolean(
    selectedTrainer &&
      selectedLocationId &&
      selectedTrainer.locationIds.length > 0 &&
      !selectedTrainer.locationIds.includes(selectedLocationId),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current || !planReady) return;
    const revision = lifecycle.current;

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
      notes: currentClient.notes || null,
      locationId: resolvedLocationId,
      progressPercent: access === "trainer" ? undefined : currentClient.progressPercent ?? 0,
      billingStatus: currentClient.billingStatus || (access === "trainer" ? undefined : null),
      status: currentClient.status || (access === "trainer" ? undefined : null),
      trainingStartDate: dateInputToIsoDateTime(trainingStartDate),
      nextSessionAt: currentClient.nextSessionAt || null,
    };

    const cleanTrainingPlanUrl = trainingPlanUrl.trim();

    const originalTrainingPlanUrl = normalizeText(
      trainingPlan?.url || trainingPlan?.googleDriveFolderUrl,
    );

    const shouldSaveTrainingPlan =
      cleanTrainingPlanUrl !== originalTrainingPlanUrl;

    if (cleanTrainingPlanUrl && !isValidUrl(cleanTrainingPlanUrl)) {
      showOwnerError(
        new Error("Wklej poprawny link do pliku klienta."),
        "",
        {
          id: "owner-client-training-plan-url-invalid",
        },
      );

      return;
    }

    saveLock.current = true;
    try {
      setIsSaving(true);

      await updateClientForEditModal(clientId, payload, access);

      const confirmedClient = await getConfirmedClientForEditModal(
        clientId,
        access,
        trainerMe,
      );

      if (revision !== lifecycle.current) return;
      const failedFields = getClientUpdateFailedFields(
        confirmedClient,
        payload,
      );

      if (failedFields.length) {
        throw new Error(
          `Nie udało się zapisać części danych: ${failedFields.join(", ")}. Sprawdź je i spróbuj ponownie.`,
        );
      }

      if (shouldSaveTrainingPlan) {
        const driveMeta = parseGoogleDriveLink(cleanTrainingPlanUrl);

        const savedPlan = await updateTrainingPlanForEditModal(
          clientId,
          {
            googleDriveFolderId:
              driveMeta.folderId ||
              trainingPlan?.googleDriveFolderId ||
              "",
            fileId:
              driveMeta.fileId ||
              trainingPlan?.fileId ||
              "",
            fileName: cleanTrainingPlanUrl ? "Folder klienta" : "",
            url: cleanTrainingPlanUrl,
          },
          access,
        );

        if (revision !== lifecycle.current) return;
        const normalizedPlan: ClientTrainingPlan = {
          ...savedPlan,
          fileName: savedPlan.fileName || "Folder klienta",
          url: savedPlan.url || cleanTrainingPlanUrl,
        };

        setTrainingPlan(normalizedPlan);
        setTrainingPlanUrl(
          normalizedPlan.url ||
            normalizedPlan.googleDriveFolderUrl ||
            "",
        );

        onTrainingPlanSaved?.(normalizedPlan);
      }

      onSaved(confirmedClient);

      showOwnerSuccess("Dane klienta zostały zaktualizowane.", {
        id: "owner-client-edit-success",
      });

      onClose();
    } catch (err) {
      if (revision !== lifecycle.current) return;
      showOwnerError(err, "Nie udało się zaktualizować klienta.", {
        id: "owner-client-edit-error",
      });
    } finally {
      saveLock.current = false;
      if (revision === lifecycle.current) setIsSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!hasUserAccount) {
      throw new Error(
        "Aby dodać zdjęcie, klient musi mieć konto w panelu. Wyślij mu zaproszenie.",
      );
    }

    const revision = lifecycle.current;
    const uploadedUrl =
      access === "trainer"
        ? await uploadTrainerClientAvatar(clientId, file)
        : await uploadClientAvatar(clientId, file);

    if (revision !== lifecycle.current) return uploadedUrl;
    setAvatarUrl(uploadedUrl);
    onAvatarChanged?.(uploadedUrl);

    showOwnerSuccess("Zdjęcie klienta zostało zmienione.", {
      id: "client-avatar-upload-success",
    });

    return uploadedUrl;
  }

  async function handleAvatarRemove() {
    if (!hasUserAccount) return;
    const revision = lifecycle.current;

    if (access === "trainer") {
      await deleteTrainerClientAvatar(clientId);
    } else {
      await deleteClientAvatar(clientId);
    }

    if (revision !== lifecycle.current) return;
    setAvatarUrl("");
    onAvatarChanged?.("");

    showOwnerSuccess("Zdjęcie klienta zostało usunięte.", {
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
          <ModalHeader
            eyebrow="Edycja"
            title="Dane klienta"
            onClose={onClose}
          />

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

            <OwnerTextField
              label="E-mail"
              value={email}
              onChange={setEmail}
            />

            <OwnerTextField
              label="Telefon"
              value={phoneNumber}
              onChange={setPhoneNumber}
            />

            {hasUserAccount ? (
              <AvatarFilePicker
                label="Zdjęcie klienta"
                value={avatarUrl}
                onChange={setAvatarUrl}
                onUpload={handleAvatarUpload}
                onRemove={handleAvatarRemove}
                fallbackText={avatarFallback}
                className="md:col-span-2"
              />
            ) : (
              <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 md:col-span-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary-light">
                  {avatarFallback}
                </div>

                <p className="text-sm text-on-surface-variant">
                  {currentClient.userId === undefined
                    ? "Brak informacji o koncie klienta. Zmiana zdjęcia jest niedostępna."
                    : "Zdjęcie będzie dostępne po utworzeniu konta klienta."}
                </p>
              </div>
            )}

            <div>
              <span className="text-label text-on-surface-muted">
                Trener
              </span>

              <CustomSelect
                value={trainerId}
                onChange={setTrainerId}
                className="mt-2"
                options={trainerOptions}
              />
            </div>

            <div>
              <span className="text-label text-on-surface-muted">
                {access === "owner"
                  ? "Lokalizacja główna"
                  : "Lokalizacja"}
              </span>

              <CustomSelect
                value={locationId}
                onChange={setLocationId}
                icon={<MapPin size={16} />}
                className="mt-2"
                options={locationOptions}
              />
            </div>

            {trainerChanged ? (
              <div className="flex gap-3 rounded-[var(--radius-lg)] bg-warning-container/25 p-4 text-sm text-on-surface-variant md:col-span-2">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-warning-light"
                />
                <p>
                  Zmiana opiekuna nie zmieni trenera w już zaplanowanych
                  sesjach.
                </p>
              </div>
            ) : null}

            {trainerLocationMismatch ? (
              <div className="flex gap-3 rounded-[var(--radius-lg)] bg-error-container/30 p-4 text-sm text-error-light md:col-span-2">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>
                  Wybrany trener nie jest przypisany do lokalizacji głównej
                  klienta. Zapisanie tej zmiany może być niemożliwe. Wybierz trenera z tej lokalizacji.
                </p>
              </div>
            ) : null}

            {access === "owner" ? (
              <div className="rounded-[var(--radius-lg)] bg-surface-container-lowest p-4 md:col-span-2">
                <p className="text-label text-on-surface-muted">
                  Lokalizacje zajęć grupowych
                </p>

                {!groupLocationsAvailable ? (
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Dane dodatkowych lokalizacji są obecnie niedostępne.
                  </p>
                ) : groupLocationNames.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {groupLocationNames.map((locationName) => (
                      <span
                        key={locationName}
                        className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-primary-light"
                      >
                        {locationName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Brak dodatkowych lokalizacji
                  </p>
                )}

                <p className="mt-3 text-xs text-on-surface-muted">
                  Lokalizacje wynikają z aktywnych pakietów grupowych i są
                  tylko do odczytu.
                </p>
              </div>
            ) : null}

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

                <p className="font-semibold text-on-surface">
                  Pliki
                </p>
              </div>

              {!planReady ? <p role="status" className="mb-3 text-sm text-on-surface-variant">{planError || "Pobieramy link do plików…"}</p> : null}
              <OwnerTextField
                label="Link do folderu"
                disabled={!planReady || isSaving}
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
            disabled={isSaving || !planReady}
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
  return (
    location.name ||
    location.city ||
    `Lokalizacja ${location.id}`
  );
}

async function getTrainersForEditModal(access: "owner" | "trainer", trainerMe?: TrainerPortalMe | null) {
  if (access === "owner") return getTrainers();
  const me = trainerMe || await getTrainerPortalMe();
  const trainer = trainerPortalMeToTrainer(me);
  return trainer ? [trainer] : [];
}

async function getLocationsForEditModal(access: "owner" | "trainer", trainerMe?: TrainerPortalMe | null) {
  if (access === "owner") return getLocations();
  return trainerPortalMeToLocations(trainerMe || await getTrainerPortalMe());
}

async function getTrainingPlanForEditModal(clientId: number, access: "owner" | "trainer", signal?: AbortSignal) {
  return access === "trainer" ? getTrainerPortalClientTrainingPlan(clientId, signal) : getClientTrainingPlan(clientId);
}

async function updateClientForEditModal(clientId: number, payload: UpdateClientPayload, access: "owner" | "trainer") {
  return access === "trainer" ? updateTrainerPortalClient(clientId, payload) : updateClient(clientId, payload);
}

async function getConfirmedClientForEditModal(
  clientId: number,
  access: "owner" | "trainer",
  trainerMe?: TrainerPortalMe | null,
) {
  if (access === "trainer") {
    const [clientData, me] = await Promise.all([
      getTrainerPortalClient(clientId),
      trainerMe
        ? Promise.resolve(trainerMe)
        : getTrainerPortalMe().catch(() => null),
    ]);

    return trainerPortalClientToClient(clientData, me);
  }

  return getClient(clientId);
}

async function updateTrainingPlanForEditModal(clientId: number, payload: UpdateClientTrainingPlanPayload, access: "owner" | "trainer") {
  return access === "trainer" ? updateTrainerPortalClientTrainingPlan(clientId, payload) : updateClientTrainingPlan(clientId, payload);
}

function normalizeLocationName(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function resolveClientLocationId(
  client: Client,
  locations: Location[],
) {
  if (client.locationId) {
    return String(client.locationId);
  }

  const clientLocationName = normalizeLocationName(
    client.locationName,
  );

  const matchedLocation = locations.find((location) =>
    [location.name, location.city]
      .map(normalizeLocationName)
      .filter(Boolean)
      .includes(clientLocationName),
  );

  return matchedLocation
    ? String(matchedLocation.id)
    : "";
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
    return {
      fileId: "",
      folderId: "",
    };
  }

  const folderMatch =
    parsedUrl.pathname.match(/\/folders\/([^/?]+)/);

  const fileMatch =
    parsedUrl.pathname.match(/\/d\/([^/?]+)/) ||
    parsedUrl.pathname.match(/\/file\/d\/([^/?]+)/);

  return {
    fileId:
      parsedUrl.searchParams.get("id") ||
      fileMatch?.[1] ||
      "",
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
  return Boolean(safeExternalUrl(value));
}

function getClientUpdateFailedFields(
  client: Client,
  payload: UpdateClientPayload,
) {
  const failedFields: string[] = [];

  if (client.trainerId !== payload.trainerId) {
    failedFields.push("trener");
  }

  if (client.locationId !== payload.locationId) {
    failedFields.push("lokalizacja");
  }

  if (!isSameOptionalText(client.firstName, payload.firstName)) {
    failedFields.push("imię");
  }

  if (!isSameOptionalText(client.lastName, payload.lastName)) {
    failedFields.push("nazwisko");
  }

  if (!isSameOptionalText(client.email, payload.email)) {
    failedFields.push("e-mail");
  }

  if (
    !isSameOptionalText(
      client.phoneNumber,
      payload.phoneNumber,
    )
  ) {
    failedFields.push("telefon");
  }

  if (!isSameOptionalText(client.goal, payload.goal)) {
    failedFields.push("cel");
  }

  if (
    toDateInputValue(client.trainingStartDate) !==
    toDateInputValue(payload.trainingStartDate)
  ) {
    failedFields.push("data rozpoczęcia treningów");
  }

  return failedFields;
}
