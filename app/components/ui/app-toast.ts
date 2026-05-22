import { toast } from "sonner";
import { getErrorMessage } from "@/app/lib/backend";

type ToastOptions = {
  id?: string;
};

export function showAppError(
  error: unknown,
  fallback: string,
  options?: ToastOptions,
) {
  toast.error(getErrorMessage(error, fallback), options);
}

export function showAppSuccess(message: string, options?: ToastOptions) {
  toast.success(message, options);
}

export function showAppInfo(message: string, options?: ToastOptions) {
  toast.info(message, options);
}
