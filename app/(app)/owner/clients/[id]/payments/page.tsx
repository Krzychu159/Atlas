import ClientPaymentsPageClient from "./ClientPaymentsPageClient";

type OwnerClientPaymentsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OwnerClientPaymentsPage({
  params,
}: OwnerClientPaymentsPageProps) {
  const { id } = await params;

  return <ClientPaymentsPageClient clientIdParam={id} />;
}
