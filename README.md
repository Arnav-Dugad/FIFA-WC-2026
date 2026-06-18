# 🏆 World Cup 2026 Hub

A premium, fully responsive, **multi-page fan website** for the FIFA World Cup 2026 (USA · Canada · Mexico). Pure HTML/CSS/JavaScript — no build step, no server, no API keys, **100% free**.

## ▶ How to open
Just double-click **`index.html`** (or right-click → Open with your browser). Everything runs client-side.

> An internet connection is recommended so country **flags** (flagcdn.com), **map tiles** (OpenStreetMap/CARTO) and **web fonts** load. Stadium artwork and player avatars are generated locally and never break.

## 📄 Pages
| Page | What's inside |
|------|---------------|
| `index.html` | Hero, live countdown to kick-off, live/next matches, top contenders, format explainer, news |
| `fixtures.html` | All 104 matches grouped by day in **your local time**, filter by status/group, team search |
| `teams.html` | 48 nations, 12 group tables (auto-computed standings), team profile modals |
| `players.html` | Star players with positions, form ratings & profile modals; filter by position |
| `stats.html` | Tournament pulse, Golden Boot / assists / rating leaderboards, all 12 live tables |
| `stadiums.html` | 16 venues with capacities + **interactive Leaflet maps** at real coordinates |
| `live.html` | **Live Match Center** — real-time simulated clock, possession, shots, xG, momentum graph & commentary |
| `news.html` | Filterable newsroom with article modals |

## ✨ Key features
- ⏱️ **Local-time everywhere** — kick-offs auto-convert to the visitor's time zone.
- 🔴 **Live engine** — `live.html` simulates a match minute-by-minute (clock, stats, momentum, commentary).
- 🗺️ **Real maps** — every stadium pinned on an interactive dark map.
- 📊 **Computed standings** — group tables calculated from match results, not hard-coded.
- 📱 Responsive, glassmorphic dark UI with scroll animations.

## 🛠️ Keeping it up to date
Everything is data-driven from **`js/data.js`**. As real results land, edit a match's `status` to `finished` and set `hs`/`as` — standings, stats and leaderboards update automatically. Add player goals/assists in the `PLAYERS` array to drive the Golden Boot race.

## ✅ Real data
- **Groups & teams:** the actual Final Draw (Washington D.C., 5 Dec 2025) — all 48 qualified nations in their real 12 groups, including resolved play-off winners (Czechia, Bosnia & Herzegovina, Türkiye, Sweden, Iraq, DR Congo).
- **Schedule:** the real 72-match group-stage fixture list — correct dates, venues and kick-off times (stored in UTC, shown in your local time). Opening match: **Mexico vs South Africa**, Estadio Azteca, 11 June 2026.
- **Live status & scores:** `js/live-data.js` derives each match's *real* status (upcoming / in-play / full-time) and live minute from the actual kickoff time, and pulls **real scores** from TheSportsDB's free, CORS-enabled feed when a match is in play. If the feed is unavailable it shows the real status and **never invents a scoreline**.
- **Stadium photos:** loaded live from **Wikipedia** (free), with a generated SVG fallback so images never break.

## 📡 Free data sources (all no API key, CORS-enabled)
- **openfootball/worldcup.json** — public-domain GitHub feed. Primary source for **results, goal scorers & half-time scores**, and for **auto-resolving the knockout bracket**.
- **TheSportsDB** (free key `3`) — best-effort **in-play live scores** + on-demand **full national squads with player photos**.
- **Wikipedia REST API** — real **stadium photos**, **player headshots** and **bios**.
- **open-meteo** — real **match-day weather** for each venue (live center).
- **The Guardian + BBC Sport + Google News RSS** (via free CORS proxies allorigins/codetabs/corsproxy) — real **auto-updating news** with images, plus **per-match related headlines**.
- **World Bank Open Data** — real **country facts** (capital, population, region, income) in the team profile.
- All are wrapped in `try/catch` with graceful fallbacks — the site stays correct (and never invents a scoreline) even when a feed is unavailable.

## ⭐ Premium features
- **Match detail modal** (tap any fixture): score/countdown, venue, win-probability, players to watch, and **Add to Calendar (.ics)**.
- **Knockout bracket** (`bracket.html`) with a live group-qualification tracker; fills in real names from the feed.
- **Follow your teams** — tap ☆ on any team (saved locally); filter fixtures to "⭐ Following".
- **🔔 Kick-off notifications** — enable the header bell to get a browser alert ~15 min before (and at) kick-off for teams you follow.
- **120+ curated real players** across all 48 teams, with Wikipedia photos — plus an **on-demand full-squad loader** that pulls each nation's complete roster (with photos) from the free feed.
- Fully **mobile-friendly** with large tap targets, collapsing nav and responsive layouts throughout.

## 🆕 Advanced upgrades
- **Home spotlight** always shows the **live match (or latest result) + the next match**, plus a **"Today's matches"** widget on your local calendar day.
- **Innovative bracket** — a round selector ("funnel") instead of endless horizontal scrolling, a **"trace a team"** highlighter, a live **best‑third‑placed‑teams** ranking table, and **automatic Round‑of‑32 projection** using the official slot structure + a third‑place perfect‑matching algorithm. Winners/losers propagate through every round from results.
- **Premium live center** — multi‑match live ticker, **in‑play win‑probability** (updates with score & time), **venue weather** (open‑meteo, free), match facts (titles, best finish, nicknames), recent‑form W/D/L strips, line‑ups, follow + calendar buttons.
- **PWA + Service Worker** — installable app, **offline app shell + cached data**, and notifications routed through the service worker so they can surface while backgrounded.
- **Richer data** — every team now has World Cup titles, best finish, nickname and debutant flags; player modals load a **real Wikipedia bio**.

### ⚠️ Service worker / background note
Service workers require **https:// or http://localhost** — they do **not** run from `file://`. To unlock offline mode, install‑to‑home‑screen and background notifications, serve the folder, e.g.:
```
cd "FIFA WC Website"
python -m http.server 8080      # then open http://localhost:8080
```
With the tab open, kick‑off alerts work everywhere. Fully closed‑tab delivery needs a push server (out of scope for a free, static site); the service worker uses best‑effort Periodic Background Sync where the browser supports it.

> Note: knockout-round match-ups are placeholders until the groups finish (only the dates/venues by round are fixed). An unofficial fan project, not affiliated with FIFA. Everything is driven by `js/data.js` — drop in confirmed results and the whole site updates.
