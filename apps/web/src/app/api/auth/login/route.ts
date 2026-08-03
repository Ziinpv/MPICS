import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken, clearAuthCookie } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = body?.username?.trim();
  const password = body?.password;
  if (!username || !password) return jsonError("Thiếu username/password");

  const user = await prisma.user.findUnique({
    where: { username },
    include: { org: true },
  });
  if (!user || user.status !== "active") return jsonError("Sai tài khoản hoặc mật khẩu", 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return jsonError("Sai tài khoản hoặc mật khẩu", 401);

  const session = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    orgId: user.orgId,
    orgPath: user.org.path,
    orgName: user.org.name,
  };
  const token = await signToken(session);
  await setAuthCookie(token);
  return jsonOk({ user: session });
}

export async function DELETE() {
  await clearAuthCookie();
  return jsonOk({ ok: true });
}
