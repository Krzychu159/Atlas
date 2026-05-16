import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { expireAuthCookies } from "@/app/lib/server/auth-cookies";

export const runtime = "nodejs";

const maxAvatarSize = 2 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    const response = NextResponse.json(
      { message: "Sesja wygasła." },
      { status: 401 },
    );
    expireAuthCookies(response);

    return response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Brakuje pliku zdjęcia." },
      { status: 400 },
    );
  }

  const extension = allowedTypes.get(file.type);

  if (!extension) {
    return NextResponse.json(
      { message: "Nieobsługiwany format zdjęcia." },
      { status: 400 },
    );
  }

  if (file.size > maxAvatarSize) {
    return NextResponse.json(
      { message: "Plik zdjęcia jest za duży." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const fileName = `${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, bytes);

  return NextResponse.json({
    url: `/uploads/avatars/${fileName}`,
  });
}
