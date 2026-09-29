# Optimile — what to say, word for word

Read this from your phone. **Bold bracketed lines are what to DO** — don't read those out.
Everything else is spoken.

Short sentences on purpose. Pause at every full stop. If you lose your place, stop
talking for two seconds and find it — silence is fine, rushing is not.

---

## 1 · Dashboard — about 45 seconds

**[Screen: https://optimile-app.vercel.app — the Dashboard, showing the five balances]**

> Hi. This is Optimile.
>
> I want to fly business class more often, using points I already have.
>
> Here is my problem. I have points in five different programmes. SAS. Finnair.
> Lufthansa. Hilton. And Revolut.
>
> Eleven thousand here. Forty-nine thousand there. About a hundred and eighty
> thousand points in total.
>
> And not one of those balances is big enough, on its own, for a long-haul
> business seat.
>
> The value is in the combinations. Which balance moves into which programme. At
> what ratio. On which airline. On the few dates that actually have a seat.
>
> That changes every day. Working it out by hand takes about forty minutes,
> across five different websites. And by the weekend it is out of date.

---

## 2 · Open the agent — about 30 seconds

**[Click "Ask Optimile" in the sidebar]**

**[Point the cursor at the "Reasoning over" strip at the top]**

> Optimile does that work in three minutes, and it shows you every step.
>
> It starts from what I actually hold. These are my real balances — airline miles
> and hotel points, valued together as one portfolio.

---

## 3 · Start the search, and talk while it runs — about 3 minutes

**[Click the first example: "I'm in San Francisco. Get me home to Europe…"]**

> So let's ask it. I am in San Francisco right now. I want to get home to Europe.
>
> This takes about three minutes, and I want you to watch what it does, because
> this is the whole point.

**[Cards start appearing. Point at each one as it shows up.]**

> There. That first card is a live search for award seats.
>
> This is a real database of award availability, and it is checking about a dozen
> European airports at the same time. Helsinki. Copenhagen. Stockholm. Frankfurt.
> London.

**[Click one card open so the JSON shows]**

> And I can open any card and see exactly what it asked, and exactly what came
> back. This is not the model remembering something. This is a live answer from a
> real API, right now.

> One thing you will see here. It gets nothing at all from Tallinn, which is my
> home airport. That database barely covers small airports.
>
> So it tries again from the nearest big hubs, on its own. I did not ask it to do
> that. That fallback is built into the agent, because without it, the honest
> answer would be "nothing available" — and that would be wrong.

**[Next card: transfer partners]**

> Now it is checking my transfer partners. My Revolut points are flexible. They
> can become Turkish miles, or Avios, or Flying Blue, or SAS points. Each one at a
> different ratio, and each one worth a different amount.

**[Next card: looking up cash fares]**

> And this part is the one people skip.
>
> It is searching the web for what this ticket actually costs in cash.
>
> Because "cents per point" means nothing on its own. If I tell you a seat is two
> cents per point, that is only good if the cash ticket is expensive. Without a
> real price to compare against, the number is decoration.

**[If it is still running — extra material, use as much as you need:]**

> While it works, one thing about how this is built.
>
> The model never does the arithmetic. Cents per point is calculated by a tool, in
> code. The agent collects the numbers, calls the function, and the ranking comes
> back from real maths.
>
> So I never have to wonder whether it did the division correctly. Every
> recommendation traces back to numbers I can check.

> And there is a second calculator. It answers the question people actually have,
> which is: I am short of points. Is it cheaper to buy the points I am missing, or
> just buy the ticket?
>
> That is a real comparison, and most people get it wrong, because they forget
> that the points they already hold are worth something too.

---

## 4 · The answer — about 90 seconds

**[Scroll to the recommendation]**

> And here it is.
>
> SAS, nonstop, San Francisco to Copenhagen. In business.
>
> Sixty thousand EuroBonus points. Zero taxes. Zero surcharges. Four seats
> showing.

**[Scroll slowly through the table]**

> Real dates. Real seat counts. And it tells me when the provider last refreshed
> each row, so I know how fresh this is.

> Now here is the part I could never have worked out myself.
>
> I only have eleven thousand EuroBonus points. Nowhere near sixty.
>
> But my Revolut points transfer one-to-one. That brings me to forty-one
> thousand. Still eighteen thousand short.
>
> And instead of stopping there, it priced the gap. Buying those missing points
> costs about two hundred and fifty euros.
>
> So: a business class seat from San Francisco to Copenhagen, for two hundred and
> fifty euros and no surcharges. The cash fare is in the low thousands.
>
> None of my five balances could book that seat. The combination could.

**[Scroll to the part about what does not work]**

> It is just as clear about what does not work.
>
> Lufthansa wants sixty-two thousand miles, plus about thirteen hundred euros in
> surcharges. I have seventeen thousand, and there is no way to top it up.
>
> And look at this one. American Airlines, fifty-seven thousand five hundred
> miles, which is the cheapest number on the whole page.
>
> Zero seats left. It is phantom inventory. The price is real, the seat is not.
>
> It checked, and it told me.

---

## 5 · Voice — about 30 seconds

**[Click the microphone button]**

> I can also just ask it out loud.

**[Speak this into the app, slowly and clearly:]**

> "Should I transfer my Revolut points, or keep them?"

**[The words appear in the box as you speak. When you stop, it submits itself.]**

> The words appear as I talk, and it sends the question when I stop. No API key,
> nothing uploaded, no waiting for a transcription job.

**[Do NOT wait for this answer. Let it run in the background and keep talking —
move straight to section 6.]**

---

## 6 · Why you can trust it — about 60 seconds

**[Open a "Computing cents-per-point" card]**

> Two decisions make this trustworthy.
>
> First, as I said: the maths is in code, not in the model's head. You can open
> this card and see the numbers that went in, and the ranking that came out.

> Second, and this matters more.
>
> This morning, my award data subscription expired in the middle of building
> this. The agent got an error.
>
> And its answer was, and I am quoting it: "I have zero live availability, and I
> am not going to invent it." Then it told me exactly what to fix.
>
> An agent that recommends a flight which does not exist is worse than no agent
> at all. This one is built to fail loudly.

---

## 7 · Who pays, and close — about 45 seconds

> People already pay for this. Point dot me charges a hundred and twenty-nine
> dollars a year for award search, and two hundred dollars per person for a
> booking. So the demand is proven.
>
> My first customer is award booking agents. They do this research by hand, all
> day, and charge per ticket for it. Forty minutes down to three is margin
> straight to their bottom line.
>
> The second is people like me, with points spread across programmes.
>
> One thing I will not do is take credit card affiliate money. That funds most of
> this industry, and it is why so much points advice quietly pushes you toward
> whoever pays the referral. The whole point of this is that the numbers are
> honest. Being paid to prefer one programme would break it.

> There are no accounts yet. Your balances stay in your own browser and never
> reach my server. Points are money, and a database of everyone's balances is a
> liability I did not want on day one.
>
> That is Optimile. Built today, on live data. Thank you.

---

## If something goes wrong

**The search returns an error.** Do not stop recording. Say this:

> And there you go — that is exactly what I was talking about. The data source
> failed, and instead of inventing a flight, it told me. That is the behaviour I
> want.

Then carry on to section six.

**The microphone does not work.** Skip section five entirely. Type the question
instead and say nothing about it.

**You lose your place.** Stop. Breathe. Find the line. Two seconds of silence is
invisible in the final video.
