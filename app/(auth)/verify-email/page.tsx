import VerifyEmailView from "./VerifyEmailView";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const rawToken = (await searchParams).token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  return <VerifyEmailView token={token?.trim() || ""} />;
}
