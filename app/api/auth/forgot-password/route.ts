import { proxyPublicAuthPost } from "../_utils/public-auth-proxy";

export async function POST(req: Request) {
  return proxyPublicAuthPost(req, "auth/forgot-password", (body) => ({
    email: body.email,
  }));
}
