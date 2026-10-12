import { OrganizationDetails } from "../../components/organization-details";

export default async function OrganizationDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ created?: string }> }) {
  const { id: organizationId } = await params;
  const query = await searchParams;
  return <OrganizationDetails key={organizationId} organizationId={organizationId} created={query?.created === "1"} />;
}
