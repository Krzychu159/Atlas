import type { Metadata } from "next";
import AcceptInvitationForm from "./AcceptInvitationForm";

export const metadata: Metadata = {
  title: "Akceptuj zaproszenie | Atlas",
  description: "Utwórz konto na podstawie zaproszenia do Atlas.",
};

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;

  return <AcceptInvitationForm token={rawToken?.trim() || ""} />;
}
