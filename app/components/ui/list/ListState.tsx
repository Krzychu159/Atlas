import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type ListStateProps =
  | { variant: "loading"; label: string }
  | {
      variant: "empty" | "error";
      icon?: ReactNode;
      title: string;
      message?: string;
      action?: ReactNode;
    };

export function ListState(props: ListStateProps) {
  if (props.variant === "loading") {
    return (
      <div
        role="status"
        className="flex min-h-56 items-center justify-center gap-2 bg-surface-container-lowest px-5 text-sm text-on-surface-muted"
      >
        <LoaderCircle size={18} className="animate-spin" />
        {props.label}
      </div>
    );
  }

  return (
    <div
      role={props.variant === "error" ? "alert" : undefined}
      className="flex min-h-56 flex-col items-center justify-center bg-surface-container-lowest px-5 py-8 text-center"
    >
      {props.icon ? <span className="text-on-surface-muted">{props.icon}</span> : null}
      <p className="mt-4 text-sm font-semibold text-on-surface">{props.title}</p>
      {props.message ? (
        <p className="mt-1 max-w-[420px] text-sm text-on-surface-muted">{props.message}</p>
      ) : null}
      {props.action ? <div className="mt-5">{props.action}</div> : null}
    </div>
  );
}
