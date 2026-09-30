"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import { USER_PROGRAMS } from "@/lib/constants";
import { LoyaltyProgram } from "@/lib/types";
import {
  formatNumber,
  formatCurrency,
  calculatePortfolioValue,
  daysUntil,
} from "@/lib/utils";

const STORAGE_KEY = "optimile_programs";

function loadPrograms(): LoyaltyProgram[] {
  if (typeof window === "undefined") return USER_PROGRAMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as LoyaltyProgram[];
      // Merge saved data with defaults (in case new programs were added)
      return USER_PROGRAMS.map((defaultProg) => {
        const saved = parsed.find((p) => p.id === defaultProg.id);
        return saved
          ? { ...defaultProg, balance: saved.balance, lastUpdated: saved.lastUpdated }
          : defaultProg;
      });
    }
  } catch {
    // ignore
  }
  return USER_PROGRAMS;
}

function savePrograms(programs: LoyaltyProgram[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
}

function freshnessBadge(lastUpdated: string | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (!lastUpdated) {
    return { label: "No data yet", color: "text-gray-400", bgColor: "bg-gray-50" };
  }
  const days = -daysUntil(lastUpdated); // days ago (positive)
  if (days <= 1) return { label: "Fresh", color: "text-emerald-600", bgColor: "bg-emerald-50" };
  if (days <= 7) return { label: `${days}d ago`, color: "text-emerald-600", bgColor: "bg-emerald-50" };
  if (days <= 14) return { label: `${days}d ago`, color: "text-amber-600", bgColor: "bg-amber-50" };
  return { label: `${days}d ago — update!`, color: "text-red-500", bgColor: "bg-red-50" };
}

export default function DashboardPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(USER_PROGRAMS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [mounted, setMounted] = useState(false);

  // Reading localStorage after mount is deliberate: it is not available during
  // server rendering, so seeding state from it directly would desynchronise the
  // server and client markup. The lint rule cannot see that distinction.
  useEffect(() => {
    // Balances can be handed to another device through the URL *hash*. A hash
    // fragment is never sent to the server, so the numbers stay out of request
    // logs and referrer headers — unlike a query parameter, which would expose
    // them to every proxy on the way. The hash is cleared straight after import
    // so it does not linger in browser history.
    const hash = window.location.hash;
    if (hash.startsWith("#b=")) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(hash.slice(3)))) as Record<string, number>;
        savePrograms(
          USER_PROGRAMS.map((program) => ({
            ...program,
            balance: Number(decoded[program.id]) || 0,
            lastUpdated: new Date().toISOString(),
          }))
        );
      } catch {
        // A malformed link should do nothing, not wipe the balances already there.
      }
      window.history.replaceState(null, "", window.location.pathname);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrograms(loadPrograms());
    setMounted(true);
  }, []);

  // Save to localStorage on change
  const persistPrograms = useCallback((updated: LoyaltyProgram[]) => {
    setPrograms(updated);
    savePrograms(updated);
  }, []);

  const totalValue = programs.reduce(
    (sum, p) => sum + calculatePortfolioValue(p.balance, p.baselineCpp),
    0
  );
  const totalPoints = programs.reduce((sum, p) => sum + p.balance, 0);

  function startEdit(program: LoyaltyProgram) {
    setEditingId(program.id);
    setEditValue(program.balance.toString());
  }

  function saveEdit(id: string) {
    const newBalance = parseInt(editValue) || 0;
    const updated = programs.map((p) =>
      p.id === id
        ? { ...p, balance: newBalance, lastUpdated: new Date().toISOString() }
        : p
    );
    persistPrograms(updated);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function openQuickUpdate() {
    // Open all program login pages in new tabs
    programs.forEach((p) => {
      window.open(p.loginUrl, `_blank_${p.id}`);
    });
  }

  function openSingleProgram(url: string) {
    window.open(url, "_blank");
  }

  // Find stale programs (not updated in 7+ days)
  const staleCount = programs.filter((p) => {
    if (!p.lastUpdated) return true;
    return -daysUntil(p.lastUpdated) > 7;
  }).length;

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-card rounded w-48 mb-2" />
        <div className="h-4 bg-card rounded w-80 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Your loyalty programs and estimated portfolio value"
      />

      {/* Stale data banner */}
      {staleCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">
              {staleCount === programs.length
                ? "No balances entered yet"
                : `${staleCount} program${staleCount > 1 ? "s" : ""} need updating`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Click &quot;Quick Update&quot; to open all programs and check your balances
            </p>
          </div>
          <button
            onClick={openQuickUpdate}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shrink-0 ml-4"
          >
            Quick Update — Open All
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-accent-light rounded-xl p-5 border border-accent/20">
          <p className="text-sm text-accent font-medium">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-accent mt-1">
            {formatCurrency(totalValue)}
          </p>
          <p className="text-xs text-muted mt-1">Based on baseline cpp valuations</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-sm text-muted font-medium">Total Points/Miles</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {formatNumber(totalPoints)}
          </p>
          <p className="text-xs text-muted mt-1">Across {programs.length} programs</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-sm text-muted font-medium">Active Statuses</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {programs.filter((p) => p.statusTier).length}
          </p>
          <p className="text-xs text-muted mt-1">
            {programs
              .filter((p) => p.statusTier)
              .map((p) => `${p.shortName} ${p.statusTier}`)
              .join(", ")}
          </p>
        </div>
      </div>

      {/* Program cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Programs</h2>
        <button
          onClick={openQuickUpdate}
          className="text-sm text-accent hover:underline font-medium"
        >
          Open all to check balances →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((program) => {
          const freshness = freshnessBadge(program.lastUpdated);

          return (
            <div
              key={program.id}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{program.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{program.name}</h3>
                    <div className="flex gap-1 mt-0.5">
                      {program.alliance && (
                        <Badge
                          label={program.alliance}
                          variant="alliance"
                          alliance={program.alliance}
                        />
                      )}
                      {program.statusTier && (
                        <Badge label={program.statusTier} variant="status" />
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: program.color + "15",
                    color: program.color,
                  }}
                >
                  {program.baselineCpp}cpp
                </span>
              </div>

              {/* Balance */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted">
                    Balance ({program.currency})
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${freshness.bgColor} ${freshness.color} font-medium`}
                  >
                    {freshness.label}
                  </span>
                </div>

                {editingId === program.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(program.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="flex-1 px-3 py-1.5 border border-border rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent/30"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(program.id)}
                      className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-baseline gap-2 cursor-pointer group"
                    onClick={() => startEdit(program)}
                  >
                    <span className="text-2xl font-bold">
                      {formatNumber(program.balance)}
                    </span>
                    <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      click to edit
                    </span>
                  </div>
                )}
              </div>

              {/* Value + actions */}
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted">Estimated value</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      calculatePortfolioValue(program.balance, program.baselineCpp)
                    )}
                  </span>
                </div>

                {/* Quick action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openSingleProgram(program.loginUrl)}
                    className="flex-1 px-2 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-muted hover:text-accent hover:border-accent/30 transition-colors"
                  >
                    Check balance →
                  </button>
                  <button
                    onClick={() => startEdit(program)}
                    className="px-2 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-muted hover:text-accent hover:border-accent/30 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
