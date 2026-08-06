"use client";

import { useState } from "react";
import { Btn } from "@/components/ui";
import { ActionIcon } from "@/components/ActionIcon";
import {
  ACCURACY_THRESHOLD_M,
  getCurrentCoordinates,
} from "@/lib/geolocation";

type Props = {
  onLocated: (pos: { lat: number; lng: number; accuracy: number }) => void;
  disabled?: boolean;
};

/** Nút lấy GPS hiện tại + indicator độ chính xác */
export function GpsLocateButton({ onLocated, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);

  async function handleClick() {
    setLoading(true);
    setError("");
    setWarning("");
    const result = await getCurrentCoordinates();
    setLoading(false);

    if (!result.ok) {
      setAccuracy(null);
      setError(result.error);
      return;
    }

    setAccuracy(result.position.accuracy);
    if (result.lowAccuracy) {
      setWarning(
        `Độ chính xác thấp hơn ${ACCURACY_THRESHOLD_M}m, vui lòng chọn lại`,
      );
      return;
    }

    onLocated({
      lat: result.position.lat,
      lng: result.position.lng,
      accuracy: result.position.accuracy,
    });
  }

  return (
    <div className="space-y-2">
      <Btn type="button" variant="secondary" onClick={handleClick} disabled={disabled || loading}>
        <ActionIcon action="gps" size="button" />
        {loading ? "Đang lấy tọa độ…" : "Lấy tọa độ GPS"}
      </Btn>
      {accuracy != null && !error && (
        <p className="text-xs text-slate-600">
          Độ chính xác: ±{Math.round(accuracy)} mét
        </p>
      )}
      {warning && <p className="text-sm text-amber-700">{warning}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
