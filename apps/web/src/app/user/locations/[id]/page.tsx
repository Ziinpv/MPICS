"use client";

import { LocationEditor } from "@/components/LocationEditor";

export default function UserEditLocationPage({ params }: { params: { id: string } }) {
  return (
    <LocationEditor
      locationId={params.id}
      backHref="/user/locations"
      allowOrgChange={false}
    />
  );
}
