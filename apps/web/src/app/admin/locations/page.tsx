"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
  }, []);

  return (
    <div>
      <PageHeader title="Địa điểm GIS (toàn huyện)" />
      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Loại</th>
              <th>Xã</th>
              <th>GP</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{LOCATION_TYPE_LABELS[l.locationType] || l.locationType}</td>
                <td>{l.org?.name}</td>
                <td>{l.licenseNumber || "—"}</td>
                <td>{OPERATION_STATUS_LABELS[l.operationStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
