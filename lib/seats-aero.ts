const BASE_URL = "https://seats.aero/partnerapi";

export interface SeatsAeroSearchParams {
  origin: string;
  destination: string;
  cabin: "economy" | "premium" | "business" | "first";
  startDate: string; // YYYY-MM-DD
  endDate: string;
  sources?: string[]; // e.g. ['eurobonus', 'finnair']
}

export interface SeatsAeroRoute {
  ID: string;
  OriginAirport: string;
  OriginRegion: string;
  DestinationAirport: string;
  DestinationRegion: string;
  Distance: number;
  Source: string;
}

export interface SeatsAeroAvailability {
  ID: string;
  RouteID: string;
  /** Origin/destination live here — they are NOT top-level fields. */
  Route: SeatsAeroRoute;
  Date: string;
  ParsedDate: string;
  Source: string;
  CreatedAt: string;
  /** When seats.aero last refreshed this row. Cached data can be weeks old. */
  UpdatedAt: string;
  AvailabilityTrips: SeatsAeroTrip[];
  // Cabin availability booleans
  YAvailable: boolean;
  WAvailable: boolean;
  JAvailable: boolean;
  FAvailable: boolean;
  // Mileage costs (strings; "0" means not offered)
  YMileageCost: string | null;
  WMileageCost: string | null;
  JMileageCost: string | null;
  FMileageCost: string | null;
  /** Taxes are integer MINOR units (cents) of TaxesCurrency, which varies per row. */
  TaxesCurrency: string;
  YTotalTaxes: number | null;
  WTotalTaxes: number | null;
  JTotalTaxes: number | null;
  FTotalTaxes: number | null;
  // Remaining seats
  YRemainingSeats: number | null;
  WRemainingSeats: number | null;
  JRemainingSeats: number | null;
  FRemainingSeats: number | null;
  // Direct flag
  YDirect: boolean;
  WDirect: boolean;
  JDirect: boolean;
  FDirect: boolean;
  // Airlines (comma-separated IATA codes)
  YAirlines: string | null;
  WAirlines: string | null;
  JAirlines: string | null;
  FAirlines: string | null;
}

export interface SeatsAeroTrip {
  ID: string;
  AvailabilityID: string;
  Cabin: string;
  MileageCost: number;
  TotalTax: number;
  RemainingSeats: number;
  Airlines: string;
  Direct: boolean;
  Segments: string;
}

export interface SeatsAeroSearchResponse {
  data: SeatsAeroAvailability[];
  count: number;
  hasMore: boolean;
  cursor: string | null;
  /** Sources whose request failed while others succeeded — partial result. */
  failedSources?: string[];
}

