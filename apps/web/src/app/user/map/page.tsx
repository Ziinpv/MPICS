"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MapView, { MapMarker } from "@/components/MapView";
import { PageHeader, Card, Btn } from "@/components/ui";
import { OPERATION_STATUS_LABELS } from "@/lib/labels";
import { LocationTypeSelect } from "@/components/DeviceTypeSelect";
import { StatusIcon } from "@/components/StatusIcon";
import { ActionIcon } from "@/components/ActionIcon";

const FALLBACK_CENTER: [number, number] = [11.9404, 108.4583];

export default function UserMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [center, setCenter] = useState<[number, number]>(FALLBACK_CENTER);
  const [zoom, setZoom] = useState(12);
  const [orgName, setOrgName] = useState("");
  const [recenterToken, setRecenterToken] = useState(0);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((meta) => {
        const box = meta.geoValidation?.myBbox;
        if (box?.centerLat != null && box?.centerLng != null) {
          setCenter([box.centerLat, box.centerLng]);
          setZoom(13);
          setRecenterToken((t) => t + 1);
        }
        setOrgName(meta.myOrg?.name || box?.label || "");
      })
      .catch(() => undefined);
  }, []);

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
            href: `/user/locations/${f.properties.id}`,
            popup: `${f.properties.locationTypeLabel || f.properties.locationType} · ${
              OPERATION_STATUS_LABELS[f.properties.operationStatus] || ""
            }`,
          })),
        );
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  return (
    <div>
      <PageHeader
        title="Bản đồ tra cứu vị trí"
        subtitle={orgName ? `Phạm vi: ${orgName}` : "Chỉ địa điểm trong xã của bạn"}
        actions={
          <Link href="/user/locations/new">
            <Btn>
              <ActionIcon action="add" size="sm" />
              Thêm địa điểm
            </Btn>
          </Link>
        }
      />
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
        <MapView
          markers={markers}
          height="560px"
          center={center}
          zoom={zoom}
          recenterToken={recenterToken}
          fitBoundsToMarkers={markers.length > 0}
        />
        <p className="mt-2 text-xs text-slate-500">
          {markers.length} địa điểm · click marker → Xem / Sửa · bản đồ tự phóng theo điểm trong xã
        </p>
      </Card>
    </div>
  );
}
