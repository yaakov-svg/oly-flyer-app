# OLY Zmanim Studio

## 1. What This Project Is

A structured weekly flyer editor for Ohel Levi Yitzchok. It turns repeatable zmanim content into print, WhatsApp, and social layouts without freeform canvas work.

## 2. Current State

On top of the visual and headline refinements, three capabilities have been added: dynamic sections, a Chabad.org zmanim engine, and folder-backed saved versions.

- **Dynamic sections.** Sections are a dynamic ordered list. Each section has a layout of `column` (side-by-side up top) or `wide` (full-width, stacked below) and can be added, removed, reordered, and switched between layouts from the section manager in More settings. The flyer page is a flex column: fixed header, announcement, and footer bands keep their proportions while the columns band and each wide section flex to fill, weighted by row count. Older keyed-object drafts migrate to the array shape automatically.
- **Zmanim engine.** A "Zmanim" panel pulls live Chabad.org times for Baltimore (ZIP 21215) via a server route on the Cloudflare Worker (`/api/zmanim`, required because Chabad.org sends no CORS headers). It auto-detects the parsha, one-click fills the parsha and candle-lighting time, and drops any halachic time into the selected row. Responses are cached 24h.
- **Saved versions.** A "Saved versions" panel writes each version (JSON plus a rendered PNG) into a user-chosen folder via the File System Access API, giving durable self-serve history and restore; a localStorage index keeps the list visible before the folder is reconnected. Folder saving is Chrome/Edge desktop only.

Group labels still share one measured font size per flyer across 1:1, 3:4, and letter. Build and lint pass (0 errors). Features were verified in-browser: add/remove/reorder/layout-toggle, no page overflow across the three formats, legacy-draft migration, and live zmanim against Baltimore 21215.

## 3. Key Decisions Already Made

- The flyer is structured content, not a freeform canvas.
- Direct manipulation is the primary editing model; drawers are secondary.
- Common row actions belong in a contextual toolbar, not the advanced drawer.
- Dragging reorders structured rows but never creates arbitrary coordinates or overlaps.
- Auto-fit is per section by default, with a manual override per section.
- Auto-fit has a 70% readability floor; content that still does not fit is flagged instead of silently clipped.
- Orange row dividers were removed. Orange is reserved for hierarchy and the Parsha banner.
- Flyer pictograms use one consistent vector family; section headers use gold-on-navy and schedule rows use navy-on-white within gold rings.
- Group labels share one measured font size per flyer, remain centered, and never wrap; the widest label determines the common size.
- Kiddush and Mazal Tov have no decorative left icon.
- Mazal Tov uses one heading and a list of entries.
- The sponsor separator only appears when sponsor content exists.
- בס״ד is permanent.
- Sections are a dynamic ordered array with a `column`/`wide` layout flag; the flyer page is a flex column so fixed bands hold proportions while columns and wide sections flex by row count. Seed sections keep stable ids so SSR and hydration match.
- Zmanim come from Chabad.org for Baltimore ZIP 21215, fetched server-side on the Worker and cached 24h. The endpoint is Chabad.org's internal webservice (unofficial). Only candle lighting auto-fills; minyan times are a shul decision, not a calculated zman.
- Saved versions are real files in a user-chosen folder (ideally a synced Dropbox/OneDrive/Drive folder); folder saving needs Chrome/Edge desktop. Drafts and templates remain device-local in localStorage. Cross-device beyond the synced folder still needs identity and a durable database.

## 4. Conventions

- Keep flyer content in the typed JSON-shaped `Draft` model.
- Add editing behavior through the structured inspector; do not add arbitrary positioning.
- Preserve print readability before visual density.
- Use the supplied OLY SVG as the canonical logo.
- Project documentation remains Markdown only.

## 5. Open Questions

- Should the next persistence layer support only one administrator, or multiple staff accounts?
- Zmanim and Parsha are now pulled from Chabad.org (ZIP 21215). Should the location be configurable for other communities, and should more times auto-fill (e.g. Motzai Shabbos / Shabbos-ends)?
- Should 1:1 always contain all content, or may low-priority programs move to a second image when the readability floor is reached?
- Should the app support a genuine mobile editing experience, given that HTML5 drag-and-drop and the File System Access API are desktop-only? (See mobile notes.)

## 6. Immediate Next Steps

1. Use direct editing, sections, zmanim auto-fill, and drag-reordering for two or three real weekly cycles and record friction.
2. Deploy to Cloudflare so the `/api/zmanim` route runs in production, then confirm times against Chabad.org.
3. Consider making the zmanim location configurable and auto-filling more times.
4. Add authenticated cloud persistence if cross-device access beyond the synced folder is required.
5. If mobile use matters, replace HTML5 drag-and-drop with a touch-capable reorder and add a non-folder persistence path for phones.

## 7. File Index

- `app/page.tsx` - editor state, sections, persistence, auto-fit, flyer renderer, zmanim + saved-versions panels, and export behavior
- `app/globals.css` - editor UI, flyer layouts, aspect ratios, and print styles
- `app/layout.tsx` - metadata and typography
- `app/fileVault.ts` - folder-backed saved-version storage (File System Access API)
- `app/zmanimClient.ts` - client zmanim fetch and the display list
- `worker/index.ts` - Cloudflare Worker entry; routes `/api/zmanim`
- `worker/zmanim.ts` - server-side Chabad.org zmanim fetch and parse
- `public/oly-logo.svg` - canonical supplied logo
- `specs/product-and-engineering-review.md` - UX and architecture decisions
- `README.md` - operating and development notes
- `session-logs/` - session handoffs
