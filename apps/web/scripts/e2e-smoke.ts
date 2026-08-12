/**
 * Smoke test end-to-end local (không thay browser UI).
 * Usage: cd apps/web && npx.cmd tsx --env-file=.env scripts/e2e-smoke.ts
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

type Result = { name: string; ok: boolean; detail?: string; ms?: number };

const results: Result[] = [];
const jar = new Map<string, string>();

function parseSetCookie(res: Response) {
  const anyHeaders = res.headers as any;
  const raw: string[] =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")!]
        : [];
  for (const c of raw) {
    const part = c.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const cookie = cookieHeader();
  if (cookie) headers.set("Cookie", cookie);
  const t0 = Date.now();
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  parseSetCookie(res);
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data, ms: Date.now() - t0 };
}

async function check(
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string; ms?: number }>,
) {
  try {
    const r = await fn();
    results.push({ name, ok: r.ok, detail: r.detail, ms: r.ms });
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${name}${r.detail ? ` — ${r.detail}` : ""}${r.ms != null ? ` (${r.ms}ms)` : ""}`);
  } catch (e: any) {
    results.push({ name, ok: false, detail: e?.message || String(e) });
    console.log(`FAIL  ${name} — ${e?.message || e}`);
  }
}

async function main() {
  console.log(`MPCIS e2e smoke → ${BASE}\n`);

  await check("GET /api/health", async () => {
    const { res, data, ms } = await req("/api/health");
    return { ok: res.ok && data.ok === true, detail: data.service, ms };
  });

  await check("POST /api/auth/login (admin)", async () => {
    jar.clear();
    const { res, data, ms } = await req("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "Demo@123" }),
    });
    return {
      ok: res.ok && Boolean(data.user?.username === "admin" || data.ok !== false),
      detail: data.user?.username || data.error,
      ms,
    };
  });

  await check("GET /api/stats", async () => {
    const { res, data, ms } = await req("/api/stats");
    return {
      ok: res.ok && typeof data.devicesTotal === "number",
      detail: `online ${data.devicesOnline}/${data.devicesTotal}`,
      ms,
    };
  });

  await check("GET /api/devices", async () => {
    const { res, data, ms } = await req("/api/devices");
    return { ok: res.ok && Array.isArray(data.devices), detail: `${data.devices?.length || 0} devices`, ms };
  });

  await check("GET /api/clusters", async () => {
    const { res, data, ms } = await req("/api/clusters");
    return { ok: res.ok && Array.isArray(data.clusters), detail: `${data.clusters?.length || 0} clusters`, ms };
  });

  await check("GET /api/contents", async () => {
    const { res, data, ms } = await req("/api/contents");
    return { ok: res.ok && Array.isArray(data.contents), detail: `${data.contents?.length || 0} contents`, ms };
  });

  await check("GET /api/schedules", async () => {
    const { res, data, ms } = await req("/api/schedules");
    return { ok: res.ok && Array.isArray(data.schedules), detail: `${data.schedules?.length || 0}`, ms };
  });

  await check("GET /api/incidents", async () => {
    const { res, data, ms } = await req("/api/incidents");
    return { ok: res.ok && Array.isArray(data.incidents), detail: `${data.incidents?.length || 0}`, ms };
  });

  await check("GET /api/alerts", async () => {
    const { res, data, ms } = await req("/api/alerts");
    return { ok: res.ok && Array.isArray(data.alerts), detail: `openCount=${data.openCount}`, ms };
  });

  let contentId = "";
  await check("POST content draft → submit → approve", async () => {
    const title = `Smoke ${Date.now()}`;
    const c1 = await req("/api/contents", {
      method: "POST",
      body: JSON.stringify({
        title,
        bodyPlain: "Bản tin kiểm thử tự động MPCIS smoke test.",
        category: "admin_notice",
      }),
    });
    if (!c1.res.ok) return { ok: false, detail: c1.data.error, ms: c1.ms };
    contentId = c1.data.content?.id;
    const sub = await req(`/api/contents/${contentId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action: "submit" }),
    });
    if (!sub.res.ok) return { ok: false, detail: sub.data.error };
    const ap = await req(`/api/contents/${contentId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action: "approve" }),
    });
    if (!ap.res.ok) return { ok: false, detail: ap.data.error };
    return { ok: ap.data.content?.status === "approved", detail: ap.data.content?.status };
  });

  await check("POST run_tts (approved content)", async () => {
    if (!contentId) return { ok: false, detail: "no contentId" };
    const { res, data, ms } = await req(`/api/contents/${contentId}/moderate`, {
      method: "POST",
      body: JSON.stringify({
        action: "run_tts",
        voiceGender: "female",
        region: "north",
        speed: 1.0,
      }),
    });
    const st = data.content?.status || data.ttsJob?.status;
    return {
      ok: res.ok && (data.content?.status === "ready_to_air" || data.ttsJob?.status === "done" || data.ttsJob?.status === "queued"),
      detail: `content=${data.content?.status} job=${data.ttsJob?.status} ${data.message || data.error || ""}`,
      ms,
    };
  });

  await check("POST /api/tts/jobs list GET", async () => {
    const { res, data, ms } = await req("/api/tts/jobs");
    return { ok: res.ok && Array.isArray(data.jobs), detail: `${data.jobs?.length || 0} jobs`, ms };
  });

  let scheduleId = "";
  await check("POST schedule + resolved-devices preview", async () => {
    const ready = await req("/api/contents");
    const c = (ready.data.contents || []).find((x: any) => x.status === "ready_to_air");
    const meta = await req("/api/meta");
    const clusterId = meta.data.clusters?.[0]?.id;
    if (!c || !clusterId) return { ok: false, detail: "thiếu ready_to_air hoặc cluster" };
    const created = await req("/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke schedule ${Date.now()}`,
        contentId: c.id,
        targets: [{ clusterId, include: true }],
      }),
    });
    if (!created.res.ok) return { ok: false, detail: created.data.error };
    scheduleId = created.data.schedule?.id;
    const prev = await req(`/api/schedules/${scheduleId}/resolved-devices`);
    return {
      ok: prev.res.ok && typeof prev.data.count === "number",
      detail: `schedule=${scheduleId?.slice(0, 8)}… devices=${prev.data.count}`,
    };
  });

  await check("POST publish schedule", async () => {
    if (!scheduleId) return { ok: false, detail: "no schedule" };
    const { res, data, ms } = await req(`/api/schedules/${scheduleId}/publish`, { method: "POST" });
    return {
      ok: res.ok && (data.commandsCreated ?? 0) >= 0,
      detail: `commands=${data.commandsCreated} ${data.error || ""}`,
      ms,
    };
  });

  await check("POST cron/tick (jobs)", async () => {
    const { res, data, ms } = await req("/api/cron/tick", { method: "POST", body: "{}" });
    return {
      ok: res.ok && data.ok === true,
      detail: `timeout=${data.timeout?.timedOut} offline=${data.offline?.alertsCreated}`,
      ms,
    };
  });

  await check("GET reports device-uptime", async () => {
    const { res, data, ms } = await req("/api/reports/device-uptime");
    return { ok: res.ok && data.summary, detail: `avg=${data.summary?.avgUptimePct}%`, ms };
  });

  await check("GET reports incidents", async () => {
    const { res, data, ms } = await req("/api/reports/incidents");
    return { ok: res.ok && data.summary, detail: `total=${data.summary?.total}`, ms };
  });

  await check("GET reports broadcasts", async () => {
    const { res, data, ms } = await req("/api/reports/broadcasts");
    return { ok: res.ok && data.summary, detail: `plays=${data.summary?.totalPlays}`, ms };
  });

  await check("GET reports content-funnel", async () => {
    const { res, data, ms } = await req("/api/reports/content-funnel");
    return { ok: res.ok && data.summary, detail: `total=${data.summary?.total}`, ms };
  });

  await check("POST create user + welcome email path", async () => {
    const uname = `smoke_${Date.now().toString(36)}`;
    const meta = await req("/api/meta");
    const orgId =
      (meta.data.orgs || []).find((o: any) => o.type === "commune")?.id || meta.data.myOrg?.id;
    const { res, data, ms } = await req("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: uname,
        fullName: "Smoke User",
        email: `${uname}@mpcis.demo`,
        password: "Demo@123",
        role: "USER",
        orgId,
      }),
    });
    return {
      ok: res.ok && data.user?.username === uname,
      detail: `notified=${JSON.stringify(data.notified)} ${data.message || data.error || ""}`,
      ms,
    };
  });

  // User login + GIS + incident
  await check("POST login user.xa1", async () => {
    jar.clear();
    const { res, data, ms } = await req("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "user.xa1", password: "Demo@123" }),
    });
    return { ok: res.ok, detail: data.user?.username || data.error, ms };
  });

  await check("GET /api/locations (user)", async () => {
    const { res, data, ms } = await req("/api/locations");
    return {
      ok: res.ok && Array.isArray(data.locations),
      detail: `${data.locations?.length || 0} locations`,
      ms,
    };
  });

  await check("POST /api/contents as USER → 403", async () => {
    const { res, data, ms } = await req("/api/contents", {
      method: "POST",
      body: JSON.stringify({ title: "x", bodyPlain: "y" }),
    });
    return { ok: res.status === 403, detail: `${res.status} ${data.error || ""}`, ms };
  });

  await check("POST incident (user)", async () => {
    const devs = await req("/api/devices");
    const deviceId = devs.data.devices?.[0]?.id;
    if (!deviceId) return { ok: false, detail: "no device" };
    const { res, data, ms } = await req("/api/incidents", {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        title: "Smoke sự cố",
        description: "Kiểm thử báo sự cố tự động",
        severity: "low",
      }),
    });
    return { ok: res.ok && data.incident?.id, detail: data.incident?.status || data.error, ms };
  });

  // Sim ack one pending command if any
  await check("Sim poll + ack play (signature check)", async () => {
    const code = "COM-XA1-01";
    const polled = await req(`/api/sim/commands?device_code=${code}`);
    if (!polled.res.ok) return { ok: false, detail: polled.data.error };
    const cmd = (polled.data.commands || [])[0];
    if (!cmd) return { ok: true, detail: "no pending (skip ack)" };
    const ack = await req("/api/sim/commands", {
      method: "POST",
      body: JSON.stringify({ commandId: cmd.id }),
    });
    return {
      ok: ack.res.ok || (ack.res.status === 400 && String(ack.data.error || "").includes("chữ ký")),
      detail: ack.res.ok
        ? `acked ${cmd.commandType} playLog=${ack.data.playLog?.id ? "yes" : "n/a"}`
        : ack.data.error,
      ms: ack.ms,
    };
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed / ${results.length} ===`);
  if (failed) {
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
