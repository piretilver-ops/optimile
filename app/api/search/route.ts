import { NextRequest, NextResponse } from "next/server";
import { searchAwardFlights } from "@/lib/seats-aero";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // This route spends the seats.aero quota on every call, same as /api/agent.
  const limit = checkRateLimit(clientIp(request));
  if (!limit.ok) {
    return NextResponse.json({ error: limit.reason }, { status: 429 });
  }

  const searchParams = request.nextUrl.searchParams;

  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const cabin = searchParams.get("cabin") || "business";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const sources = searchParams.get("sources");

  if (!origin || !destination || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters: origin, destination, startDate, endDate" },
      { status: 400 }
    );
  }

  const apiKey = process.env.SEATS_AERO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "seats.aero API key not configured" },
      { status: 500 }
    );
  }

  try {
    const results = await searchAwardFlights(
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        cabin: cabin as "economy" | "premium" | "business" | "first",
        startDate,
        endDate,
        sources: sources ? sources.split(",") : undefined,
      },
      apiKey
    );

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
