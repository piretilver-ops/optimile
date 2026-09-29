import { NextRequest, NextResponse } from "next/server";
import { listRecordings, getTranscript, PlaudAccountError } from "@/lib/plaud-recordings";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

function handle(error: unknown) {
  if (error instanceof PlaudAccountError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Plaud request failed";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** GET /api/plaud — recent recordings. GET ?id=… — one transcript. */
export async function GET(request: NextRequest) {
  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 429 });

  const fileId = request.nextUrl.searchParams.get("id");

  try {
    if (fileId) {
      return NextResponse.json({ text: await getTranscript(fileId) });
    }
    return NextResponse.json({ recordings: await listRecordings(10) });
  } catch (error) {
    return handle(error);
  }
}
