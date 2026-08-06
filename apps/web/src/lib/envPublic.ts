/** Cờ hiển thị gợi ý demo (quick login, password seed) trên UI */
export function showDemoHints() {
  const v = process.env.NEXT_PUBLIC_SHOW_DEMO_HINTS;
  if (v === "0" || v === "false") return false;
  if (v === "1" || v === "true") return true;
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";
  return appEnv === "development" || appEnv === "demo";
}
