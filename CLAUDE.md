# Optimile

## Mis see on

Lennumiilide ja lojaalsuspunktide optimeerija. Next.js 16 + React 19 + Tailwind 4.
Põhiosa on **AI-agent** (`/ask`), mis arutleb kasutaja punktisaldode, ülekandepartnerite,
staatuse matchide ja päris award-saadavuse üle ning annab põhjendatud soovituse.

Ehitatud AI Conference 2026 Day ZERO hack day jaoks (29.09.2026, Pier 48, SF).

## Arhitektuur

| Fail | Roll |
|---|---|
| `app/ask/page.tsx` | Agendi vestlusliides. Tööriistakutsed on avatavad kaardid. |
| `app/api/agent/route.ts` | SSE-voog + käsitsi agendi-tsükkel (Claude Opus 5). |
| `lib/agent-tools.ts` | Tööriistade definitsioonid ja täitjad. |
| `lib/seats-aero.ts` | seats.aero Partner API klient. |
| `lib/constants.ts` | Kasutaja programmid, Revoluti partnerid. |
| `app/page.tsx` | Dashboard — saldod, localStorage `optimile_programs`. |

## Käivitamine

```bash
npm run dev --prefix optimile -- -p 3007
```

Vajalikud võtmed `.env.local`-is: `ANTHROPIC_API_KEY`, `SEATS_AERO_API_KEY`.

## Deploy

Avalik aadress on **https://optimile-app.vercel.app** (püsiv alias).

🔑 **Iga uus produktsiooni-deploy loob uue juhusliku aadressi ja alias JÄÄB vana
deploy peale.** Pärast iga deploy'd tuleb alias käsitsi ümber suunata:

```bash
vercel deploy --prod --yes          # tagastab uue aadressi
vercel alias set <uus-aadress> optimile-app.vercel.app
```

See on oluline ka sellepärast, et **saldod elavad localStorage'is aadressi kohta** —
aadressi vahetus tähendab kasutaja jaoks tühja portfelli.

## seats.aero API lõksud (kontrollitud 29.09.2026)

Need on päris käitumised, mitte oletused — kõik kolm põhjustasid vaikseid vigu:

1. **`source` parameeter võtab AINULT ÜHE programmi.** Komaga loend
   (`source=british,flyingblue`) tagastab HTTP 200 ja **tühja tulemuse** — mitte viga.
   `searchAwardFlights` teeb seetõttu ühe päringu allika kohta ja liidab tulemused.
2. **`OriginAirport` / `DestinationAirport` on `Route` objekti sees**, mitte tipptasemel.
3. **Maksuväli on `YTotalTaxes` (mitmuses), väärtus SENTIDES**, ja valuuta on real
   `TaxesCurrency` — sageli USD või CAD, **mitte EUR**. 46260 = $462,60.

## Katvuse lõks

seats.aero katvus väikelennujaamades on aukline. Kontrollitud 29.09.2026:

- **TLL–JFK, TLL–LHR, TLL–HEL: 0 kirjet.** TLL–CDG: 26.
- **SFO on väga hea:** SFO–LHR 105, SFO–FRA 31, SFO–SYD 20, SFO–HND 14.
- HEL–BKK 34, CPH–JFK 68, FRA–SIN 64.

Seepärast: kui TLL annab tühja, proovi HEL/CPH/ARN/RIX/WAW/FRA. Agendi süsteemiprompt
teeb seda ise.

## Disainiotsus, mida mitte lõhkuda

**Mudel ei arvuta cents-per-point kunagi ise.** `value_redemption` tööriist teeb kogu
aritmeetika koodis ja tagastab verdikti. Iga soovitus on jälgitav päris numbriteni.
Kui lisad arvutusi, lisa need tööriista — mitte süsteemiprompti.

## Vanad pitch-failid (juurkaustas)

`OPTIMILE_pitch.pdf` · `.pptx` · `optimile_pitch.js` · `optimile_pitch_pdf.py`
Need on **eestikeelsed ja Garage48 jaoks** — ei sobi AI-konverentsile ilma ümbertegemiseta.
