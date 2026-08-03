import { cookies } from "next/headers";
import { getSession, COOKIE, clearAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/ui";
import { redirect } from "next/navigation";

const nav = [
  { href: "/user", label: "Tổng quan" },
  { href: "/user/map", label: "Bản đồ tra cứu" },
  { href: "/user/locations", label: "Danh sách địa điểm" },
  { href: "/user/locations/new", label: "Thêm địa điểm" },
  { href: "/user/incidents", label: "Báo sự cố" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "USER") {
    await clearAuthCookie();
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { org: true },
  });

  // JWT còn nhưng user đã bị seed lại / xóa → xóa cookie để tránh redirect loop
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
      title="User cơ sở"
      subtitle={`${user.fullName} · ${user.org.name}`}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
