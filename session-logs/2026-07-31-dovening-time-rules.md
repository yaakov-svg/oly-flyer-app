# Session: Dovening Time Rules

## Starting state

The zmanim engine pulled live Chabad.org times for Baltimore ZIP 21215, but auto-fill only wrote the parsha and the exact candle-lighting time. Every minyan time was typed by hand each week, even though the shul derives all of them from the same zmanim by a fixed set of rules.

## What was accomplished

- Added `app/doveningTimes.ts`, a pure module that encodes the shul's dovening rules against a week of Chabad.org zmanim:
  - Candle Lighting — exact Chabad.org time.
  - Friday Mincha — candle lighting + 10 min, rounded to the nearest 5.
  - Kabbalas Shabbos — Friday tzeis - 10 min, rounded to the nearest 5.
  - Shabbos Mincha — a multiple of 5 falling 20–25 min before Shabbos shkia.
  - Maariv Motzai Shabbos — the exact time Shabbos ends.
  - Weekday Mincha — earliest Sun–Thu shkia - 10 min, rounded to the nearest 5, never later than shkia - 8 min.
  - Weekday Maariv — latest Sun–Thu tzeis, rounded to the nearest 5, never earlier than that tzeis - 2 min.
- Treated the flyer week as Friday → Thursday, so "Sunday–Thursday of that week" are the weekdays after the Shabbos.
- Made auto-fill write all seven times into matching flyer rows. Group headers (`FRIDAY NIGHT`, `SHABBOS DAY`, `SUNDAY`, `MONDAY – TUESDAY`) decide which rule a `Mincha` or `Maariv` row gets; rows carrying extra meaning (`Maariv / Fast Ends`, `Mincha Gedola`, `Chassidus · Between Mincha & Maariv`) and rows the rules cannot classify are left untouched.
- Added a "Dovening times" block to the zmanim panel that lists each derived time with the rule and the zman it came from, and drops any of them into the selected row on click.
- Added `tests/dovening-times.test.mjs` (12 cases, including sweeps over every shkia and tzeis minute to prove the 20–25 min window, the 8-minute Mincha floor, and the 2-minute Maariv ceiling always hold).
- Verified in-browser against a stubbed week: derived times were 8:13 / 8:25 / 8:50 / 8:10 / 9:18 / 8:15 / 9:00 PM, all landed on the right flyer rows, and the fast-day and shiur rows were not disturbed.
- Passed lint (0 errors) and the production build.

## Ending state / handoff

One click now fills the parsha and every dovening time on the flyer from live Chabad.org zmanim. The rules live in one tested module, so changing a rounding rule is a one-line edit rather than a hunt through the React component.

## Open threads

- The zmanim location is still fixed to ZIP 21215; a second community would need it configurable.
- The rules assume group headers name the day or session. A flyer that drops them falls back to leaving Mincha/Maariv rows alone, with a message explaining why.
- Confirm the derived times against a printed week before relying on auto-fill unreviewed.

## Files created or modified

- `app/doveningTimes.ts` (new)
- `tests/dovening-times.test.mjs` (new)
- `app/page.tsx`
- `app/globals.css`
- `AGENTS.md`
- `README.md`
