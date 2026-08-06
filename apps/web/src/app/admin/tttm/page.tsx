"use client";

import { AdminLocationsList } from "@/components/AdminLocationsList";

export default function AdminTttmPage() {
  return (
    <AdminLocationsList
      title="Truyền thanh thông minh"
      subtitle="Thiết bị truyền thông thông minh (TTTM) trên GIS"
      fixedType="communication_device"
      allowTypeFilter={false}
    />
  );
}
