"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

export default function SettingsPage() {
  const [seatsKey, setSeatsKey] = useState("");
  const [kiwiKey, setKiwiKey] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // For now, store in localStorage (will move to Supabase)
    localStorage.setItem("seats_aero_key", seatsKey);
    localStorage.setItem("kiwi_api_key", kiwiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <Header
        title="Settings"
        subtitle="Configure API keys and preferences"
      />

      <div className="max-w-2xl space-y-6">
        {/* seats.aero */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-1">seats.aero API Key</h2>
          <p className="text-sm text-muted mb-4">
            Required for award flight search. Get a Pro subscription at{" "}
            <a
              href="https://seats.aero"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              seats.aero
            </a>{" "}
            ($9.99/month) and find your API key in account settings.
          </p>
          <input
            type="password"
            value={seatsKey}
            onChange={(e) => setSeatsKey(e.target.value)}
            placeholder="pro_xxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Kiwi.com */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-1">Kiwi.com Tequila API Key</h2>
          <p className="text-sm text-muted mb-4">
            Optional. Used for cash fare comparison. Free to register at{" "}
            <a
              href="https://tequila.kiwi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              tequila.kiwi.com
            </a>
          </p>
          <input
            type="password"
            value={kiwiKey}
            onChange={(e) => setKiwiKey(e.target.value)}
            placeholder="Your Tequila API key"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Data sources info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-3">Data Sources</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Award search (seats.aero)</span>
              <span className={seatsKey ? "text-emerald-600 font-medium" : "text-red-500"}>
                {seatsKey ? "Connected" : "Not connected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cash fares (Kiwi.com)</span>
              <span className={kiwiKey ? "text-emerald-600 font-medium" : "text-muted"}>
                {kiwiKey ? "Connected" : "Optional"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Revolut calculator</span>
              <span className="text-emerald-600 font-medium">No key needed</span>
            </div>
            <div className="flex justify-between">
              <span>Status match data</span>
              <span className="text-emerald-600 font-medium">Built-in</span>
            </div>
            <div className="flex justify-between">
              <span>Deal alerts</span>
              <span className="text-emerald-600 font-medium">Built-in (sample data)</span>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </>
  );
}
