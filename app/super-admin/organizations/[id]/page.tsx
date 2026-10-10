import { OrganizationDetails } from "../../components/organization-details";

export default async function OrganizationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: organizationId } = await params;
  return <OrganizationDetails organizationId={organizationId} />;
}
