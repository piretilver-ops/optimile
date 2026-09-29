import { createHash } from "crypto";

/**
 * Plaud Embedded — auth → upload → transcribe.
 *
 * The whole chain is plain HTTP, so it runs from a Next.js route handler with no
 * mobile SDK. The one documented catch: Plaud warns that the Transcription API is
 * "unlocked" by binding a device through the Embedded SDK. If that gate is enforced
 * for our client_id, transcribe() throws with the API's own message rather than
 * silently returning empty text — see PlaudGateError below.
 */

const BASE_URL = process.env.PLAUD_BASE_URL ?? "https://platform-us.plaud.ai/developer/api";

export class PlaudGateError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PlaudGateError";
  }
}

export interface PlaudCredentials {
  clientId: string;
  clientSecret: string;
  apiKey: string;
}

export function plaudCredentials(): PlaudCredentials | null {
  const clientId = process.env.PLAUD_CLIENT_ID;
  const clientSecret = process.env.PLAUD_CLIENT_SECRET;
  const apiKey = process.env.PLAUD_API_KEY;
  if (!clientId || !clientSecret || !apiKey) return null;
  return { clientId, clientSecret, apiKey };
}

async function plaudFetch(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.text();
    throw new PlaudGateError(`Plaud ${path} → ${response.status}: ${body.slice(0, 400)}`, response.status);
  }
  return response;
}

/** Application-level token, from client_id + secret_key via HTTP Basic. */
async function getPartnerToken(creds: PlaudCredentials): Promise<string> {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
  const response = await plaudFetch("/oauth/partner/access-token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/** Per-user token — this is what the file upload endpoints accept. */
async function getUserToken(partnerToken: string, userId: string): Promise<string> {
  const response = await plaudFetch("/open/partner/users/access-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${partnerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in: 86400 }),
  });
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

interface PresignedPart {
  PartNumber: number;
  PresignedUrl: string;
}

/** Multipart-uploads the audio to Plaud storage and returns a public download URL. */
async function uploadAudio(
  userToken: string,
  audio: Buffer,
  filetype: string
): Promise<string> {
  const presignResponse = await plaudFetch("/open/partner/files/upload/generate-presigned-urls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filesize: audio.byteLength, filetype }),
  });

  const presign = (await presignResponse.json()) as {
    FileId: string;
    UploadId: string;
    ChunkSize: number;
    Parts: PresignedPart[];
  };

  // Each PUT goes straight to S3 — presigned, so no auth header. Keep the ETags.
  const etags = await Promise.all(
    presign.Parts.map(async (part) => {
      const start = (part.PartNumber - 1) * presign.ChunkSize;
      const chunk = audio.subarray(start, start + presign.ChunkSize);
      const s3Response = await fetch(part.PresignedUrl, { method: "PUT", body: new Uint8Array(chunk) });
      if (!s3Response.ok) {
        throw new PlaudGateError(
          `S3 chunk ${part.PartNumber} upload failed: ${s3Response.status}`,
          s3Response.status
        );
      }
      const etag = s3Response.headers.get("ETag");
      if (!etag) throw new PlaudGateError(`S3 chunk ${part.PartNumber} returned no ETag`, 500);
      return { PartNumber: part.PartNumber, ETag: etag };
    })
  );

  const completeResponse = await plaudFetch("/open/partner/files/upload/complete-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: presign.FileId,
      upload_id: presign.UploadId,
      // The field is `part_list`, and filetype + file_md5 are both required here.
      part_list: etags,
      filetype,
      file_md5: createHash("md5").update(audio).digest("hex"),
    }),
  });

  const complete = (await completeResponse.json()) as { DownloadUrl?: string; download_url?: string };
  const url = complete.DownloadUrl ?? complete.download_url;
  if (!url) throw new PlaudGateError("complete-upload returned no download URL", 500);
  return url;
}

interface TranscriptionTask {
  transcription_id: string;
  status: "PENDING" | "RECEIVED" | "STARTED" | "PROGRESS" | "SUCCESS" | "FAILURE";
  data?: { text?: string; language?: string; duration?: number };
}

/** Submits the audio URL and polls until the task settles. */
async function transcribeUrl(creds: PlaudCredentials, fileUrl: string): Promise<string> {
  const headers = {
    "Content-Type": "application/json",
    "X-Client-Api-Key": creds.apiKey,
    "X-Client-Id": creds.clientId,
  };

  const submitResponse = await plaudFetch("/open/partner/ai/transcriptions/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      file_url: fileUrl,
      params: {
        transcribe: { language: "auto", model: "plaud-fast-whisper" },
        vad: { decode_silence: false },
        diarization: { enabled: false, return_embedding: false },
      },
    }),
  });

  const submitted = (await submitResponse.json()) as TranscriptionTask;

  const PENDING = new Set(["PENDING", "RECEIVED", "STARTED", "PROGRESS"]);
  for (let attempt = 0; attempt < 60; attempt++) {
    const pollResponse = await plaudFetch(
      `/open/partner/ai/transcriptions/${submitted.transcription_id}`,
      { method: "GET", headers }
    );
    const task = (await pollResponse.json()) as TranscriptionTask;

    if (task.status === "SUCCESS") {
      const text = task.data?.text?.trim();
      if (!text) throw new PlaudGateError("Transcription succeeded but returned no text", 500);
      return text;
    }
    if (!PENDING.has(task.status)) {
      throw new PlaudGateError(`Transcription ended with status ${task.status}`, 500);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new PlaudGateError("Transcription timed out after 2 minutes", 504);
}

/** Full chain: raw audio bytes in, transcript text out. */
export async function transcribe(
  creds: PlaudCredentials,
  audio: Buffer,
  filetype: string,
  userId: string
): Promise<string> {
  const partnerToken = await getPartnerToken(creds);
  const userToken = await getUserToken(partnerToken, userId);
  const fileUrl = await uploadAudio(userToken, audio, filetype);
  return transcribeUrl(creds, fileUrl);
}

/**
 * Cheap probe for whether the device-binding gate blocks us, without uploading
 * anything: mint the tokens, then submit a throwaway URL and read the error.
 */
export async function probeAccess(creds: PlaudCredentials): Promise<{
  auth: "ok" | string;
  transcription: "ok" | "gated" | string;
}> {
  let partnerToken: string;
  try {
    partnerToken = await getPartnerToken(creds);
    await getUserToken(partnerToken, "optimile-probe-user");
  } catch (error) {
    console.error("[plaud] auth probe failed:", error);
    return { auth: "failed", transcription: "not reached" };
  }

  try {
    await plaudFetch("/open/partner/ai/transcriptions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Api-Key": creds.apiKey,
        "X-Client-Id": creds.clientId,
      },
      body: JSON.stringify({
        file_url: "https://example.com/optimile-probe.mp3",
        params: { transcribe: { language: "auto", model: "plaud-fast-whisper" } },
      }),
    });
    // Accepting a bogus URL means the endpoint is open to us; it will fail later on fetch.
    return { auth: "ok", transcription: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    // The message carries raw upstream response text; keep it in the log, not
    // in the HTTP response.
    console.error("[plaud] transcription probe failed:", message);
    const gated = /bind|device|unlock|forbidden|not.*allow/i.test(message);
    return { auth: "ok", transcription: gated ? "gated" : "unavailable" };
  }
}
