import Anthropic from "@anthropic-ai/sdk";
import { REVOLUT_PARTNERS, USER_PROGRAMS, SEATS_AERO_SOURCES } from "./constants";
import { STATUS_MATCHES } from "@/data/status-matches";
import { searchAwardFlights, parseMileageCost, SOURCE_NAMES } from "./seats-aero";
import { LoyaltyProgram } from "./types";

/**
 * Tools the agent can call. Anything involving arithmetic lives here rather than
 * in the model's head — value_redemption is the only place cents-per-point is
 * computed, so a recommendation can always be traced back to real numbers.
 */
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_award_availability",
    description:
      "Search live award-seat availability via seats.aero for one origin and up to 6 destinations. " +
      "Returns, per date, which programs have seats, the mileage cost, the taxes, how many seats are left, " +
      "and when the provider last refreshed that row. " +
      "Use this before recommending any specific flight — never guess availability or mileage cost. " +
      "Two things to watch: taxes come back in `taxesCurrency`, which is often USD or CAD rather than EUR — " +
      "convert before passing them to value_redemption. And coverage is thin for small airports: " +
      "Tallinn (TLL) returns nothing on most long-haul routes, so also try HEL, CPH, ARN, RIX, WAW or FRA as origins.",
    input_schema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Origin IATA code, e.g. TLL or HEL" },
        destinations: {
          type: "array",
          items: { type: "string" },
          description: "1-6 destination IATA codes to check in parallel",
        },
        cabin: {
          type: "string",
          enum: ["economy", "premium", "business", "first"],
          description: "Cabin class",
        },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        programs: {
          type: "array",
          items: { type: "string" },
          description:
            "seats.aero source ids to search, e.g. eurobonus, finnair, lufthansa, turkish, flyingblue, avianca. Omit to search all.",
        },
      },
      required: ["origin", "destinations", "cabin", "startDate", "endDate"],
      additionalProperties: false,
    },
  },
  {
    name: "get_transfer_partners",
    description:
      "List the programs the user's RevPoints (Revolut Ultra) can transfer into, with transfer ratios, " +
      "typical value ranges and known sweet spots. Use this when flexible points could beat a direct airline balance.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_status_matches",
    description:
      "List currently open status matches and challenges the user qualifies for, with deadlines and requirements. " +
      "Use this when the user asks about status, lounge access, or when a deadline is close enough to matter.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "value_redemption",
    description:
      "Compute cents-per-point for one or more candidate redemptions and rank them. " +
      "ALWAYS call this instead of doing the arithmetic yourself. " +
      "cpp = (cashFareEur - taxesEur) * 100 / milesRequired. " +
      "The verdict compares cpp against the program's own baseline value.",
    input_schema: {
      type: "object",
      properties: {
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Short human label, e.g. 'TLL-JFK business via SAS'" },
              programId: {
                type: "string",
                description:
                  "One of: sas-eurobonus, finnair-plus, miles-and-more, hilton-honors, revolut-ultra",
              },
              milesRequired: { type: "number" },
              taxesEur: { type: "number", description: "Cash surcharges and taxes paid on top of the miles" },
              cashFareEur: { type: "number", description: "What the same ticket costs in cash" },
            },
            required: ["label", "programId", "milesRequired", "taxesEur", "cashFareEur"],
            additionalProperties: false,
          },
        },
      },
      required: ["options"],
      additionalProperties: false,
    },
  },
];

/** Server-side tool: lets the agent look up real cash fares to anchor the cpp denominator. */
export const WEB_SEARCH_TOOL = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 6,
} as const;

type ValueOption = {
  label: string;
  programId: string;
  milesRequired: number;
  taxesEur: number;
  cashFareEur: number;
};

function valueRedemption(options: ValueOption[]) {
  const scored = options.map((o) => {
    const program = USER_PROGRAMS.find((p) => p.id === o.programId);
    const baseline = program?.baselineCpp ?? 1.0;
    const netCash = o.cashFareEur - o.taxesEur;
    const cpp = o.milesRequired > 0 ? (netCash * 100) / o.milesRequired : 0;
    const ratio = baseline > 0 ? cpp / baseline : 0;
    let verdict: string;
    if (ratio >= 2) verdict = "excellent — well above baseline, book it";
    else if (ratio >= 1.3) verdict = "good — clearly beats cash";
    else if (ratio >= 1) verdict = "fair — roughly baseline value";
    else verdict = "poor — pay cash and keep the points";

    return {
      label: o.label,
      program: program?.name ?? o.programId,
      milesRequired: o.milesRequired,
      taxesEur: Number(o.taxesEur.toFixed(2)),
      cashFareEur: Number(o.cashFareEur.toFixed(2)),
      netCashSavedEur: Number(netCash.toFixed(2)),
      cpp: Number(cpp.toFixed(2)),
      baselineCpp: baseline,
      timesBaseline: Number(ratio.toFixed(2)),
      verdict,
    };
  });

  scored.sort((a, b) => b.cpp - a.cpp);
  return {
    ranked: scored,
    note: "cpp = (cashFareEur - taxesEur) * 100 / milesRequired. Computed in code, not estimated.",
  };
}

