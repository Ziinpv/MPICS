"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Btn } from "@/components/ui";
import { OPERATION_STATUS_LABELS, LOCATION_TYPE_LABELS } from "@/lib/labels";
import { LocationTypeSelect, TypeBadge } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function UserLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (type) q.set("location_type", type);
    fetch(`/api/locations?${q}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []));
  }, [type]);

  return (
    <div>
      <PageHeader
        title="Danh sách địa điểm / tài sản"
        actions={
          <Link href="/user/locations/new">
            <Btn>
              <ActionIcon action="add" size="sm" />
              Thêm mới
            </Btn>
          </Link>
        }
      />
      <Card className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5">
          <ActionIcon action="search" size="sm" />
          Lọc theo phân loại
        </label>
        <LocationTypeSelect value={type} onChange={setType} allowAll variant="chips" />
      </Card>
      <Card>
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Phân loại</th>
              <th>Giấy phép</th>
              <th>Hết hạn</th>
              <th>Tình trạng</th>
              <th></th>
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
                  <TypeBadge
                    type={l.locationType}
                    label={LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                  />
                  {l.locationSubtype ? (
                    <div className="mt-1 text-xs text-slate-400">{l.locationSubtype}</div>
                  ) : null}
                </td>
                <td>{l.licenseNumber || "—"}</td>
                <td>{l.expiryDate ? new Date(l.expiryDate).toLocaleDateString("vi-VN") : "—"}</td>
                <td>
                  <StatusIcon
                    operationStatus={l.operationStatus}
                    showLabel
                    label={OPERATION_STATUS_LABELS[l.operationStatus]}
                    size="sm"
                  />
                </td>
                <td>
                  <Link
                    href={`/user/locations/${l.id}`}
                    className="inline-flex text-brand-700 hover:text-brand-900"
                    title="Sửa"
                  >
                    <ActionIcon action="edit" size="inline" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
