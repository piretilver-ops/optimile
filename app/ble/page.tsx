"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

/**
 * Serial-number finder for the loaner Plaud device.
 *
 * Plaud's cloud-bind endpoint needs the device serial number, but the NotePin has
 * none printed on it. BLE peripherals advertise a name, and Plaud devices normally
 * carry the serial (or its tail) in that name — so Web Bluetooth can read it
 * without any native app or SDK. Chrome/Edge on desktop only; Safari has no
 * Web Bluetooth.
 */

type Found = { name: string; id: string };

export default function BlePage() {
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(
    () => typeof navigator !== "undefined" && "bluetooth" in navigator
  );

  async function scan() {
    setError(null);
    setFound(null);
    try {
      // acceptAllDevices so nothing is filtered out — we only want to read the name.
      const device = await (
        navigator as Navigator & {
          bluetooth: {
            requestDevice(options: {
              acceptAllDevices?: boolean;
              optionalServices?: string[];
            }): Promise<{ name?: string; id: string }>;
          };
        }
      ).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [] });

      setFound({ name: device.name ?? "(no advertised name)", id: device.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan cancelled or failed");
    }
  }

  const digits = found?.name.replace(/\D/g, "") ?? "";
  const looksLikeSerial = /^88[12]\d{13}$/.test(digits);

  return (
    <div className="max-w-2xl">
      <Header
        title="Find the Plaud serial number"
        subtitle="Reads the device's advertised Bluetooth name — no app, no SDK."
      />

      {!supported ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          This browser has no Web Bluetooth. Use Chrome or Edge on desktop.
        </p>
      ) : (
        <>
          <ol className="text-sm space-y-2 mb-5 list-decimal pl-5">
            <li>Wake the Plaud device so it is advertising (press its button).</li>
            <li>Click Scan, then pick the Plaud entry in the browser&apos;s device chooser.</li>
            <li>Copy whatever name shows up below.</li>
          </ol>

          <button
            onClick={scan}
            className="px-5 py-3 rounded-xl bg-accent text-white text-sm font-medium"
          >
            Scan for Bluetooth devices
          </button>
        </>
      )}

      {found && (
        <div className="mt-5 rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <p>
            <span className="text-muted">Advertised name: </span>
            <span className="font-mono font-semibold">{found.name}</span>
          </p>
          <p>
            <span className="text-muted">Digits in name: </span>
            <span className="font-mono">{digits || "(none)"}</span>
          </p>
          <p
            className={
              looksLikeSerial ? "text-emerald-700 font-medium" : "text-amber-700"
            }
          >
            {looksLikeSerial
              ? "That matches the serial format (881/882 + 13 digits) — use it to bind."
              : "Not a full serial. It may be a short tail — the Plaud table can map it to the full number."}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