async function searchAvailability(
  input: {
    origin: string;
    destinations: string[];
    cabin: "economy" | "premium" | "business" | "first";
    startDate: string;
    endDate: string;
    programs?: string[];
  },
  apiKey: string | undefined
) {
  if (!apiKey) {
    return { error: "seats.aero API key not configured on the server." };
  }

  const cabinKey = { economy: "Y", premium: "W", business: "J", first: "F" }[input.cabin];
  const destinations = input.destinations.slice(0, 6);

  const results = await Promise.all(
    destinations.map(async (destination) => {
      try {
        const data = await searchAwardFlights(
          {
            origin: input.origin.toUpperCase(),
            destination: destination.toUpperCase(),
            cabin: input.cabin,
            startDate: input.startDate,
            endDate: input.endDate,
            sources: input.programs,
          },
          apiKey
        );

        const flights = (data.data || [])
          .filter((a) => a[`${cabinKey}Available` as keyof typeof a])
          .map((a) => ({
            date: a.Date,
            route: `${a.Route.OriginAirport}-${a.Route.DestinationAirport}`,
            program: SOURCE_NAMES[a.Source] ?? a.Source,
            source: a.Source,
            miles: parseMileageCost(a[`${cabinKey}MileageCost` as keyof typeof a] as string | null),
            // seats.aero reports taxes as minor units of a per-row currency — not always EUR.
            taxes: ((a[`${cabinKey}TotalTaxes` as keyof typeof a] as number | null) ?? 0) / 100,
            taxesCurrency: a.TaxesCurrency,
            seatsLeft: a[`${cabinKey}RemainingSeats` as keyof typeof a] ?? null,
            direct: a[`${cabinKey}Direct` as keyof typeof a] ?? false,
            airlines: a[`${cabinKey}Airlines` as keyof typeof a] || null,
            lastSeenByProvider: a.UpdatedAt?.slice(0, 10) ?? null,
          }))
          .filter((f) => f.miles !== null && f.miles > 0)
          .sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0))
          .slice(0, 12);

        return {
          destination,
          found: flights.length,
          flights,
          ...(flights.length === 0 && {
            note:
              `seats.aero has no cached award data for ${input.origin.toUpperCase()}-${destination.toUpperCase()}. ` +
              `Coverage is thin for small airports (Tallinn included). Retry from a hub the user can reach ` +
              `by a cheap positioning flight — HEL, CPH, ARN, FRA, WAW or RIX — before concluding nothing is available.`,
          }),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        return { destination, error: message };
      }
    })
  );

  return { cabin: input.cabin, window: `${input.startDate} → ${input.endDate}`, results };
}

export async function executeTool(
  name: string,
  input: unknown,
  ctx: { seatsAeroKey?: string }
): Promise<string> {
  try {
    switch (name) {
      case "search_award_availability":
        return JSON.stringify(
          await searchAvailability(input as Parameters<typeof searchAvailability>[0], ctx.seatsAeroKey)
        );

      case "get_transfer_partners":
        return JSON.stringify({
          source: "Revolut Ultra RevPoints",
          partners: REVOLUT_PARTNERS.map((p) => ({
            program: p.programName,
            ratio: `${p.transferRatio}:1`,
            typicalCppRange: `${p.baselineCppLow}–${p.baselineCppHigh}`,
            bestUse: p.bestUse,
            sweetSpot: p.sweetSpotExample,
            sweetSpotCpp: p.sweetSpotCpp,
          })),
        });

      case "get_status_matches":
        return JSON.stringify({
          today: new Date().toISOString().slice(0, 10),
          matches: STATUS_MATCHES.map((m) => ({
            from: `${m.fromProgram} ${m.fromTier}`,
            to: `${m.toProgram} → ${m.toTier}`,
            type: m.matchType,
            cost: m.cost,
            deadline: m.deadline,
            requirements: m.requirements,
            notes: m.notes,
            url: m.url,
          })),
        });

      case "value_redemption":
        return JSON.stringify(valueRedemption((input as { options: ValueOption[] }).options));

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return JSON.stringify({ error: message });
  }
}

/** Renders the user's actual holdings into the system prompt so the agent starts grounded. */
export function portfolioSummary(programs: LoyaltyProgram[]): string {
  const lines = programs.map((p) => {
    const balance = p.balance > 0 ? `${p.balance.toLocaleString("en-US")} ${p.currency}` : "balance not entered";
    const status = p.statusTier ? `, status ${p.statusTier}` : "";
    const alliance = p.alliance ? `, ${p.alliance}` : "";
    return `- ${p.name} (id: ${p.id}): ${balance}${status}${alliance}, baseline ${p.baselineCpp}¢/pt`;
  });

  const sources = Object.entries(SEATS_AERO_SOURCES)
    .map(([k, v]) => `${k}→${v}`)
    .join(", ");

  return `${lines.join("\n")}\n\nseats.aero source ids for these programs: ${sources}`;
}
