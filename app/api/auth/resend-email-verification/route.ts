import { proxyPublicAuthPost } from "../_utils/public-auth-proxy";

export async function POST(request: Request) {
  return proxyPublicAuthPost(
    request,
    "auth/resend-email-verification",
    (body) => ({ email: body.email }),
  );
}
