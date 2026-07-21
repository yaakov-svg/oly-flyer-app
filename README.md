# OLY Zmanim Studio

A structured weekly flyer editor for Ohel Levi Yitzchok.

## What it does

- Saves multiple weekly drafts and reusable templates in the browser.
- Edits weekly text directly on the flyer and reorders rows with visual drag handles.
- Keeps the flyer library and advanced controls in optional drawers for a calmer default view.
- Renders 1:1, 3:4, and 8.5 x 11 flyer formats from one content model.
- Auto-fits each section independently and warns at the readability floor.
- Edits and reorders schedule rows without freeform positioning.
- Supports no-icon selections at both section and row level.
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

## Persistence

Drafts and templates are stored in browser local storage. They remain available on the same browser and device. Cloud sync is intentionally deferred until the administrator and access model are defined.
