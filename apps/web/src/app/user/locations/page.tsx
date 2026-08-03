"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Btn } from "@/components/ui";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";

export default function UserLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
  }, []);

  return (
    <div>
      <PageHeader
        title="Danh sách địa điểm / tài sản"
        actions={
          <Link href="/user/locations/new">
            <Btn>Thêm mới</Btn>
          </Link>
        }
      />
      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Phân loại</th>
              <th>Giấy phép</th>
              <th>Hết hạn</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id}>
                <td>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-slate-400">
                    {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
                  </div>
                </td>
                <td>
                  {LOCATION_TYPE_LABELS[l.locationType]}
                  {l.locationSubtype ? ` · ${l.locationSubtype}` : ""}
                </td>
                <td>{l.licenseNumber || "—"}</td>
                <td>{l.expiryDate ? new Date(l.expiryDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td>{OPERATION_STATUS_LABELS[l.operationStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
