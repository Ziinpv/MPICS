import { cookies } from "next/headers";
import { getSession, COOKIE, clearAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/ui";
import { redirect } from "next/navigation";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/devices", label: "Thiết bị IoT" },
  { href: "/admin/devices/map", label: "Bản đồ thiết bị" },
  { href: "/admin/contents", label: "Nội dung phát thanh" },
  { href: "/admin/schedules", label: "Lịch phát" },
  { href: "/admin/locations", label: "Địa điểm GIS" },
  { href: "/admin/incidents", label: "Sự cố" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    await clearAuthCookie();
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { org: true },
  });

  if (!user) {
    cookies().set(COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    redirect("/login");
  }

  return (
    <AppShell
      title="Admin Portal"
      subtitle={`${user.fullName} · ${user.org.name}`}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
