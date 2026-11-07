export function json(status: number, body: unknown): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function rejectCrossSite(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === "null") return json(403, { ok: false, error: "forbidden" });
  const host = request.headers.get("host");
  try {
    if (!host || new URL(origin).host !== host) return json(403, { ok: false, error: "forbidden" });
  } catch {
    return json(403, { ok: false, error: "forbidden" });
  }
  return null;
}

export async function readPayload(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 20_000) {
    return { __tooLarge: true };
  }
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    return request.json().catch(() => null);
  }
  if (type.includes("form")) {
    const data = await request.formData();
    const obj: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === "string") obj[key] = value;
    }
    return obj;
  }
  return null;
}

export function wantsJson(request: Request): boolean {
  const type = request.headers.get("content-type") || "";
  const accept = request.headers.get("accept") || "";
  return type.includes("application/json") || accept.includes("application/json");
}

export function payloadTooLarge(payload: unknown): boolean {
  return Boolean(payload && typeof payload === "object" && "__tooLarge" in payload);
}
