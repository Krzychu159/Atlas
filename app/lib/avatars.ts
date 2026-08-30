import { backendDelete, backendFetch } from "@/app/lib/backend";
import { notifyCurrentUserChanged } from "@/app/lib/auth/current-user";

export type AvatarResponse = {
  userId: number;
  avatarUrl: string;
};

async function uploadAvatar(path: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return backendFetch<AvatarResponse>(path, {
    method: "POST",
    body: formData,
  });
}

export async function uploadCurrentUserAvatar(file: File) {
  const result = await uploadAvatar("auth/me/avatar", file);
  notifyCurrentUserChanged();
  return result.avatarUrl;
}

export async function deleteCurrentUserAvatar() {
  await backendDelete<void>("auth/me/avatar");
  notifyCurrentUserChanged();
}

export async function uploadTrainerAvatar(trainerId: number, file: File) {
  const result = await uploadAvatar(`trainers/${trainerId}/avatar`, file);
  return result.avatarUrl;
}

export function deleteTrainerAvatar(trainerId: number) {
  return backendDelete<void>(`trainers/${trainerId}/avatar`);
}

export async function uploadClientAvatar(clientId: number, file: File) {
  const result = await uploadAvatar(`clients/${clientId}/avatar`, file);
  return result.avatarUrl;
}

export function deleteClientAvatar(clientId: number) {
  return backendDelete<void>(`clients/${clientId}/avatar`);
}

export async function uploadTrainerClientAvatar(
  clientId: number,
  file: File,
) {
  const result = await uploadAvatar(
    `trainer-portal/clients/${clientId}/avatar`,
    file,
  );
  return result.avatarUrl;
}

export function deleteTrainerClientAvatar(clientId: number) {
  return backendDelete<void>(`trainer-portal/clients/${clientId}/avatar`);
}
