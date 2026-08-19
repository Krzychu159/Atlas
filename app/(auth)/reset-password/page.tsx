import { redirect } from "next/navigation";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    resetToken?: string | string[];
    email?: string | string[];
  }>;
};

function getSearchParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";

  return value || "";
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = getSearchParam(params.token) || getSearchParam(params.resetToken);
  const email = getSearchParam(params.email);
  const query = new URLSearchParams();

  if (token) query.set("token", token);
  if (email) query.set("email", email);

  redirect(query.toString() ? `/login?${query.toString()}` : "/login");
}
