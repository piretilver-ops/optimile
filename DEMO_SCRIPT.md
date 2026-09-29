# Optimile — hack day video script

**Target: 8 minutes** (limit is 10; judges rarely reward the full length).
Submission: video → hackersquad.io. Deadline 15:30 PDT, 29 Sep 2026.

---

## Before you hit record

```bash
npm run dev --prefix optimile -- -p 3007
```

Live version, if you would rather demo the deployed app than localhost:
**https://optimile-app.vercel.app**
(balances are per-browser, so enter yours on its Dashboard first)

Checklist:
- [ ] `.env.local` has both `ANTHROPIC_API_KEY` and `SEATS_AERO_API_KEY`
- [ ] Open `http://localhost:3007` → Dashboard → balances are **your real numbers**, not the seeded demo ones
- [ ] Browser zoom ~110%, window ~1400px wide, close other tabs
- [ ] Run the SFO question **once before recording** — it warms the prompt cache and confirms seats.aero is answering
- [ ] Hide bookmarks bar, mute notifications
- [ ] Record in **Chrome** — the voice button needs its speech recognition
- [ ] Click 🎙 once before recording so the mic permission prompt is already answered

**Timing note:** the big SFO question takes ~3 minutes. That is intentional screen time — you narrate over it. Do not cut it out; watching an agent work is the demo.

---

## 0:00 – 0:50 · The problem

> "I have points in five different loyalty programs. Not a lot in any of them — eleven thousand here, forty-nine thousand there. A hundred and eighty thousand points in total, and until this morning I could not have told you what a single one of them was worth.
>
> Not because it's secret. Because the answer is spread across five airline websites, a transfer chart, an award availability database, and whatever a cash ticket happens to cost today. Working it out properly is about forty minutes of manual research. Most people never do it — so the points sit there and quietly expire."

On screen: the Dashboard with your real balances.

---

## 0:50 – 1:30 · What Optimile is

> "Optimile is an agent that does those forty minutes in three. You tell it where you want to go. It checks live award availability, your transfer options, your status, and what the ticket actually costs in cash — then tells you the one best way to pay for it, and shows its work."

Click **Ask Optimile**. Point at the "Reasoning over" strip.

> "It starts grounded in what I actually hold. These are my real balances — and they're deliberately unimpressive, because that's the real problem. Nobody with half a million points needs help."

---

## 1:30 – 4:30 · The live run

Click the first example: *"I'm in San Francisco. Get me home to Europe — what's the best use of my points?"*

**Narrate the cards as they appear:**

- `Searching live award seats` → *"That's seats.aero, the live award availability database. It's checking a dozen European gateways in parallel."*
- Open a card → *"You can see exactly what it asked and exactly what came back. Nothing here is the model's memory — it's a live API response."*
- `Checking RevPoints transfer partners` → *"Now it's working out what my flexible Revolut points can become."*
- `Looking up cash fares` → *"This is the step people skip. Cents-per-point is meaningless without knowing what the ticket costs in cash, so it searches the web for the real fare."*

---

## 4:30 – 6:00 · The answer

Read the recommendation off the screen. From the actual run on these balances:

> "SAS nonstop, San Francisco to Copenhagen. Thirty thousand EuroBonus points, **zero taxes and surcharges**. Nine dates available, six to nine seats on each, every row refreshed today.
>
> Here's the part I could never have worked out myself: **I only have eleven thousand EuroBonus points.** But RevPoints transfer to EuroBonus one-to-one — so eighteen thousand six hundred and fifty-six of my Revolut points close the gap exactly, and I still have eleven thousand left over.
>
> None of my five balances is big enough on its own. The combination is. That's the whole product in one sentence."

Then scroll to the business-class section:

> "And it tells me what I *can't* have, with numbers. Lufthansa business out of SFO wants 88,850 miles — I have seventeen thousand — plus **twelve hundred and eighty euros** in surcharges. The cheap American Airlines rows at 57,500? **Zero seats left.** They're phantom inventory. It checked."

## 5:50 – 6:10 · Ask it out loud

Click the 🎙 button and speak the follow-up instead of typing it:

> *"What about business class? I can buy more Revolut points if that helps."*

The words appear in the box as you say them, and it submits itself when you stop.

> "No API key, no upload, no waiting on a transcription job — the browser does it,
> so the answer starts before you've finished the sentence."

(If the mic misfires, just type it. The button hides itself in browsers without
speech recognition, so use Chrome.)

---

## 6:10 – 6:50 · The follow-up that shows the real product

Type the second question: *"What about business class? I can buy more RevPoints."*

When it answers, point at the 🛒 **Pricing the shortfall** card.

> "Business was out of reach — I'm a hundred thousand points short. But RevPoints can
> be bought: 15,000 for €240, or €204 on a standing order. So the agent stops asking
> 'can she afford it' and starts asking 'is buying the gap cheaper than the ticket'.
>
> It works out the shortfall costs €1,423 on the standing-order rate, plus taxes,
> against a €2,100 cash fare. **Buying the points wins by about €680.** And it's
> honest about the one-off rate being worse — at 1.6 cents a point that one loses.
>
> That's the difference between a calculator and an advisor. A shortfall isn't a wall,
> it's a price."

---

## 6:50 – 7:30 · How it works — the two decisions worth stealing

**1. The model never does the arithmetic.**

> "Cents-per-point is computed by a tool, in code — never by the model. The agent gathers the inputs, calls `value_redemption`, and the ranking comes back from a function. Every recommendation traces to real numbers, and I never have to wonder whether it did the division right."

Open a `Computing cents-per-point` card to show the inputs and the returned ranking.

**2. It says when it doesn't know.**

> "Earlier today my seats.aero subscription was expired. The agent got a 401 and its answer was — quote — 'I have zero live availability and I'm not going to invent it.' It gave me the reasoning it could still do and told me exactly what to fix.
>
> An agent that recommends a flight that doesn't exist is worse than no agent. This one is built to fail loudly."

---

## 7:30 – 8:05 · Where it goes

> "Today the balances are typed in. The obvious next step is connecting programs directly, so anyone can plug in their points and get this answer without knowing what a transfer partner is.
>
> The market is people like me: points that hold real value, sitting unused because the optimisation problem is genuinely hard. Loyalty programs are a multi-billion dollar float built on the assumption you won't do this math. Optimile does it in three minutes."

---

## 8:05 – 8:20 · Close

> "Optimile. Built today, on live data. Thanks."

---

## Backup plan if the network is bad

Ask the narrower question instead — it runs in about 60 seconds and needs fewer calls:

> *"Should I transfer my RevPoints, or keep them?"*

If seats.aero fails entirely mid-recording: **keep recording**. The honest-failure behaviour is a legitimate and memorable demo. Narrate it as section 6.2 above and move on.

---

## Lines not to say

- Don't claim balances sync automatically. They don't yet.
- Don't call the data "real-time". It's a cached availability feed, refreshed daily — the agent labels row freshness itself, so match it.
- Don't quote a cpp number from memory. Read whatever is on screen in that run.
