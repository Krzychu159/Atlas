import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/app/components/ui/button";

export type SessionSettlementAlertProps = {
  title?: string;
  message: string;
  action?: { href: string; label: string } | null;
};

// Why the session could not be completed, with an optional way to fix it.
export default function SessionSettlementAlert({ title = "Nie można zrealizować sesji", message, action }: SessionSettlementAlertProps) {
  return (
    <div role="alert" className="flex gap-3 border-t border-white/5 bg-error-container/20 px-5 py-3 md:px-6">
      <AlertTriangle size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-error-light" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-error-light">{title}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">{message}</p>
        {action ? (
          <ButtonLink href={action.href} variant="secondary" size="sm" icon={<ArrowUpRight size={15} />} className="mt-3 max-sm:w-full">
            {action.label}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
