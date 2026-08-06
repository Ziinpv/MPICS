export type GeoPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeoResult =
  | { ok: true; position: GeoPosition; lowAccuracy: boolean }
  | { ok: false; error: string };

const ACCURACY_THRESHOLD_M = 50;
const TIMEOUT_MS = 15000;

export function isGeolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/**
 * Lấy tọa độ hiện tại qua Geolocation API.
 * - accuracy > 50m → ok + lowAccuracy (cảnh báo, vẫn trả tọa độ để preview)
 * - permission denied / timeout / unsupported → error message tiếng Việt
 */
export function getCurrentCoordinates(
  options?: PositionOptions,
): Promise<GeoResult> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({
      ok: false,
      error: "Trình duyệt không hỗ trợ định vị GPS",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        resolve({
          ok: true,
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy,
          },
          lowAccuracy: accuracy > ACCURACY_THRESHOLD_M,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, error: "Vui lòng cấp quyền truy cập vị trí" });
          return;
        }
        if (err.code === err.TIMEOUT) {
          resolve({ ok: false, error: "Không thể lấy vị trí, vui lòng thử lại" });
          return;
        }
        resolve({
          ok: false,
          error: "Không thể lấy vị trí, vui lòng thử lại",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: TIMEOUT_MS,
        maximumAge: 0,
        ...options,
      },
    );
  });
}

export { ACCURACY_THRESHOLD_M };