async function fetchOneSource(
  params: SeatsAeroSearchParams,
  source: string | undefined,
  apiKey: string
): Promise<SeatsAeroSearchResponse> {
  const queryParams = new URLSearchParams({
    origin_airport: params.origin,
    destination_airport: params.destination,
    cabin: params.cabin, // seats.aero expects full word: economy, premium, business, first
    start_date: params.startDate,
    end_date: params.endDate,
  });

  if (source) queryParams.set("source", source);

  const response = await fetch(`${BASE_URL}/search?${queryParams.toString()}`, {
    headers: {
      "Partner-Authorization": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`seats.aero API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * seats.aero's `source` parameter accepts exactly ONE program. Passing a
 * comma-separated list returns an empty result set with HTTP 200 — no error,
 * just silently zero rows, which reads as "no award space". So fan out one
 * request per source and merge.
 */
export async function searchAwardFlights(
  params: SeatsAeroSearchParams,
  apiKey: string
): Promise<SeatsAeroSearchResponse> {
  // One upstream request is issued per source, so an unvalidated caller-supplied
  // list is an amplifier: `sources=finnair,finnair,...` x5000 would fire 5000
  // authenticated calls at seats.aero.
  //
  // The cap is what defends against that — NOT an allowlist. seats.aero adds
  // sources faster than this file can track them (SOURCE_NAMES is a display-name
  // table, not a registry: it is missing british, jetblue and aeromexico among
  // others), so filtering against it would silently drop valid programmes and
  // widen a search the caller meant to narrow. Validate the shape, dedupe, cap.
  const sources = [...new Set(params.sources ?? [])]
    .filter((source) => /^[a-z][a-z0-9]{1,30}$/.test(source))
    .slice(0, 8);

  if (sources.length <= 1) {
    return fetchOneSource(params, sources[0], apiKey);
  }

  // allSettled, not all: one 429 or 500 from a single programme must not throw
  // away the rows the other five returned. The search page always sends six
  // sources, so Promise.all turned one flaky upstream into a total failure.
  const settled = await Promise.allSettled(
    sources.map((source) => fetchOneSource(params, source, apiKey))
  );

  const seen = new Set<string>();
  const data: SeatsAeroAvailability[] = [];
  const failedSources: string[] = [];

  settled.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      failedSources.push(sources[index]);
      return;
    }
    for (const row of outcome.value.data ?? []) {
      if (seen.has(row.ID)) continue;
      seen.add(row.ID);
      data.push(row);
    }
  });

  // Every source failing is a real failure — surface it rather than reporting
  // "no award space", which is what an empty result set looks like.
  if (failedSources.length === sources.length) {
    throw new Error(
      `seats.aero returned an error for every source (${failedSources.join(", ")})`
    );
  }

  return { data, count: data.length, hasMore: false, cursor: null, failedSources };
}

export async function getTrips(
  availabilityId: string,
  apiKey: string
): Promise<SeatsAeroTrip[]> {
  const response = await fetch(`${BASE_URL}/availability/${availabilityId}/trips`, {
    headers: {
      "Partner-Authorization": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`seats.aero trips error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

// Parse mileage cost string like "45000" or "45,000" to number
export function parseMileageCost(cost: string | null): number | null {
  if (!cost) return null;
  return parseInt(cost.replace(/,/g, ""), 10) || null;
}

// Source ID to human-readable name
export const SOURCE_NAMES: Record<string, string> = {
  eurobonus: "SAS EuroBonus",
  finnair: "Finnair Plus",
  lufthansa: "Miles & More",
  turkish: "Turkish M&S",
  flyingblue: "Flying Blue",
  avianca: "LifeMiles",
  aeroplan: "Aeroplan",
  american: "AAdvantage",
  delta: "Delta SkyMiles",
  united: "United MP",
  alaska: "Alaska MP",
  qatar: "Qatar Avios",
  singapore: "KrisFlyer",
  emirates: "Skywards",
  etihad: "Etihad Guest",
  qantas: "Qantas FF",
  virginatlantic: "Virgin Atlantic",
  british: "British Airways",
  jetblue: "JetBlue",
  aeromexico: "Aeromexico",
  smiles: "Smiles",
  velocity: "Velocity",
  azul: "Azul",
  connectmiles: "ConnectMiles",
  saudia: "Saudia",
  eurobonusshop: "EuroBonus Shop",
};

export type Cabin = "economy" | "premium" | "business" | "first";

/**
 * seats.aero encodes every cabin as a letter prefix across six parallel fields.
 * Reading them by building a template-literal key needs an `as` cast that
 * suppresses type checking, and the two hand-written copies of that pattern had
 * already drifted — one treated MileageCost as a number (it is a string) and
 * taxes as major units (they are minor), rendering $462.60 as "$46260".
 * This table keeps the mapping in one place and correctly typed by construction.
 */
const CABIN_FIELDS = {
  economy: { available: "YAvailable", miles: "YMileageCost", taxes: "YTotalTaxes", seats: "YRemainingSeats", direct: "YDirect", airlines: "YAirlines" },
  premium: { available: "WAvailable", miles: "WMileageCost", taxes: "WTotalTaxes", seats: "WRemainingSeats", direct: "WDirect", airlines: "WAirlines" },
  business: { available: "JAvailable", miles: "JMileageCost", taxes: "JTotalTaxes", seats: "JRemainingSeats", direct: "JDirect", airlines: "JAirlines" },
  first: { available: "FAvailable", miles: "FMileageCost", taxes: "FTotalTaxes", seats: "FRemainingSeats", direct: "FDirect", airlines: "FAirlines" },
} as const satisfies Record<Cabin, Record<string, keyof SeatsAeroAvailability>>;

export interface CabinData {
  available: boolean;
  miles: number | null;
  /** Already converted out of minor units, in `taxesCurrency`. */
  taxes: number;
  taxesCurrency: string;
  seats: number | null;
  direct: boolean;
  airlines: string | null;
}

export function cabinData(row: SeatsAeroAvailability, cabin: Cabin): CabinData {
  const field = CABIN_FIELDS[cabin];
  return {
    available: row[field.available],
    miles: parseMileageCost(row[field.miles]),
    taxes: (row[field.taxes] ?? 0) / 100,
    taxesCurrency: row.TaxesCurrency,
    seats: row[field.seats],
    direct: row[field.direct],
    airlines: row[field.airlines] || null,
  };
}
