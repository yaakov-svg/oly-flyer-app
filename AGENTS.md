# OLY Zmanim Studio

## 1. What This Project Is

A structured weekly flyer editor for Ohel Levi Yitzchok. It turns repeatable zmanim content into print, WhatsApp, and social layouts without freeform canvas work.

## 2. Current State

The fourth visual refinement pass is complete. Placeholder text glyphs were replaced with a cohesive vector icon family based on the supplied reference flyers, including a custom paired-candle treatment and additional calendar, announcement, Mazal Tov, location, special, and sunset choices. Header and row icons use distinct gold/navy treatments. Day and section labels are centered, kept on one line, and automatically reduced based on length instead of breaking weekday names. The flyer library and advanced settings remain optional drawers. Build and lint pass, and icon rendering plus all group-label geometry were verified in the browser.

## 3. Key Decisions Already Made

- The flyer is structured content, not a freeform canvas.
- Direct manipulation is the primary editing model; drawers are secondary.
- Common row actions belong in a contextual toolbar, not the advanced drawer.
- Dragging reorders structured rows but never creates arbitrary coordinates or overlaps.
- Auto-fit is per section by default, with a manual override per section.
- Auto-fit has a 70% readability floor; content that still does not fit is flagged instead of silently clipped.
- Orange row dividers were removed. Orange is reserved for hierarchy and the Parsha banner.
- Flyer pictograms use one consistent vector family; section headers use gold-on-navy and schedule rows use navy-on-white within gold rings.
- Group labels remain centered and never wrap; long labels reduce in size before consuming the divider space.
- Kiddush and Mazal Tov have no decorative left icon.
- Mazal Tov uses one heading and a list of entries.
- The sponsor separator only appears when sponsor content exists.
- בס״ד is permanent.
- Drafts and templates are device-local for this version. Cross-device storage needs identity and a durable database.

## 4. Conventions

- Keep flyer content in the typed JSON-shaped `Draft` model.
- Add editing behavior through the structured inspector; do not add arbitrary positioning.
- Preserve print readability before visual density.
- Use the supplied OLY SVG as the canonical logo.
- Project documentation remains Markdown only.

## 5. Open Questions

- Should the next persistence layer support only one administrator, or multiple staff accounts?
- Should zmanim and Parsha be entered manually, imported from a weekly data file, or calculated from a trusted calendar provider?
- Should 1:1 always contain all content, or may low-priority programs move to a second image when the readability floor is reached?

## 6. Immediate Next Steps

1. Use direct editing, row actions, and drag-reordering for two or three real weekly cycles and record where a drawer is still required for a common task.
2. Add authenticated cloud persistence if cross-device access is required.
3. Add JSON import/export and weekly duplication controls if local backup is needed before cloud persistence.
4. Formalize the zmanim calculation rules as executable data after their business definitions are confirmed.

## 7. File Index

- `app/page.tsx` - editor state, persistence, auto-fit, flyer renderer, and export behavior
- `app/globals.css` - editor UI, flyer layouts, aspect ratios, and print styles
- `app/layout.tsx` - metadata and typography
- `public/oly-logo.svg` - canonical supplied logo
- `specs/product-and-engineering-review.md` - UX and architecture decisions
- `README.md` - operating and development notes
- `session-logs/` - session handoffs
