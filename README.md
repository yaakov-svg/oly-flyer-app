# OLY Zmanim Studio

A structured weekly flyer editor for Ohel Levi Yitzchok.

## What it does

- Edits weekly text directly on the flyer and reorders rows with visual drag handles.
- Reveals contextual icon, duplicate, note, and delete actions when a row is selected.
- Adds, removes, and reorders sections, and switches each between side-by-side (column) and full-width (wide) layouts.
- Pulls live Chabad.org zmanim for Baltimore (ZIP 21215): auto-detects the parsha, one-click fills the parsha and every dovening time from the shul's rules, and drops any halachic time into the selected row.
- Saves multiple weekly drafts and reusable templates in the browser.
- Saves named version snapshots (JSON plus a rendered PNG) into a folder you choose — ideally inside Dropbox, OneDrive, or Google Drive — for durable, self-serve history and one-click restore.
- Keeps the flyer library, saved versions, zmanim, and advanced controls in optional drawers and panels for a calmer default view.
- Renders 1:1, 3:4, and 8.5 x 11 flyer formats from one content model.
- Auto-fits each section independently and warns at the readability floor.
- Edits and reorders schedule rows without freeform positioning.
- Supports no-icon selections at both section and row level.
- Uses a polished vector icon set inspired by the original flyers, with distinct header and row styling.
- Keeps weekday and section headlines centered on one line at one shared, automatically measured size.
- Uses one Mazal Tov heading with multiple entries.
- Generates Hebrew and English date-line suggestions from a Friday date.
- Exports a high-resolution PNG and supports print/PDF output.

## Local use

```powershell
npm install
npm run dev
```

Open the local address printed by the development server.

## Validation

```powershell
npm run lint
npm run build
```

## Zmanim

The **Zmanim** panel fetches live times from Chabad.org for Baltimore (ZIP 21215) through a server route (`/api/zmanim`) that runs on the Cloudflare Worker — the request must be server-side because Chabad.org sends no CORS headers. Responses are cached for 24 hours. The location is currently fixed to 21215. The endpoint is Chabad.org's internal zmanim webservice (unofficial), so it may need updating if Chabad.org changes it.

## Dovening times

The zmanim above are astronomical; the dovening times printed on the flyer are derived from them by the shul's own rules, encoded in `app/doveningTimes.ts`. A flyer week runs Friday through Thursday, so "Sunday–Thursday" means the weekdays *after* that Shabbos.

| Time | Rule |
| --- | --- |
| Candle Lighting | Exact Chabad.org time |
| Friday Mincha | 10 min after candle lighting, rounded to the nearest 5 |
| Kabbalas Shabbos | 10 min before Friday tzeis, rounded to the nearest 5 |
| Shabbos Mincha | A multiple of 5 falling 20–25 min before shkia |
| Maariv · Motzai Shabbos | Exact time Shabbos ends |
| Weekday Mincha | 10 min before the earliest shkia (Sun–Thu), rounded to the nearest 5; never under 8 min before shkia |
| Weekday Maariv | Latest tzeis (Sun–Thu), rounded to the nearest 5; never more than 2 min before that tzeis |

The **Auto-fill** button writes all of these onto the flyer in one click. Which rule a `Mincha` or `Maariv` row gets is decided by the group header above it (`FRIDAY NIGHT`, `SHABBOS DAY`, `SUNDAY`, `MONDAY – TUESDAY`, …), so keep those headers labelled. Rows that carry extra meaning — `Maariv / Fast Ends`, `Mincha Gedola`, a shiur held "between Mincha & Maariv" — and rows the rules cannot place are left exactly as typed. Every rule is unit-tested:

```powershell
node --test tests/dovening-times.test.mjs
```

## Persistence

Drafts and templates are stored in browser local storage, so they stay on the same browser and device. For durable, portable history, the **Saved versions** panel writes each version as real files (JSON plus a rendered PNG) into a folder you pick with the browser's File System Access API — point it at a Dropbox, OneDrive, or Google Drive folder to get automatic backup and cross-device sync. Folder saving requires Chrome or Edge on desktop. Broader authenticated cloud sync is still deferred until the administrator and access model are defined.
