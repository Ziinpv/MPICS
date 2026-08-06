import { getSession, signToken, setAuthCookie, clearAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { org: true },
  });

  if (!user || user.status !== "active") {
    await clearAuthCookie();
    return jsonError("Unauthorized", 401);
  }

  const fresh = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    orgId: user.orgId,
    orgPath: user.org.path,
    orgName: user.org.name,
    mustChangePassword: user.mustChangePassword,
  };

  if (
    session.orgId !== fresh.orgId ||
    session.orgName !== fresh.orgName ||
    session.fullName !== fresh.fullName ||
    session.orgPath !== fresh.orgPath ||
    Boolean(session.mustChangePassword) !== fresh.mustChangePassword
  ) {
    const token = await signToken(fresh);
    await setAuthCookie(token);
  }

  return jsonOk({ user: fresh });
}
