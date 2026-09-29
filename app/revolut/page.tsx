"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { REVOLUT_PARTNERS } from "@/lib/constants";
import { formatNumber, formatCurrency, cppBgColor } from "@/lib/utils";

export default function RevolutOptimizerPage() {
  const [points, setPoints] = useState(10000);

  // Sort partners by sweet spot CPP (best value first)
  const rankedPartners = [...REVOLUT_PARTNERS].sort(
    (a, b) => b.sweetSpotCpp - a.sweetSpotCpp
  );

  return (
    <>
      <Header
        title="Revolut Points Optimizer"
        subtitle="Find the best transfer destination for your RevPoints (all transfers 1:1)"
      />

      {/* Points input */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <label className="block text-sm font-medium text-muted mb-2">
          How many RevPoints do you want to transfer?
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1000}
            max={200000}
            step={1000}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value))}
            className="flex-1 accent-accent"
          />
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            className="w-28 px-3 py-2 border border-border rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>1,000</span>
          <span>200,000</span>
        </div>
      </div>

      {/* Partner ranking */}
      <h2 className="text-lg font-semibold mb-4">
        Transfer Partners (ranked by best value)
      </h2>
      <div className="space-y-3">
        {rankedPartners.map((partner, index) => {
          const transferAmount = points * partner.transferRatio;
          const valueLow = (transferAmount * partner.baselineCppLow) / 100;
          const valueHigh = (transferAmount * partner.baselineCppHigh) / 100;
          const sweetSpotValue = (transferAmount * partner.sweetSpotCpp) / 100;

          return (
            <div
              key={partner.programName}
              className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                index === 0 ? "border-emerald-300 ring-1 ring-emerald-200" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{partner.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{partner.programName}</h3>
                      {index === 0 && (
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                          BEST VALUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{partner.bestUse}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">You get</p>
                  <p className="text-lg font-bold">
                    {formatNumber(transferAmount)}{" "}
                    <span className="text-sm font-normal text-muted">
                      {partner.currency}
                    </span>
                  </p>
                </div>
              </div>

              {/* Value range */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-card rounded-lg p-3">
                  <p className="text-xs text-muted">Baseline value</p>
                  <p className="font-semibold text-sm">
                    {formatCurrency(valueLow)} – {formatCurrency(valueHigh)}
                  </p>
                  <p className="text-xs text-muted">
                    {partner.baselineCppLow}–{partner.baselineCppHigh} cpp
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 border ${cppBgColor(partner.sweetSpotCpp)}`}
                >
                  <p className="text-xs text-muted">Sweet spot value</p>
                  <p className="font-bold text-sm">{formatCurrency(sweetSpotValue)}</p>
                  <p className="text-xs font-semibold">{partner.sweetSpotCpp} cpp</p>
                </div>
                <div className="bg-card rounded-lg p-3">
                  <p className="text-xs text-muted">Transfer ratio</p>
                  <p className="font-semibold text-sm">
                    {partner.transferRatio}:1
                  </p>
                  <p className="text-xs text-muted">instant transfer</p>
                </div>
              </div>

              {/* Sweet spot example */}
              <div className="mt-3 bg-card rounded-lg p-3">
                <p className="text-xs font-medium text-muted mb-1">Sweet spot example</p>
                <p className="text-sm">{partner.sweetSpotExample}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
