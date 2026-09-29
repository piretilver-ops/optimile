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

Points sit across several programmes, and rarely enough in any one of them for
the redemption you actually want. The value is in the combinations — which
balance transfers where, at what ratio, on which airline, on the few dates that
have award space. Inventory moves hourly and transfer ratios change without
notice. Working it out by hand is about forty minutes across five websites, and
it is stale by the weekend.

WHAT IT DOES

You describe the trip. A Claude Opus 5 agent then:

  - searches live award-seat availability across a dozen departure hubs, and
    retries from nearby airports when a small one returns nothing
  - checks what your flexible points transfer into, and at what ratio
  - looks up the real cash fare, because cents-per-point means nothing without it
  - prices the shortfall when you are short, and says whether buying those points
    beats paying cash for the ticket
  - ranks the options, recommends one, and names what to avoid

Airline miles and hotel points are tracked and valued as one portfolio. Live seat
search covers flights today; hotels next. Every tool call is visible as it runs —
what was asked, and what came back.

EXAMPLE

A portfolio of 11,344 SAS EuroBonus, 49,605 Finnair Avios, 17,756 Miles & More,
30,344 Revolut RevPoints and 73,534 Hilton Honors points, asked for a business
seat from San Francisco back to Europe:

  SAS nonstop SFO-Copenhagen in business. 60,000 EuroBonus points, zero taxes
  and surcharges, four seats showing.

The EuroBonus balance holds 11,344 of that. RevPoints transfer 1:1, bringing it
to 41,688 — still 18,312 short. Rather than stopping there, the agent prices the
gap: buying those points costs about EUR 249. The seat comes to EUR 249 in cash
with no surcharges, against a cash business fare in the low thousands.

No single balance could book it. The combination, plus a priced top-up, could.

It is equally specific about what does not work. Miles & More wants 62,500 miles
plus roughly EUR 1,298 in surcharges for the same direction, and that balance is
17,756 with no transfer route into it. The cheaper 57,500-mile American Airlines
rows show zero seats remaining — phantom inventory. It checked, and said so.

WHY THE ANSWERS HOLD UP

Cents-per-point is computed by a tool, in code, never by the model. Every
recommendation traces back to real numbers rather than a language model's mental
arithmetic.

It reports failure instead of filling the gap. When the award-data subscription
lapsed mid-build, the agent answered "I have zero live availability and I'm not
going to invent it", and said what to fix. An agent that recommends a flight
which does not exist is worse than no agent.

STATUS

Nothing is mocked — live seats.aero availability, real web search for cash fares,
up to twelve tool-calling iterations per question, voice input included.

Not yet a service: no accounts, and balances are entered manually rather than
synced. That is deliberate. Points are money, and a database of other people's
balances is a liability worth postponing — balances stay in the browser and never
reach the server. Accounts and direct programme connections come next, and that
is when the security work has to be done properly.

WHO PAYS

point.me charges $129 a year for award search and $200 per passenger for a
concierge booking, so willingness to pay is established.

First customer: award booking agents and travel advisors. They do this research
by hand all day and charge per ticket for it. Forty minutes down to three is
margin, and they book enough volume to pay per seat rather than per year.

Second: people holding points across several programmes who fly a few times a
year — the larger market, but the slower sell, because most of them do not know
the optimisation exists.

Not credit-card affiliate commissions, which fund most of this industry and are
why so much points advice quietly steers toward whoever pays the referral. Being
paid to prefer a programme would break the only thing that makes the advice worth
having.

A Plaud Embedded integration is also built. Authentication, user tokens and
multipart upload to Plaud storage are verified working, but their Transcription
API returns 403 DEVICE_MISSING until a device is bound through their native
iOS/Android SDK, which a web build cannot do. The code path is complete and the
repo documents exactly where the platform stops it.

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

The Plaud paragraph is already in the README above, so ticking **Plaud** is an
honest claim — the code is real and the limitation is stated. Remove that
paragraph if you would rather leave the box unticked.

## GIT.REMOTE

```
https://github.com/piretilver-ops/optimile
```
