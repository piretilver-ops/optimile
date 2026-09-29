"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";

// Hardcoded sample deals (will be replaced by scraper later)
const SAMPLE_DEALS = [
  {
    id: "1",
    title: "Finnair: Buy Avios with 20% bonus",
    description: "Purchase Avios through Finnair Plus with a 20% bonus on all purchases. Brings effective cost to ~1.3 cents per Avios.",
    program: "Finnair Plus",
    dealType: "buy_miles" as const,
    url: "https://www.finnair.com/en/finnair-plus/buy-avios",
    expiresAt: "2026-04-30",
    quality: "good",
  },
  {
    id: "2",
    title: "Turkish Miles&Smiles: Up to 100% bonus on purchased miles",
    description: "Buy Turkish Miles with up to 100% bonus. At max bonus, cost drops to ~1.5 cents/mile. Best value for Star Alliance business class.",
    program: "Turkish Miles&Smiles",
    dealType: "buy_miles" as const,
    url: "https://www.turkishairlines.com/en-int/miles-and-smiles/buy-miles/",
    expiresAt: "2026-05-15",
    quality: "excellent",
  },
  {
    id: "3",
    title: "Revolut: 20% Avios transfer bonus",
    description: "Transfer RevPoints to Avios and get 20% extra. 10,000 RevPoints = 12,000 Avios.",
    program: "Revolut",
    dealType: "transfer_bonus" as const,
    url: "https://www.revolut.com/revpoints",
    expiresAt: null,
    quality: "excellent",
  },
  {
    id: "4",
    title: "Avianca LifeMiles: 125% bonus on purchased miles",
    description: "Buy LifeMiles with 125% bonus. Effective cost ~1.2 cpp. Best rates for Star Alliance partner awards with no surcharges.",
    program: "Avianca LifeMiles",
    dealType: "buy_miles" as const,
    url: "https://www.lifemiles.com/buy-miles",
    expiresAt: "2026-04-20",
    quality: "excellent",
  },
  {
    id: "5",
    title: "Flying Blue: April Promo Rewards up to 50% off",
    description: "Selected routes at 50% off in miles. AMS-NBO 26,500 miles in Business instead of 53,000.",
    program: "Flying Blue",
    dealType: "promo" as const,
    url: "https://www.flyingblue.com/en/promo-rewards",
    expiresAt: "2026-04-30",
    quality: "good",
  },
  {
    id: "6",
    title: "Hilton: Buy points with 100% bonus",
    description: "Purchase Hilton Honors points at 0.5 cents each with 100% bonus (effectively 0.25 cpp). Great for free nights at premium properties.",
    program: "Hilton Honors",
    dealType: "buy_miles" as const,
    url: "https://www.hilton.com/en/hilton-honors/buy-points/",
    expiresAt: "2026-05-31",
    quality: "good",
  },
];

const DEAL_TYPES = ["all", "buy_miles", "transfer_bonus", "promo"] as const;
const TYPE_LABELS: Record<string, string> = {
  all: "All Deals",
  buy_miles: "Buy Miles",
  transfer_bonus: "Transfer Bonus",
  promo: "Promos",
};

export default function DealsPage() {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? SAMPLE_DEALS
      : SAMPLE_DEALS.filter((d) => d.dealType === filter);

  return (
    <>
      <Header
        title="Deals & Promotions"
        subtitle="Current mile purchase deals, transfer bonuses, and promos"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {DEAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? "bg-accent text-white"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> These are sample deals for demo purposes. Connect your seats.aero API key in Settings to enable automatic deal tracking from FrequentFlyerBonuses.com.
        </p>
      </div>

      {/* Deal cards */}
      <div className="space-y-4">
        {filtered.map((deal) => (
          <div
            key={deal.id}
            className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
              deal.quality === "excellent"
                ? "border-emerald-300"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{deal.title}</h3>
                {deal.quality === "excellent" && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    HOT
                  </span>
                )}
              </div>
              <Badge
                label={TYPE_LABELS[deal.dealType] || deal.dealType}
                variant="default"
              />
            </div>

            <p className="text-sm text-muted mb-3">{deal.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs bg-card px-2 py-1 rounded-full text-muted font-medium">
                  {deal.program}
                </span>
                {deal.expiresAt && (
                  <span className="text-xs text-muted">
                    Expires: {new Date(deal.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline font-medium"
              >
                View deal →
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
