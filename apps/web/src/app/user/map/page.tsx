"use client";

import { useEffect, useState } from "react";
import MapView, { MapMarker } from "@/components/MapView";
import { PageHeader, Card } from "@/components/ui";
import { OPERATION_STATUS_LABELS } from "@/lib/labels";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

export default function UserMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  function load() {
    const q = new URLSearchParams();
    if (type) q.set("location_type", type);
    if (status) q.set("operation_status", status);
    fetch(`/api/locations/map?${q}`)
      .then((r) => r.json())
      .then((geo) => {
        setMarkers(
          (geo.features || []).map((f: any) => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            label: f.properties.name,
            type: f.properties.locationType,
            popup: `${f.properties.locationTypeLabel || f.properties.locationType} · ${
              OPERATION_STATUS_LABELS[f.properties.operationStatus] || ""
            }`,
          }))
        );
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <div>
      <PageHeader title="Bản đồ tra cứu vị trí" />
      <Card className="mb-4 space-y-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5">
            <ActionIcon action="search" size="sm" />
            Loại
          </label>
          <LocationTypeSelect value={type} onChange={setType} allowAll variant="chips" />
        </div>
        <div className="w-48">
          <label className="mb-1.5 flex items-center gap-1.5">
            <StatusIcon operationStatus={status || "active"} size="sm" />
            Tình trạng
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(OPERATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </Card>
      <Card>
        <MapView markers={markers} height="520px" />
        <p className="mt-2 text-xs text-slate-400">{markers.length} địa điểm</p>
      </Card>
    </div>
  );
}
