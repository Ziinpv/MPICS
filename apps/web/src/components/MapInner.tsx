"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, CircleMarker } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./MapView";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function PickHandler({ onPick }: { onPick?: (pos: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

type Props = {
  markers?: MapMarker[];
  center?: LatLngExpression;
  zoom?: number;
  height?: string;
  pickMode?: boolean;
  pickPosition?: { lat: number; lng: number } | null;
  onPick?: (pos: { lat: number; lng: number }) => void;
  onError?: (msg: string) => void;
};

export default function MapInner({
  markers = [],
  center = [11.9404, 108.4583],
  zoom = 13,
  height = "420px",
  pickMode,
  pickPosition,
  onPick,
  onError,
}: Props) {
  useEffect(() => {
    try {
      // Ensure leaflet CSS applied in client
      if (typeof window === "undefined") return;
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [onError]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", minHeight: height, width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickMode && <PickHandler onPick={onPick} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
          <Popup>
            <strong>{m.label}</strong>
            {m.popup && <div className="text-sm mt-1">{m.popup}</div>}
          </Popup>
        </Marker>
      ))}
      {pickPosition && (
        <CircleMarker
          center={[pickPosition.lat, pickPosition.lng]}
          radius={10}
          pathOptions={{ color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}
