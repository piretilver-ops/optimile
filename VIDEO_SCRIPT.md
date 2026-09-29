# Optimile — video script, word for word

Structured to the three things the submission asks for:
**1. The Problem · 2. Your Tech Stack · 3. Live Demo + Code**

Read this from your phone. **Bold bracketed lines are what to DO** — do not read those
out. Everything else is spoken.

**Before you press record:** open the app in one Chrome tab and the five GitHub links
(in Part 3b) in five more. Then the code section is just tab-switching, with the right
lines already highlighted — no scrolling or hunting on camera.

Short sentences on purpose. Pause at every full stop. If you lose your place, stop
talking for two seconds and find it. Silence is invisible; rushing is not.

---

# PART 1 · THE PROBLEM

*about 1 minute*

**[Screen: https://optimile-app.vercel.app — the Dashboard, five balances visible]**

> Hi. This is Optimile.
>
> I want to fly business class more often, using points I already have.
>
> Here is the problem. I have points in five different programmes. SAS. Finnair.
> Lufthansa. Hilton. And Revolut.
>
> Eleven thousand here. Forty-nine thousand there. About a hundred and eighty
> thousand points in total.
>
> And not one of those balances, on its own, is big enough for a long-haul
> business seat.

> So the value is not in any one balance. It is in the combinations. Which balance
> moves into which programme. At what ratio. On which airline. On the few dates
> that actually have a seat.
>
> And all of that changes every single day. Award seats appear and disappear
> hourly. Transfer ratios change without warning.
>
> Doing it by hand means five airline websites, a transfer chart, an availability
> database, and a cash price to compare against. About forty minutes per trip.
> And it is out of date by the weekend.

> Why it matters: most people never do that work. So the points just sit there,
> and eventually they expire. This is money people already own and cannot spend
> properly.

---

# PART 2 · TECH STACK

*about 1 minute 30 — talk over the Dashboard, no clicking needed*

> Let me tell you what this is built on, and specifically what each piece made
> possible.

> **Claude Opus 5, with tool use.** This is the part that could not have been
> done another way.
>
> I did not write the search strategy. I gave the model five tools and let it
> decide what to check. When my home airport returns nothing, it re-runs the
> search from Helsinki, Copenhagen, Stockholm on its own. When my balance is too
> small, it goes and checks whether a transfer closes the gap.
>
> To hard-code that, I would have to enumerate every route, every programme, every
> transfer path in advance. With an agent, I describe the goal and it works out
> which questions to ask.

> **The seats.aero Partner API.** Real award seat inventory. Airlines do not
> publish this — without that feed, every number in this demo would be a guess.

> **Server-side web search.** This gives the cash price to compare against. Cents
> per point is meaningless without it — a seat at two cents per point is only good
> if the cash ticket is expensive.

> **Streaming, over server-sent events.** This one is not cosmetic. The agent
> takes about three minutes. Without streaming that is a three-minute spinner, and
> nobody would trust it. With streaming you watch it work, step by step.

> **The browser's own speech recognition,** for voice input. No API key, nothing
> uploaded, no transcription job to wait for.

> And **Next.js on Vercel**, which is how all of this got built and deployed in
> one day.

---

# PART 3 · LIVE DEMO

*about 4 minutes*

**[Click "Ask Optimile" in the sidebar]**

**[Point the cursor at the "Reasoning over" strip]**

> It starts from what I actually hold. Real balances — airline miles and hotel
> points, valued together as one portfolio.

**[Click the first example: "I'm in San Francisco. Get me home to Europe…"]**

> So let's ask it. I am in San Francisco. I want to get home to Europe.
>
> This takes about three minutes, and I want you to watch what it does, because
> this is the whole point.

**[Cards appear. Point at each one.]**

> There. That first card is a live award seat search. It is checking about a dozen
> European airports at the same time. Helsinki. Copenhagen. Stockholm. Frankfurt.
> London.

**[Click one card open so the raw data shows]**

> And I can open any card and see exactly what it asked, and exactly what came
> back. This is not the model recalling something from training. That is a live
> API response, from a few seconds ago.

> Watch this one. It gets nothing from Tallinn, which is my home airport — that
> database barely covers small airports. So it tries again from the nearest hubs,
> by itself. Without that, the honest answer would be "nothing available", and it
> would be wrong.

**[Next card: transfer partners]**

> Now it is checking my transfer partners. Revolut points are flexible — they can
> become Turkish miles, or Avios, or Flying Blue, or SAS points. Each at a
> different ratio, each worth a different amount.

**[Next card: cash fares]**

> And this is the step people skip. It is searching the web for what the ticket
> actually costs in cash, so the comparison means something.

**[Extra material if it is still running — use as much as you need:]**

> While that finishes — two things about how it is built, and I will show you both
> in the code in a moment.
>
> The model never does the arithmetic. Cents per point is calculated by a tool, in
> code. So I never have to wonder whether it did the division right.
>
> And there is a second calculator for the question people actually have: I am
> short of points — is it cheaper to buy the ones I am missing, or just buy the
> ticket?

---

## The answer

**[Scroll to the recommendation]**

> And here it is.
>
> SAS, nonstop, San Francisco to Copenhagen. In business.
>
> Sixty thousand EuroBonus points. Zero taxes. Zero surcharges. Four seats
> showing.

**[Scroll slowly through the table]**

> Real dates, real seat counts, and it tells me when each row was last refreshed.

> Now here is the part I could not have worked out myself.
>
> I only have eleven thousand EuroBonus points. Nowhere near sixty.
>
> But Revolut points transfer one to one. That brings me to forty-one thousand.
> Still eighteen thousand short.
>
> And instead of stopping there, it priced the gap. Buying those missing points
> costs about two hundred and fifty euros.
>
> So: a business class seat, San Francisco to Copenhagen, for two hundred and
> fifty euros and no surcharges. The cash fare is in the low thousands.
>
> No single balance could book that seat. The combination could.

**[Scroll to what does not work]**

> It is just as specific about what does not work.
>
> Lufthansa wants sixty-two thousand miles plus about thirteen hundred euros in
> surcharges, and I have seventeen thousand with no way to top it up.
>
> And look at this one. American Airlines, fifty-seven thousand five hundred
> miles — the cheapest number on the page. Zero seats left. Phantom inventory.
> The price is real, the seat is not. It checked, and it told me.

---

## Voice

**[Click the microphone button]**

> I can also just ask out loud.

**[Say this into the app, slowly and clearly:]**

> "Should I transfer my Revolut points, or keep them?"

**[Words appear as you speak. It submits itself when you stop.]**

> The text appears as I talk, and it sends when I stop.

**[Do NOT wait for the answer. Leave it running and go straight to the code.]**

---

# PART 3b · THE CODE

*about 2 minutes*

**[Switch to the GitHub tab — link 1. Open all five links as tabs BEFORE you start
recording, so you never have to hunt for a line on camera.]**

Link 1 — https://github.com/piretilver-ops/optimile/blob/1067d3ab0a8950ccf8e0dbaad65dba333956ac65/lib/agent-tools.ts#L12-L121

> This is the file that makes it work. It is the tool surface — everything the
> agent is allowed to do.

**[The five tool definitions are on screen — scroll slowly through them]**

> Five tools. Search live award availability. Check transfer partners. Check
> status matches. Price a shortfall. And value a redemption.
>
> That is the whole vocabulary. I never tell it which one to use. It reads the
> question and decides.

**[Switch to tab 2]**

Link 2 — https://github.com/piretilver-ops/optimile/blob/1067d3ab0a8950ccf8e0dbaad65dba333956ac65/lib/agent-tools.ts#L143-L190

> And this is the decision I would defend hardest.
>
> This function is where cents per point is calculated. In code. The agent
> gathers the inputs, calls this, and the ranking comes back from real
> arithmetic — not from a language model doing mental maths.
>
> Every recommendation on that screen traces back to this function.

**[Switch to tab 3 — the highlighted lines are the comment]**

Link 3 — https://github.com/piretilver-ops/optimile/blob/1067d3ab0a8950ccf8e0dbaad65dba333956ac65/lib/agent-tools.ts#L253-L262

> Here is a real bug I fixed today, and the comment explains it.
>
> The points you already hold are not free. If you pay cash, you keep them. My
> first version forgot that, and it told me to buy fourteen euros of points to
> avoid a two hundred euro fare — while burning ninety-nine thousand points worth
> nearly a thousand euros.
>
> The fix weighs the cash saved against the value of the balance you spend.

**[Switch to tab 4]**

Link 4 — https://github.com/piretilver-ops/optimile/blob/1067d3ab0a8950ccf8e0dbaad65dba333956ac65/lib/seats-aero.ts#L118-L130

> One more, because it nearly cost me the demo.
>
> That availability API takes exactly one programme per request. If you send it a
> list, it returns success and zero rows. No error. Just silence that looks
> exactly like "no seats available".
>
> So it sends one request per programme and merges the results. That comment is
> there so the next person does not lose an hour to it.

**[Switch to tab 5]**

Link 5 — https://github.com/piretilver-ops/optimile/blob/1067d3ab0a8950ccf8e0dbaad65dba333956ac65/app/api/agent/route.ts#L107-L135

> And this is the loop. Up to twelve rounds. Ask the model, run whatever tools it
> asked for, feed the results back, repeat until it has an answer — streaming
> every step to the browser as it happens.
>
> About two hundred lines. That is the whole agent.

---

# CLOSE

*about 45 seconds*

**[Back to the browser]**

> One more thing, and it is the reason I would use this myself.
>
> This morning my award data subscription expired in the middle of building. The
> agent got an error. And its answer was, quoting it: "I have zero live
> availability, and I am not going to invent it." Then it told me what to fix.
>
> An agent that recommends a flight which does not exist is worse than no agent.
> This one is built to fail loudly.

> On the business side: people already pay for this. Point dot me charges a
> hundred and twenty-nine dollars a year, and two hundred dollars per booking. My
> first customer is award booking agents — they do this by hand all day and charge
> per ticket. Forty minutes down to three is margin.
>
> What I will not take is credit card affiliate money. That funds most of this
> industry, and it is why so much points advice quietly steers you toward whoever
> pays the referral. The whole value here is that the numbers are honest.

> There are no accounts yet. Your balances stay in your browser and never reach my
> server. Points are money, and a database of everyone's balances is a liability I
> did not want on day one.
>
> That is Optimile. Built today, on live data. Thank you.

---

## If something goes wrong

**The search errors.** Do not stop recording. Say:

> And there you go — that is exactly what I was describing. The data source
> failed, and instead of inventing a flight, it told me. That is the behaviour I
> want.

Then go straight to the code section.

**The microphone does not work.** Skip the voice part. Say nothing about it.

**You lose your place.** Stop. Breathe. Find the line. Two seconds of silence
disappears in the final video.
