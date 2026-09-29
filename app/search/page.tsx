"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { searchAirports } from "@/data/airport-codes";
import { Airport } from "@/lib/types";
import { CABIN_CLASSES } from "@/lib/constants";
import { SOURCE_NAMES, cabinData, type Cabin, type SeatsAeroAvailability } from "@/lib/seats-aero";
import { formatNumber, cn } from "@/lib/utils";

function AirportInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);

  function handleChange(q: string) {
    setQuery(q);
    onChange(q.toUpperCase());
    const found = searchAirports(q);
    setResults(found);
    setShowDropdown(q.length > 0);
  }

  function selectAirport(airport: Airport) {
    setQuery(airport.code);
    onChange(airport.code);
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-muted mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="TLL"
        className="w-full px-3 py-2.5 border border-border rounded-lg text-lg font-bold uppercase focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((a) => (
            <button
              key={a.code}
              onMouseDown={() => selectAirport(a)}
              className="w-full text-left px-3 py-2 hover:bg-accent-light text-sm"
            >
              <span className="font-bold">{a.code}</span>{" "}
              <span className="text-muted">{a.city}, {a.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getCabinData(result: SeatsAeroAvailability, cabin: string) {
  return cabinData(result, cabin as Cabin);
}

const SEARCH_SOURCES = [
  { id: "eurobonus", label: "SAS EuroBonus" },
  { id: "finnair", label: "Finnair" },
  { id: "lufthansa", label: "Miles & More" },
  { id: "turkish", label: "Turkish" },
  { id: "flyingblue", label: "Flying Blue" },
  { id: "avianca", label: "LifeMiles" },
];

export default function SearchPage() {
  const [origin, setOrigin] = useState("TLL");
  const [destination, setDestination] = useState("");
  const [cabin, setCabin] = useState("business");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>(
    SEARCH_SOURCES.map((s) => s.id)
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  function toggleSource(id: string) {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSearch() {
    if (!origin || !destination || !startDate || !endDate) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        origin,
        destination,
        cabin,
        startDate,
        endDate,
        sources: selectedSources.join(","),
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function setDefaultDates() {
    const now = new Date();
    const start = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }

  // Filter results that have availability in selected cabin
  const availableResults = results
    .filter((r) => getCabinData(r, cabin).available)
    .sort((a, b) => {
      const aData = getCabinData(a, cabin);
      const bData = getCabinData(b, cabin);
      return (aData.miles || 999999) - (bData.miles || 999999);
    });

  return (
    <>
      <Header
        title="Award Search"
        subtitle="Search award flight availability via seats.aero"
      />

      {/* Search form */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <AirportInput label="From" value={origin} onChange={setOrigin} />
          <AirportInput label="To" value={destination} onChange={setDestination} />
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Cabin</label>
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {CABIN_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">From date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">To date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
        {!startDate && (
          <button onClick={setDefaultDates} className="mt-2 text-xs text-accent hover:underline">
            Set dates: 2–8 weeks from now
          </button>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-muted mb-2">Search in programs</label>
          <div className="flex flex-wrap gap-2">
            {SEARCH_SOURCES.map((src) => (
              <button
                key={src.id}
                onClick={() => toggleSource(src.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  selectedSources.includes(src.id)
                    ? "bg-accent text-white border-accent"
                    : "bg-card border-border text-muted hover:border-accent/50"
                )}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="text-muted mt-3">Searching seats.aero...</p>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && !error && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-2xl mb-2">😔</p>
          <h3 className="font-semibold mb-1">No award availability found</h3>
          <p className="text-sm text-muted">Try different dates, a wider date range, or different programs.</p>
        </div>
      )}

      {/* Results */}
      {availableResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {availableResults.length} {cabin} result{availableResults.length !== 1 ? "s" : ""} found
              {totalCount > results.length && <span className="text-muted font-normal text-sm"> (of {totalCount} total)</span>}
            </h2>
            <p className="text-xs text-muted">{origin} → {destination}</p>
          </div>

          <div className="space-y-3">
            {availableResults.map((result) => {
              const data = getCabinData(result, cabin);
              const route = result.Route || {};
              const originApt = route.OriginAirport || "—";
              const destApt = route.DestinationAirport || "—";
              const distance = route.Distance || 0;
              const date = result.Date || "";
              const dateFormatted = date
                ? new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "—";

              return (
                <div
                  key={result.ID}
                  className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold">
                          {originApt} → {destApt}
                        </span>
                        {data.direct && (
                          <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Direct
                          </span>
                        )}
                        {!data.direct && data.available && (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                            Connection
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        <span className="font-medium">{dateFormatted}</span>
                        <span>•</span>
                        <span className="font-medium text-accent">
                          {SOURCE_NAMES[result.Source] || result.Source}
                        </span>
                        {data.airlines && (
                          <>
                            <span>•</span>
                            <span>✈ {data.airlines}</span>
                          </>
                        )}
                        {distance > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatNumber(distance)} km</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <p className="text-2xl font-bold text-accent">
                        {data.miles ? formatNumber(data.miles) : "—"}
                      </p>
                      <p className="text-xs text-muted">
                        miles
                        {data.taxes
                          ? ` + ${data.taxes.toFixed(2)} ${data.taxesCurrency} tax`
                          : ""}
                      </p>
                      {data.seats !== null && data.seats !== undefined && (
                        <p
                          className={cn(
                            "text-xs font-medium mt-1",
                            data.seats <= 2 ? "text-red-500" : data.seats <= 4 ? "text-amber-500" : "text-muted"
                          )}
                        >
                          {data.seats} seat{data.seats !== 1 ? "s" : ""} left
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {results.length > availableResults.length && (
            <p className="text-xs text-muted mt-4 text-center">
              {results.length - availableResults.length} results hidden (no {cabin} class availability)
            </p>
          )}
        </div>
      )}
    </>
  );
}
