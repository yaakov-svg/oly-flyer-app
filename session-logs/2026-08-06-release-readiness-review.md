# Session: Release Readiness Review

## Starting state

The project documented dynamic sections, live Chabad.org zmanim, pure tested dovening-time rules, and folder-backed saved versions as complete. The handoff said build and lint passed and recommended deploying the Worker and validating a printed week.

## What was accomplished

- Reviewed the application, Worker route, persistence code, export flow, configuration, tests, and Sites deployment metadata without changing product code.
- Confirmed the production build succeeds.
- Confirmed all 12 dovening-time unit tests pass.
- Confirmed the production Worker route can fetch and parse a live seven-day Chabad.org response for Baltimore ZIP 21215.
- Confirmed the actual app source lints with 0 errors and 2 image-element warnings.
- Found five release gates:
  - `npm test` runs obsolete starter-skeleton tests, fails both tests, and does not run the dovening suite.
  - `npm run lint` scans a nested `.claude` worktree and generated output, producing 5 errors and 1,755 warnings even though the current app source has no lint errors.
  - `npm audit --omit=dev` reports three high-severity production dependency findings rooted in Next.js 16.2.6 and its transitive PostCSS and Sharp versions.
  - Saved-version filenames have only minute precision, so a second save in the same minute reuses and overwrites the prior JSON/PNG pair.
  - Loaded zmanim are not keyed to `draft.startDate`; after changing the Friday date, the already-open or reopened panel can still auto-fill the prior week's parsha and times until Refresh is clicked.
- Confirmed the current Sites deployment is version 4 at commit `36072ab6`, seven commits behind reviewed HEAD `38ab4f3`.
- Observed a lower-severity API validation gap: a syntactically valid but impossible date such as `2026-02-31` is accepted and normalized to March rather than rejected.

## Ending state / handoff

The app is functionally promising but not ready to ship. Fix the test and lint gates, upgrade the vulnerable runtime dependencies, bind zmanim data to the selected flyer week, and make saved-version names collision-safe. Then rerun the full release checks and deploy the exact reviewed commit. No product source files were changed during this review.

## Open threads

- Replace `tests/rendered-html.test.mjs` with product-specific server-render and API smoke tests.
- Change `npm test` to run both rendered/API coverage and `tests/dovening-times.test.mjs`.
- Ignore `.claude/**` (and nested generated output) in ESLint.
- Upgrade Next.js and aligned framework packages to patched compatible versions, then audit again.
- Store the fetched Friday date alongside zmanim or clear/refetch zmanim whenever `draft.startDate` changes.
- Add seconds/milliseconds or a unique suffix to version filenames.
- Reject impossible calendar dates at `/api/zmanim`.
- Deploy after all checks are green; the live version is currently seven commits behind.

## Files created or modified

- `C:\Users\yaako\Documents\OLY Flyer App\AGENTS.md`
- `C:\Users\yaako\Documents\OLY Flyer App\session-logs\2026-08-06-release-readiness-review.md`
