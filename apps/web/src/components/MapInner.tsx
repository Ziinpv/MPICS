"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./MapView";
import { buildLeafletMarkerHtml } from "@/lib/iconMap";

const defaultIcon = L.icon({
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

function Recenter({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  const lat = Array.isArray(center) ? Number(center[0]) : (center as L.LatLng).lat;
  const lng = Array.isArray(center) ? Number(center[1]) : (center as L.LatLng).lng;

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, zoom, map]);
  return null;
}

function typeIcon(type?: string, online?: boolean) {
  if (!type) return defaultIcon;
  return L.divIcon({
    className: "mpcis-device-marker",
    html: buildLeafletMarkerHtml(type, online),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
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
      if (typeof window === "undefined") return;
    } catch (e) {
      onError?.((e as Error).message);
    }
  }, [onError]);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon | L.Icon>();
    for (const m of markers) {
      const key = `${m.type || "default"}:${m.online === false ? "0" : "1"}`;
      if (!map.has(key)) map.set(key, typeIcon(m.type, m.online));
    }
    return map;
  }, [markers]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", minHeight: height, width: "100%" }}
      scrollWheelZoom
    >
      <Recenter center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickMode && <PickHandler onPick={onPick} />}
      {markers.map((m) => {
        if (m.type) {
          const key = `${m.type}:${m.online === false ? "0" : "1"}`;
          const icon = icons.get(key) || typeIcon(m.type, m.online);
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
              <Popup>
                <strong>{m.label}</strong>
                {m.popup && <div className="mt-1 text-sm">{m.popup}</div>}
              </Popup>
            </Marker>
          );
        }
        if (m.color) {
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={9}
              pathOptions={{ color: m.color, fillColor: m.color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <strong>{m.label}</strong>
                {m.popup && <div className="mt-1 text-sm">{m.popup}</div>}
              </Popup>
            </CircleMarker>
          );
        }
        return (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
            <Popup>
              <strong>{m.label}</strong>
              {m.popup && <div className="mt-1 text-sm">{m.popup}</div>}
            </Popup>
          </Marker>
        );
      })}
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
