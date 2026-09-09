import GroupClassDetails from "../components/GroupClassDetails";
export default async function GroupClassPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GroupClassDetails slug={slug} />;
}
