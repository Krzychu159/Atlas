import { proxyPublicAuthPost } from "../../auth/_utils/public-auth-proxy";

export async function POST(request: Request) {
  return proxyPublicAuthPost(request, "invitations/accept", (body) => ({
    token: body.token,
    firstName: body.firstName,
    lastName: body.lastName,
    password: body.password,
  }));
}
