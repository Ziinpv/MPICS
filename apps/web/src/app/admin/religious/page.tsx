"use client";

import { AdminLocationsList } from "@/components/AdminLocationsList";

export default function AdminReligiousPage() {
  return (
    <AdminLocationsList
      title="Cơ sở tín ngưỡng"
      subtitle="Đình, chùa, đền / miếu trên địa bàn"
      fixedType="religious_site"
      allowTypeFilter={false}
    />
  );
}
