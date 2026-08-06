"use client";

import { useEffect, useState } from "react";
import MapView, { MapMarker } from "@/components/MapView";
import { PageHeader, Card } from "@/components/ui";
import { DeviceTypeSelect } from "@/components/DeviceTypeSelect";
import { ActionIcon } from "@/components/ActionIcon";

export default function AdminDeviceMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [type, setType] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (type) q.set("device_type", type);
    fetch(`/api/devices/map?${q}`)
      .then((r) => r.json())
      .then((geo) => {
        setMarkers(
          (geo.features || []).map((f: any) => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            label: f.properties.name,
            type: f.properties.type,
            online: f.properties.online,
            popup: `${f.properties.deviceCode} · ${f.properties.typeLabel || f.properties.type} · ${
              f.properties.online ? "Online" : "Offline"
            }`,
          }))
        );
      });
  }, [type]);

  return (
    <div>
      <PageHeader title="Bản đồ thiết bị IoT" />
      <Card className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5">
          <ActionIcon action="map" size="sm" />
          Lọc theo loại thiết bị
        </label>
        <DeviceTypeSelect value={type} onChange={setType} allowAll variant="chips" />
      </Card>
      <Card>
        <MapView markers={markers} height="520px" />
      </Card>
    </div>
  );
}
