import { NextRequest, NextResponse } from "next/server";
import { plaudCredentials, transcribe, probeAccess, PlaudGateError } from "@/lib/plaud";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const maxDuration = 300;

/** GET /api/voice — diagnostic probe: are the credentials good, and is transcription gated? */
export async function GET(request: NextRequest) {
  // Each probe mints two Plaud tokens and submits a transcription — real spend
  // on the owner's account, so it gets the same cap as every other route.
  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 429 });

  const creds = plaudCredentials();
  if (!creds) {
    return NextResponse.json(
      { configured: false, missing: "PLAUD_CLIENT_ID, PLAUD_CLIENT_SECRET and PLAUD_API_KEY" },
      { status: 200 }
    );
  }
  return NextResponse.json({ configured: true, ...(await probeAccess(creds)) });
}

/** POST /api/voice — audio in, transcript out. */
export async function POST(request: NextRequest) {
  const creds = plaudCredentials();
  if (!creds) {
    return NextResponse.json({ error: "Plaud credentials not configured" }, { status: 503 });
  }

  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 429 });

  const formData = await request.formData();
  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file in request" }, { status: 400 });
  }

  // Plaud accepts mp3, wav, ogg and opus only — webm/mp4/m4a are rejected with
  // FILE_TYPE_INVALID, so the client converts to WAV before sending.
  const filetype = file.type.includes("wav")
    ? "wav"
    : file.type.includes("ogg") || file.type.includes("opus")
      ? "ogg"
      : "mp3";

  try {
    const audio = Buffer.from(await file.arrayBuffer());
    const text = await transcribe(creds, audio, filetype, "optimile-demo-user");
    return NextResponse.json({ text });
  } catch (error) {
    // Upstream messages embed up to 400 bytes of Plaud's raw response, which is
    // internal detail no anonymous caller should see. Log it, return the gist.
    console.error("[voice] transcription failed:", error);

    if (error instanceof PlaudGateError) {
      const gated = error.status === 403;
      return NextResponse.json(
        {
          error: gated
            ? "Voice transcription needs a Plaud device bound through their mobile SDK, which this web build cannot do."
            : "Transcription is unavailable right now.",
        },
        { status: error.status >= 400 ? error.status : 500 }
      );
    }
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
