import type { Metadata } from "next";
import { PublicShell } from "./classes/components/PublicShell";

export const metadata: Metadata = { title: "Zajęcia grupowe | ATLAS", description: "Znajdź zajęcia w ATLAS. Wybierz lokalizację, sprawdź wolne miejsca i zarezerwuj trening." };
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
