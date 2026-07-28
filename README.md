# OLY Zmanim Studio

A structured weekly flyer editor for Ohel Levi Yitzchok.

## What it does

- Edits weekly text directly on the flyer and reorders rows with visual drag handles.
- Reveals contextual icon, duplicate, note, and delete actions when a row is selected.
- Adds, removes, and reorders sections, and switches each between side-by-side (column) and full-width (wide) layouts.
- Pulls live Chabad.org zmanim for Baltimore (ZIP 21215): auto-detects the parsha, one-click fills the parsha and candle-lighting time, and drops any halachic time into the selected row.
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

The **Zmanim** panel fetches live times from Chabad.org for Baltimore (ZIP 21215) through a server route (`/api/zmanim`) that runs on the Cloudflare Worker — the request must be server-side because Chabad.org sends no CORS headers. Responses are cached for 24 hours. The location is currently fixed to 21215, and only candle lighting auto-fills, because minyan times are a shul decision rather than a calculated zman. The endpoint is Chabad.org's internal zmanim webservice (unofficial), so it may need updating if Chabad.org changes it.

## Persistence

Drafts and templates are stored in browser local storage, so they stay on the same browser and device. For durable, portable history, the **Saved versions** panel writes each version as real files (JSON plus a rendered PNG) into a folder you pick with the browser's File System Access API — point it at a Dropbox, OneDrive, or Google Drive folder to get automatic backup and cross-device sync. Folder saving requires Chrome or Edge on desktop. Broader authenticated cloud sync is still deferred until the administrator and access model are defined.
