"use client";

import { useEffect, useState } from "react";
import MapView, { MapMarker } from "@/components/MapView";
import { PageHeader, Card } from "@/components/ui";

export default function AdminDeviceMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  useEffect(() => {
    fetch("/api/devices/map")
      .then((r) => r.json())
      .then((geo) => {
        setMarkers(
          (geo.features || []).map((f: any) => ({
            id: f.properties.id,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            label: f.properties.name,
            popup: `${f.properties.deviceCode} · ${f.properties.online ? "Online" : "Offline"}`,
          }))
        );
      });
  }, []);

  return (
    <div>
      <PageHeader title="Bản đồ thiết bị IoT" />
      <Card>
        <MapView markers={markers} height="520px" />
      </Card>
    </div>
  );
}
