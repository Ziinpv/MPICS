"use client";

import { LocationEditor } from "@/components/LocationEditor";

export default function AdminEditLocationPage({ params }: { params: { id: string } }) {
  return (
    <LocationEditor
      locationId={params.id}
      backHref="/admin/locations"
      allowOrgChange={false}
    />
  );
}
