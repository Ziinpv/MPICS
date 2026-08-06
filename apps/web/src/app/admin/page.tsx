"use client";

import { useEffect, useState } from "react";
import MapView, { MapMarker } from "@/components/MapView";
import { Card, Stat } from "@/components/ui";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";
import { ResultsPanel } from "@/components/SearchResults";
import { TypeBadge } from "@/components/DeviceTypeSelect";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);

    fetch("/api/locations/map")
      .then((r) => r.json())
      .then((geo) => {
        setMarkers(
          (geo.features || []).map((f: any) => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            label: f.properties.name,
            type: f.properties.locationType,
            popup: `${f.properties.locationTypeLabel || ""} · ${
              OPERATION_STATUS_LABELS[f.properties.operationStatus] || ""
            }`,
          })),
        );
      });
  }, []);

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Địa điểm" value={stats?.locationsCount ?? "…"} accent="brand" />
        <Stat label="Hình ảnh" value={stats?.mediaCount ?? "…"} accent="danger" />
        <Stat label="Loại địa điểm" value={stats?.locationTypesCount ?? "…"} accent="accent" />
      </div>

      <Card className="mb-4 overflow-hidden p-2 sm:p-3">
        <MapView markers={markers} height="520px" zoom={11} center={[12.004, 108.42]} />
      </Card>

      <ResultsPanel
        title="Danh sách địa điểm mới nhất"
        count={stats?.recentLocations?.length || 0}
        empty={!stats?.recentLocations?.length}
      >
        <table>
          <thead>
            <tr>
              <th>Tên địa điểm</th>
              <th>Phường/Xã</th>
              <th>Phân loại</th>
              <th>Ngày thêm</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentLocations || []).map((l: any) => (
              <tr key={l.id}>
                <td className="font-medium text-brand-800">{l.name}</td>
                <td>{l.orgName}</td>
                <td>
                  <TypeBadge
                    type={l.locationType}
                    label={LOCATION_TYPE_LABELS[l.locationType] || l.locationType}
                  />
                </td>
                <td className="text-slate-500">
                  {new Date(l.createdAt).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResultsPanel>
    </div>
  );
}
