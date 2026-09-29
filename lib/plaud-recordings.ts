/**
 * Plaud recordings — the second, simpler Plaud integration.
 *
 * The Embedded SDK path is blocked for a web app: its Transcription API answers
 * `403 DEVICE_MISSING` until a device is bound through the native iOS/Android SDK,
 * and cloud-bind alone returns 404 because the device is not in the registry until
 * the phone binds it locally. See lib/plaud.ts for that chain.
 *
 * This path goes through the user's own Plaud account instead: the pin records,
 * Plaud transcribes, and we read the finished transcript over the same third-party
 * API the Plaud CLI uses. No mobile build, no device binding to our client id.
 */

const BASE_URL = "https://platform.plaud.ai/developer/api";

export class PlaudAccountError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PlaudAccountError";
  }
}

export interface PlaudRecording {
  id: string;
  name: string;
  createdAt: string | null;
  durationSeconds: number | null;
}

function accessToken(): string | null {
  return process.env.PLAUD_USER_TOKEN ?? null;
}

async function plaudGet(path: string): Promise<unknown> {
  const token = accessToken();
  if (!token) {
    throw new PlaudAccountError(
      "PLAUD_USER_TOKEN is not set — run `plaud login` and copy the token into .env.local",
      503
    );
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PlaudAccountError(
      response.status === 401
        ? "Plaud token expired — run `plaud login` again and update PLAUD_USER_TOKEN."
        : `Plaud ${path} → ${response.status}: ${body.slice(0, 300)}`,
      response.status
    );
  }

  return response.json();
}

/** Picks the first present key — the API's field names are not documented. */
function pick(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return null;
}

function asArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    for (const key of ["data", "items", "files", "list", "results"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
      // Some shapes nest one level further, e.g. { data: { items: [...] } }.
      if (value && typeof value === "object") {
        const nested = asArray(value);
        if (nested.length) return nested;
      }
    }
  }
  return [];
}

export async function listRecordings(limit = 10): Promise<PlaudRecording[]> {
  const payload = await plaudGet(`/open/third-party/files/?page=1&page_size=${limit}`);

  return asArray(payload).map((row) => {
    const seconds = pick(row, "duration", "durationSeconds", "file_duration", "length");
    return {
      id: String(pick(row, "id", "file_id", "fileId", "uuid") ?? ""),
      name: String(pick(row, "name", "filename", "title", "file_name") ?? "Untitled recording"),
      createdAt: (pick(row, "created_at", "createdAt", "start_time", "create_time") ?? null) as string | null,
      durationSeconds: typeof seconds === "number" ? Math.round(seconds > 100000 ? seconds / 1000 : seconds) : null,
    };
  });
}

/** Walks whatever shape the transcript comes back in and joins the spoken text. */
function extractText(payload: unknown, depth = 0): string {
  if (depth > 6) return "";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) {
    return payload
      .map((item) => extractText(item, depth + 1))
      .filter(Boolean)
      .join(" ");
  }
  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    // Prefer an explicit text field before recursing, so metadata is not swept in.
    for (const key of ["transcription", "transcript", "text", "content", "sentence"]) {
      if (typeof row[key] === "string" && row[key]) return row[key] as string;
    }
    for (const key of ["data", "blocks", "segments", "sentences", "items", "result"]) {
      if (row[key] !== undefined) {
        const found = extractText(row[key], depth + 1);
        if (found) return found;
      }
    }
  }
  return "";
}

export async function getTranscript(fileId: string): Promise<string> {
  const payload = await plaudGet(`/open/third-party/files/${encodeURIComponent(fileId)}`);
  const text = extractText(payload).replace(/\s+/g, " ").trim();
  if (!text) {
    throw new PlaudAccountError(
      "That recording has no transcript yet — Plaud may still be processing it.",
      409
    );
  }
  return text;
}
