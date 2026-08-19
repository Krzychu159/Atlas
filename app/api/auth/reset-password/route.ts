import { proxyPublicAuthPost } from "../_utils/public-auth-proxy";

export async function POST(req: Request) {
  return proxyPublicAuthPost(req, "auth/reset-password", (body) => ({
    token: body.token,
    newPassword: body.newPassword,
  }));
}
