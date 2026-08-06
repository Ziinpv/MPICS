"use client";

import { AdminLocationsList } from "@/components/AdminLocationsList";

export default function AdminCulturalPage() {
  return (
    <AdminLocationsList
      title="Địa điểm văn hoá"
      subtitle="Danh sách địa điểm văn hóa trên địa bàn"
      fixedType="cultural_site"
      allowTypeFilter={false}
    />
  );
}
