"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Dumbbell, LoaderCircle, Mail, TriangleAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TextField } from "@/app/components/ui/input";
import {
  resendEmailVerification,
  verifyEmail,
} from "@/app/lib/email-verification";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmailView({ token }: { token: string }) {
  const [state, setState] = useState<VerificationState>(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Potwierdzamy Twój adres e-mail…" : "Link nie zawiera tokenu weryfikacyjnego.",
  );
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let active = true;

    verifyEmail(token)
      .then(async () => {
        await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
        if (!active) return;
        setState("success");
        setMessage("Adres e-mail został potwierdzony. Możesz korzystać ze wszystkich funkcji konta.");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState("error");
        setMessage(
          error instanceof Error && error.message
            ? error.message
            : "Nie udało się potwierdzić adresu e-mail.",
        );
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resending) return;

    setResending(true);
    setResendMessage("");

    try {
      await resendEmailVerification(email.trim());
      setResendMessage(
        "Jeśli konto istnieje i wymaga weryfikacji, wysłaliśmy nowy link. Kolejną wiadomość można wygenerować najwcześniej za minutę.",
      );
    } catch (error) {
      setResendMessage(
        error instanceof Error ? error.message : "Nie udało się wysłać wiadomości.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10 text-on-surface">
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-surface-container p-6 shadow-ambient sm:p-10">
        <Link href="/classes" className="inline-flex items-center gap-3 font-display text-xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-gradient text-white">
            <Dumbbell size={18} />
          </span>
          Atlas
        </Link>

        <div className="mt-10 text-center" role="status" aria-live="polite">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${state === "success" ? "bg-tertiary/15 text-tertiary-light" : state === "error" ? "bg-error/10 text-error-light" : "bg-primary/10 text-primary-light"}`}>
            {state === "loading" ? <LoaderCircle size={28} className="animate-spin" /> : state === "success" ? <CheckCircle2 size={28} /> : <TriangleAlert size={28} />}
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold">
            {state === "loading" ? "Weryfikacja e-mail" : state === "success" ? "E-mail potwierdzony" : "Nie udało się potwierdzić e-maila"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
            {message}
          </p>
        </div>

        {state !== "loading" ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/classes" className="flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-primary px-5 text-sm font-semibold text-on-primary">
              Przejdź do zajęć
            </Link>
            <Link href="/login" className="flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-surface-container-low px-5 text-sm font-semibold">
              Przejdź do logowania
            </Link>
          </div>
        ) : null}

        {state === "error" ? (
          <form onSubmit={handleResend} className="mt-8 space-y-4 border-t border-white/10 pt-7">
            <div>
              <h2 className="text-sm font-semibold">Wyślij nowy link</h2>
              <p className="mt-1 text-xs leading-5 text-on-surface-muted">
                Podaj adres użyty podczas rejestracji.
              </p>
            </div>
            <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={setEmail} required />
            {resendMessage ? <p className="text-xs leading-5 text-on-surface-variant">{resendMessage}</p> : null}
            <Button type="submit" disabled={resending} icon={<Mail size={16} />} className="w-full">
              {resending ? "Wysyłanie…" : "Wyślij ponownie"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
