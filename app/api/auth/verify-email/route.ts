import { proxyPublicAuthPost } from "../_utils/public-auth-proxy";

export async function POST(request: Request) {
  return proxyPublicAuthPost(request, "auth/verify-email", (body) => ({
    token: body.token,
  }));
}
