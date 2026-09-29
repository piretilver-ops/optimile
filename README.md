# Optimile

**An agent that tells you the best way to spend your airline points.**

Built at the AI Conference 2026 Day ZERO Hack Day, San Francisco.

You have points scattered across five loyalty programs. None of them is enough on its
own, the transfer charts are opaque, award seats appear and vanish hourly, and
"cents per point" is meaningless unless you know what the ticket costs in cash.
Working it out properly takes about forty minutes of manual research, so most people
never do it and the points quietly expire.

Optimile does it in three minutes and shows its work.

## What it actually does

Ask it something like *"I'm in San Francisco, get me home to Europe — what's the best
use of my points?"* and it will:

1. Search **live award availability** (seats.aero) across a dozen candidate gateways
2. Check what your **flexible points** can transfer into, and at what ratio
3. Look up the **real cash fare** on the web, because cpp without a cash anchor is a
   made-up number
4. Rank the candidates and recommend one — plus the runner-up, and what *not* to do

A real answer from a real run, on modest balances (11k SAS, 49k Finnair, 17k
Lufthansa, 30k RevPoints):

> SAS nonstop SFO→Copenhagen, 30,000 EuroBonus points, **€0 in taxes**, nine dates
> available. You only hold 11,344 EuroBonus points — but RevPoints transfer 1:1, so
> 18,656 of them close the gap exactly. 2.07¢ per point, 1.7× baseline.
>
> Business class isn't happening: Lufthansa wants 88,850 miles plus €1,280 in
> surcharges, and the cheap 57,500-mile American rows show **zero seats left** —
> they're phantom inventory.

## Two design decisions

**The model never does the arithmetic.** Cents-per-point is computed by the
`value_redemption` tool, in code. The agent gathers inputs and calls it; the ranking
comes back from a function. Every recommendation traces to real numbers.

**It fails loudly.** When the seats.aero subscription lapsed mid-build, the agent's
answer was *"I have zero live availability and I'm not going to invent it"* — then it
said exactly what to fix. An agent that recommends a flight that doesn't exist is
worse than no agent at all.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

| Variable | Needed for | Where |
|---|---|---|
| `ANTHROPIC_API_KEY` | the agent | [console.anthropic.com](https://console.anthropic.com) |
| `SEATS_AERO_API_KEY` | live award search | [seats.aero](https://seats.aero) — paid Partner API plan |
| `PLAUD_CLIENT_ID` / `PLAUD_CLIENT_SECRET` / `PLAUD_API_KEY` | voice input (optional) | [portal.plaud.ai](https://portal.plaud.ai) |

Balances live in your browser's `localStorage` — nothing is sent anywhere except to
the APIs above, and the hosted demo never sees anyone else's numbers.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Claude Opus 5 with tool use, streamed over SSE.

## Notes for anyone building on seats.aero

Three things cost real debugging time, all of them silent failures:

- **`source` accepts exactly one program.** A comma-separated list returns HTTP 200
  with zero rows — which reads as "no award space" rather than "bad request". Fan out
  one request per source and merge.
- **Origin and destination are nested under `Route`**, not top-level.
- **Taxes are `TotalTaxes`** (plural), in *minor units* of a per-row `TaxesCurrency`
  that is frequently USD or CAD rather than EUR. `46260` means $462.60.

Coverage is also thin for small airports — Tallinn returns nothing on most long-haul
routes — so the agent retries from nearby hubs before reporting failure.

## Voice input status

The Plaud Embedded integration is built and the auth, upload and WAV-encoding chain
is verified working. Transcription itself returns `403 DEVICE_MISSING`: Plaud gates
the Transcription API behind a device bound through their iOS/Android SDK, which a
web-only build can't do. The code path is complete and will work the moment a bound
device is available.
