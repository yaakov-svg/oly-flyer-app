# Product and Engineering Review

## The product decision

The useful product is not a miniature Canva. It is a weekly publishing workflow with a constrained layout engine. The recurring structure should remain stable; the editor should expose only the choices that change week to week.

## Findings from the supplied flyers

- The three-column information architecture is strong and familiar.
- Repeated orange row rules make dense weeks noisy and weaken hierarchy.
- Icon repetition consumes width without adding meaning, especially in Kiddush, Mazal Tov, and Shiurim.
- Square and print flyers cannot share one global type-size value. Each region has a different content load and readability need.
- The old Mazal Tov treatment behaves like a stretched banner. Multiple simchos need a title-once list model.
- Weekly production requires draft identity and revision continuity, not just a single autosaved document.

## Implemented UX model

- Left: saved flyers and reusable templates.
- Center: live, selectable flyer preview with format switching and fit status.
- Right: focused section editing, row ordering, icon selection including None, per-section sizing, dates, sponsor, and Mazal Tov entries.
- Automatic saves are isolated by flyer so several Yom Tov drafts can coexist.

## Layout engine

Each section measures rendered content against its allocated height. Automatic sections scale independently in up to three measurement passes. The minimum scale is 70%. At that floor, unresolved overflow becomes a visible warning. This is safer than a global shrink control because a dense weekday schedule can compress without making a sparse Shabbos section unnecessarily small.

The layout preserves hierarchy by reducing, in order:

1. Internal spacing.
2. Row text size within the affected section.
3. Optional content only after an explicit user decision.

The engine never hides rows automatically.

## Persistence boundary

This version stores drafts and templates in the browser on the same device. That satisfies returning to multiple works in progress without creating an account system. Cross-device continuity requires authenticated storage; adding a shared unauthenticated database would create privacy and ownership problems.

## Recommended next phase

Run the editor for two or three real weeks before adding calculations. Capture every manual adjustment. Then encode only stable rules such as Friday Mincha offsets, fast-day grouping, and seasonal Pirkei Avos behavior. Calendar-provider selection and zmanim rules should be confirmed as business definitions first.
