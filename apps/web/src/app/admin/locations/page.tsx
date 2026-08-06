"use client";

import { AdminLocationsList } from "@/components/AdminLocationsList";

export default function AdminLocationsPage() {
  return (
    <AdminLocationsList
      title="Tất cả địa điểm GIS"
      subtitle="Toàn bộ địa điểm / tài sản trên địa bàn quản lý"
      allowTypeFilter
    />
  );
}
