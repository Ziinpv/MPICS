import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell, type NavGroup } from "@/components/ui";
import { redirect } from "next/navigation";

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    items: [
      { href: "/admin", label: "Bản đồ hình ảnh" },
      { href: "/admin/charts", label: "Biểu đồ" },
    ],
  },
  {
    id: "catalog",
    label: "Quản lý danh mục",
    items: [
      { href: "/admin/catalog/provinces", label: "Danh mục Tỉnh" },
      { href: "/admin/catalog/communes", label: "Danh mục Phường/Xã" },
      { href: "/admin/catalog/location-types", label: "Loại địa điểm" },
    ],
  },
  {
    id: "culture",
    label: "Thông tin văn hoá",
    items: [
      { href: "/admin/cultural", label: "Địa điểm văn hoá" },
      { href: "/admin/tttm", label: "Truyền thanh thông minh" },
      { href: "/admin/religious", label: "Cơ sở tín ngưỡng" },
      { href: "/admin/locations", label: "Tất cả địa điểm GIS" },
    ],
  },
  {
    id: "iot",
    label: "IoT & phát sóng",
    items: [
      { href: "/admin/iot", label: "Dashboard IoT" },
      { href: "/admin/devices", label: "Thiết bị IoT" },
      { href: "/admin/devices/map", label: "Bản đồ thiết bị" },
      { href: "/admin/contents", label: "Nội dung phát thanh" },
      { href: "/admin/schedules", label: "Lịch phát" },
      { href: "/admin/incidents", label: "Sự cố" },
    ],
  },
  {
    id: "reports",
    label: "Báo cáo",
    items: [{ href: "/admin/reports", label: "Xuất báo cáo địa điểm" }],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [{ href: "/admin/users", label: "Quản lý người dùng" }],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/api/auth/logout");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { org: true },
  });

  if (!user) {
    redirect("/api/auth/logout");
  }

  if (user.mustChangePassword) {
    redirect("/account/password");
  }

  return (
    <AppShell
      title="Admin Portal"
      subtitle={`${user.fullName} · ${user.org.name}`}
      navGroups={navGroups}
    >
      {children}
    </AppShell>
  );
}
