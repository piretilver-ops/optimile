import Anthropic from "@anthropic-ai/sdk";
import { REVOLUT_PARTNERS, USER_PROGRAMS, SEATS_AERO_SOURCES, POINTS_PURCHASE } from "./constants";
import { STATUS_MATCHES } from "@/data/status-matches";
import { searchAwardFlights, cabinData, SOURCE_NAMES } from "./seats-aero";
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
    name: "evaluate_points_purchase",
    description:
      "When the user is short of points for a redemption, work out whether BUYING the shortfall beats paying cash for the ticket. " +
      "Call this instead of dismissing an option as unaffordable — a shortfall is a price, not a wall. " +
      "Returns the cost of the gap, the all-in cost of the award (bought points + taxes), and how that compares to the cash fare. " +
      "If the configured price is zero or unknown the tool says so; do NOT guess a price.",
    input_schema: {
      type: "object",
      properties: {
        programId: {
          type: "string",
          description: "Program whose points would be bought, e.g. revolut-ultra",
        },
        pointsNeeded: { type: "number", description: "Total points the redemption costs" },
        pointsHeld: { type: "number", description: "Points the user already has available for it" },
        taxesEur: { type: "number", description: "Cash taxes and surcharges paid on top of the award" },
        cashFareEur: { type: "number", description: "What the same ticket costs in cash" },
      },
      required: ["programId", "pointsNeeded", "pointsHeld", "taxesEur", "cashFareEur"],
      additionalProperties: false,
    },
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
    // get_transfer_partners hands the model seven partner programs that are not in
    // USER_PROGRAMS. Silently defaulting their baseline to 1.0 made a mediocre
    // Turkish redemption (own range 1.5-2.5) score as "clearly beats cash", so an
    // unknown id is reported rather than guessed.
    const partner = program
      ? null
      : REVOLUT_PARTNERS.find(
          (rp) => rp.programName.toLowerCase().replace(/[^a-z]/g, "").includes(
            o.programId.toLowerCase().replace(/[^a-z]/g, "")
          )
        );
    const baseline = program?.baselineCpp ?? partner?.baselineCppLow ?? 1.0;
    const baselineSource = program ? "portfolio" : partner ? "transfer partner" : "assumed default";
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
      program: program?.name ?? partner?.programName ?? o.programId,
      baselineSource,
      ...(baselineSource === "assumed default" && {
        warning: `No baseline value is known for "${o.programId}" — 1.0c was assumed, so treat timesBaseline as unreliable and say so.`,
      }),
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

function evaluatePointsPurchase(input: {
  programId: string;
  pointsNeeded: number;
  pointsHeld: number;
  taxesEur: number;
  cashFareEur: number;
}) {
  const option = POINTS_PURCHASE.find((o) => o.programId === input.programId);
  if (!option) {
    return {
      purchasable: false,
      reason: `${input.programId} points cannot be bought — the shortfall has to be earned or the award skipped.`,
    };
  }
  if (option.pricePer1000Eur <= 0) {
    return {
      purchasable: true,
      priceKnown: false,
      reason:
        "This currency can be bought, but no purchase price is configured. Ask the user what Revolut " +
        "currently quotes per 1,000 points before recommending a purchase. Do not estimate it.",
      maxPerTransaction: option.maxPerTransaction,
    };
  }

  const shortfall = Math.max(0, input.pointsNeeded - input.pointsHeld);
  const overCeiling = shortfall > option.maxPerTransaction;

  // What the redemption returns per point. Buying only makes sense when this
  // exceeds the purchase price per point — that comparison is the whole decision.
  const redemptionCpp =
    input.pointsNeeded > 0 ? ((input.cashFareEur - input.taxesEur) * 100) / input.pointsNeeded : 0;

  const scenario = (label: string, pricePer1000: number) => {
    const purchaseCost = (shortfall / 1000) * pricePer1000;
    const allInCost = purchaseCost + input.taxesEur;
    return {
      label,
      pricePer1000Eur: pricePer1000,
      purchaseCostPerPointCents: Number((pricePer1000 / 10).toFixed(2)),
      purchaseCostEur: Number(purchaseCost.toFixed(2)),
      allInCostEur: Number(allInCost.toFixed(2)),
      savingVsCashEur: Number((input.cashFareEur - allInCost).toFixed(2)),
      // Informational only: whether stockpiling points at this price would pay off
      // in general. It must NOT gate the buy-the-gap decision — see the verdict below.
      worthStockpilingSpeculatively: redemptionCpp > pricePer1000 / 10,
    };
  };

  const scenarios = [scenario("one-off purchase", option.pricePer1000Eur)];
  if (option.recurringPricePer1000Eur !== null) {
    scenarios.push(scenario("monthly standing order", option.recurringPricePer1000Eur));
  }

  const best = scenarios.reduce((a, b) => (b.savingVsCashEur > a.savingVsCashEur ? b : a));

  // The decision is MARGINAL: only `shortfall` points are being bought, and the
  // points already held are sunk. So the verdict must come from the all-in
  // comparison (cost of the gap + taxes vs the cash fare), never from average
  // cents-per-point — with a near-full balance the average can sit below the
  // purchase price while buying the last few points is obviously right.
  let verdict: string;
  if (shortfall === 0) verdict = "no purchase needed — the balance already covers it";
  else if (best.savingVsCashEur <= 0)
    verdict = `not worth buying — the gap costs ${best.purchaseCostEur.toFixed(0)} EUR plus ${input.taxesEur.toFixed(0)} EUR taxes, more than the ${input.cashFareEur.toFixed(0)} EUR cash fare`;
  else
    verdict = `worth buying via ${best.label} — ${best.allInCostEur.toFixed(0)} EUR all-in against a ${input.cashFareEur.toFixed(0)} EUR cash fare, saving ${best.savingVsCashEur.toFixed(0)} EUR`;

  return {
    purchasable: true,
    priceKnown: true,
    shortfall,
    redemptionValuePerPointCents: Number(redemptionCpp.toFixed(2)),
    scenarios,
    bestScenario: best.label,
    cashFareEur: Number(input.cashFareEur.toFixed(2)),
    taxesEur: Number(input.taxesEur.toFixed(2)),
    exceedsPerTransactionCeiling: overCeiling,
    ceilingNote: overCeiling
      ? `Shortfall exceeds the ${option.maxPerTransaction.toLocaleString("en-US")} per-transaction ceiling — would need more than one purchase.`
      : null,
    verdict,
    notes: option.notes,
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
          .map((row) => ({ row, cabin: cabinData(row, input.cabin) }))
          .filter(({ cabin }) => cabin.available)
          .map(({ row, cabin }) => ({
            date: row.Date,
            route: `${row.Route.OriginAirport}-${row.Route.DestinationAirport}`,
            program: SOURCE_NAMES[row.Source] ?? row.Source,
            source: row.Source,
            miles: cabin.miles,
            taxes: cabin.taxes,
            taxesCurrency: cabin.taxesCurrency,
            seatsLeft: cabin.seats,
            direct: cabin.direct,
            airlines: cabin.airlines,
            lastSeenByProvider: row.UpdatedAt?.slice(0, 10) ?? null,
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

      case "evaluate_points_purchase":
        return JSON.stringify(
          evaluatePointsPurchase(input as Parameters<typeof evaluatePointsPurchase>[0])
        );

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
