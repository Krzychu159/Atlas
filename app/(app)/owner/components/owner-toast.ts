import { toast } from "sonner";
import { getErrorMessage } from "@/app/lib/backend";

type ToastOptions = {
  id?: string;
};

export function showOwnerError(
  error: unknown,
  fallback: string,
  options?: ToastOptions,
) {
  toast.error(getErrorMessage(error, fallback), options);
}

export function showOwnerSuccess(message: string, options?: ToastOptions) {
  toast.success(message, options);
}

export function showOwnerInfo(message: string, options?: ToastOptions) {
  toast.info(message, options);
}
