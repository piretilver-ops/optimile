# HackerSquad submission — copy/paste

## PROJECT.NAME

```
Optimile
```

## PROJECT.README

```
Optimile is an award-travel agent. It takes the loyalty points you already hold
and tells you the single best way to spend them on a specific trip.

THE PROBLEM

Most people with points hold them across several programmes, and rarely enough in
any one of them for the redemption they actually want. The value is in the
combinations — which balance transfers into which programme, at what ratio, on
which airline's metal, on the few dates that have award space. Award inventory
moves hourly and transfer ratios change without notice, so the answer is
different every week. Working it out by hand means five airline websites, a
transfer chart, an availability database and a cash fare to compare against.
Roughly forty minutes per trip, and stale by the weekend.

WHAT IT DOES

You describe the trip. A Claude Opus 5 agent then:

  - searches live award-seat availability across a dozen candidate departure
    hubs, retrying from nearby airports when a small one returns nothing
  - checks what your flexible points can transfer into, and at what ratio
  - looks up what the same ticket costs in cash, because cents-per-point is
    meaningless without that anchor
  - works out whether buying the points you are short of beats paying cash
  - ranks the options and recommends one, with the runner-up and what to avoid

It tracks airline miles and hotel points as a single portfolio and values both.
Live seat search covers flights today; hotel award search is next.

Every tool call is visible in the interface as it runs — what was asked, what
came back. Nothing is hidden behind a spinner.

EXAMPLE OUTPUT

For a portfolio of 11,344 SAS EuroBonus, 49,605 Finnair Avios, 17,756 Miles &
More, 30,344 RevPoints and 73,534 Hilton points, asked to get from San Francisco
to Europe:

  SAS nonstop SFO-Copenhagen, 30,000 EuroBonus points, zero surcharges, nine
  dates with six to nine seats each. The EuroBonus balance covers only 11,344 of
  that — but RevPoints transfer 1:1, so 18,656 of them close the gap exactly.

No single balance could book that seat. It also ruled out business class with
numbers: 88,850 Miles & More miles plus EUR 1,280 in surcharges, and the cheaper
57,500-mile rows showing zero seats remaining.

WHY THE ANSWERS CAN BE TRUSTED

Cents-per-point is computed by a tool, in code — never by the model. Every
recommendation traces back to real numbers rather than a language model's mental
arithmetic.

It reports failure instead of filling the gap. When the award-data subscription
lapsed during the build, it answered "I have zero live availability and I'm not
going to invent it" and said what to fix. An agent that recommends a flight
which does not exist is worse than no agent.

STATUS

Nothing is mocked: live seats.aero availability, real web search for cash fares,
up to twelve tool-calling iterations per question. Voice input included.

Not yet a service. No accounts, and balances are entered manually rather than
synced. That is deliberate for now — points are money, and a database of other
people's balances is a liability worth postponing. Balances stay in the browser
and never reach the server. Accounts and direct programme connections come next.

WHO PAYS

This market already pays. point.me charges $129 a year for award search and $200
per passenger for a concierge booking; comparable services charge per ticket.

First customer: award booking agents and travel advisors. They do this research
by hand all day and charge $150-300 per ticket for it. Cutting forty minutes to
three is margin, and they book enough volume to pay per seat rather than per
year.

Second: people holding points across several programmes who fly a few times a
year — the larger market, but the slower sell, because most of them do not know
the optimisation exists.

Not credit-card affiliate commissions, which fund most of this industry and are
why so much points advice steers toward whoever pays the referral. Being paid to
prefer a programme would break the only thing that makes the advice worth having.

Live: https://optimile-app.vercel.app
Code: https://github.com/piretilver-ops/optimile
```

## PROJECT.STACK

**other stack:**

```
Claude Opus 5 (Anthropic API, tool use + streaming), Next.js 16, React 19, TypeScript, Tailwind 4, seats.aero Partner API, Web Speech API, Vercel
```

Sponsor checkboxes — tick only what genuinely works. Right now that is none of the
six. A judge can open the link and the repo, and an overclaimed checkbox is the
fastest way to cast doubt on everything else in the submission.

If Brave Search gets added before the deadline, tick **Brave**.

If you decide to tick **Plaud**, append this to the README so the claim is honest:

```
I also built a Plaud Embedded integration. Authentication, user tokens and
multipart upload to their storage are all verified working, but their
Transcription API returns 403 DEVICE_MISSING until a device is bound through
their native iOS/Android SDK — which a web build cannot do. The code path is
complete and the repo documents exactly where the platform stops it.
```

## GIT.REMOTE

```
https://github.com/piretilver-ops/optimile
```
