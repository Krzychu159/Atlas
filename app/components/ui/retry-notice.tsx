import { Button } from "@/app/components/ui/button";

export function RetryNotice({
  text,
  onRetry,
  disabled = false,
}: {
  text: string;
  onRetry: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface-container-low p-4 text-sm leading-6 text-on-surface-variant sm:flex-row sm:items-center sm:justify-between"
    >
      <p>{text}</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 shrink-0"
        disabled={disabled}
        onClick={onRetry}
      >
        Spróbuj ponownie
      </Button>
    </div>
  );
}
