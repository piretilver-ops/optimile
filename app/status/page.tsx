"use client";

import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import { STATUS_MATCHES } from "@/data/status-matches";
import { daysUntil, formatDate } from "@/lib/utils";

export default function StatusMatchPage() {
  const sorted = [...STATUS_MATCHES].sort((a, b) => {
    // Urgent (with deadline) first, sorted by closest deadline
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  return (
    <>
      <Header
        title="Status Match Tracker"
        subtitle="Current status match and challenge opportunities for your programs"
      />

      {/* Your current statuses */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-muted mb-3">YOUR CURRENT STATUSES</h2>
        <div className="flex flex-wrap gap-2">
          <Badge label="SAS EuroBonus Gold" variant="status" />
          <Badge label="Finnair Plus Gold" variant="status" />
          <Badge label="Lufthansa M&M Gold" variant="status" />
          <Badge label="Hilton Diamond" variant="status" />
          <Badge label="Revolut Ultra" variant="default" />
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-4">
        {sorted.map((match) => {
          const days = match.deadline ? daysUntil(match.deadline) : null;
          const isUrgent = days !== null && days <= 14;
          const isExpired = days !== null && days < 0;

          return (
            <div
              key={match.id}
              className={`bg-white rounded-xl border p-5 ${
                isUrgent && !isExpired
                  ? "border-red-300 ring-1 ring-red-200"
                  : "border-border"
              } ${isExpired ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">
                      {match.fromProgram} {match.fromTier} → {match.toProgram}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-accent">
                      {match.toTier}
                    </span>
                    <Badge
                      label={match.matchType.toUpperCase()}
                      variant={match.matchType === 'match' ? 'default' : 'status'}
                    />
                    {isUrgent && !isExpired && (
                      <Badge label={`${days} days left!`} variant="urgent" />
                    )}
                    {isExpired && (
                      <Badge label="EXPIRED" variant="default" />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">{match.cost}</p>
                  {match.deadline && (
                    <p className="text-xs text-muted">
                      Deadline: {formatDate(match.deadline)}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-lg p-3 mb-3">
                <p className="text-sm">{match.requirements}</p>
              </div>

              {match.notes && (
                <p className="text-sm mb-3">{match.notes}</p>
              )}

              <a
                href={match.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-accent hover:underline font-medium"
              >
                Apply / More info →
              </a>
            </div>
          );
        })}
      </div>
    </>
  );
}
