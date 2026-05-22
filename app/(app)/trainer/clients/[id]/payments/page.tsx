import ClientPaymentsPageClient from "@/app/(app)/owner/clients/[id]/payments/ClientPaymentsPageClient";

type TrainerClientPaymentsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TrainerClientPaymentsPage({
  params,
}: TrainerClientPaymentsPageProps) {
  const { id } = await params;

  return <ClientPaymentsPageClient clientIdParam={id} basePath="/trainer" />;
}
