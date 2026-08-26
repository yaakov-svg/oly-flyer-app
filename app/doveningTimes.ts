// Dovening (minyan) time rules.
//
// Chabad.org gives us halachic zmanim for Baltimore ZIP 21215 (see
// worker/zmanim.ts). Those are astronomical facts; the shul's dovening times
// are derived from them by a fixed set of house rules, encoded here:
//
//   Candle Lighting       exact Chabad.org time for Friday
//   Friday Mincha         candle lighting + 10 min, rounded to the nearest 5
//   Kabbalas Shabbos      Friday tzeis - 10 min, rounded to the nearest 5
//   Shabbos Mincha        20-25 min before Shabbos shkia, on a multiple of 5
//   Halacha Shiur         1 hour before Shabbos Mincha
//   Seder Niggunim        30 min after Shabbos Mincha from Pesach to Rosh
//                         Hashanah, 25 min after it the rest of the year
//   Maariv Motzai Shabbos exact "Shabbos Ends" time
//   Weekday Mincha        earliest shkia (Sun-Thu) - 10 min, rounded to the
//                         nearest 5, never later than shkia - 8 min
//   Weekday Maariv        latest tzeis (Sun-Thu), rounded to the nearest 5,
//                         never earlier than that tzeis - 2 min
//   Monday Chassidus      Maariv + 10 min once Maariv reaches 8:20 PM,
//                         otherwise a fixed 8:30 PM
//
// Everything here is pure and unit-tested (tests/dovening-times.test.mjs);
// the React layer only calls buildDoveningSchedule() and applyDoveningTimes().

import type { ZmanimDay, ZmanimResult } from "./zmanimClient";

export type DoveningKey =
  | "candleLighting"
  | "fridayMincha"
  | "kabbalasShabbos"
  | "shabbosMincha"
  | "shabbosHalachaShiur"
  | "sederNiggunim"
  | "motzaiShabbosMaariv"
  | "weekdayMincha"
  | "weekdayMaariv"
  | "mondayChassidus";

export interface DoveningTime {
  key: DoveningKey;
  label: string;
  rule: string;
  time: string | null;
  /** What the time was derived from, e.g. "Shkiah 8:32 PM · Thursday". */
  basis: string | null;
}

export interface DoveningSchedule {
  list: DoveningTime[];
  byKey: Record<DoveningKey, DoveningTime>;
}

// --- clock helpers ---------------------------------------------------------

/** "8:13 PM" -> minutes after midnight, or null when unparseable. */
export function parseClock(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*([AP])\.?M\.?$/i);
  if (!match) return null;
  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);
  if (hour12 < 1 || hour12 > 12 || minutes > 59) return null;
  const pm = match[3].toUpperCase() === "P";
  const hour = (hour12 % 12) + (pm ? 12 : 0);
  return hour * 60 + minutes;
}

/** Minutes after midnight -> "8:13 PM". Wraps across midnight. */
export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(total / 60);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const mm = String(total % 60).padStart(2, "0");
  return `${hour12}:${mm} ${hour24 < 12 ? "AM" : "PM"}`;
}

/** Nearest multiple of 5 minutes (x:x2 rounds down, x:x3 rounds up). */
export function roundTo5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function floorTo5(minutes: number): number {
  return Math.floor(minutes / 5) * 5;
}

function ceilTo5(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

// --- zman lookup -----------------------------------------------------------

// Chabad.org's ZmanType keys, with tolerant fallbacks in case the webservice
// renames one; the pattern is matched against the key names we did receive.
const ZMAN_ALIASES: Record<string, { keys: string[]; pattern: RegExp }> = {
  candleLighting: { keys: ["CandleLighting"], pattern: /candle/i },
  shkiah: { keys: ["Shkiah"], pattern: /shki|sunset/i },
  tzeis: { keys: ["Tzeis"], pattern: /tze[iy]s|tzais|nightfall|stars/i },
  // Chabad.org actually sends "ShabbatEndTime" on the Saturday entry, and that
  // day carries no Tzeis at all — so a pattern demanding "ends" matched nothing
  // and Motzai Shabbos Maariv silently never filled. Match "end" generally and
  // keep the older spellings as explicit keys.
  shabbosEnds: {
    keys: ["ShabbatEndTime", "ShabbosEnds", "ShabbatEnds", "ShabbosEndTime"],
    pattern: /shabb(os|at)\s*end/i,
  },
};

function zmanOf(day: ZmanimDay | undefined, name: keyof typeof ZMAN_ALIASES): string | null {
  if (!day?.times) return null;
  const alias = ZMAN_ALIASES[name];
  for (const key of alias.keys) {
    if (day.times[key]) return day.times[key];
  }
  const loose = Object.keys(day.times).find((key) => alias.pattern.test(key));
  return loose ? day.times[loose] : null;
}

function minutesOf(day: ZmanimDay | undefined, name: keyof typeof ZMAN_ALIASES): number | null {
  return parseClock(zmanOf(day, name));
}

// --- week shape ------------------------------------------------------------

/**
 * The Friday a new flyer should default to: today when today is Friday,
 * otherwise the next one. Uses local calendar parts, never toISOString(),
 * which would shift the day for anyone west of UTC.
 */
export function upcomingFriday(from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const FRIDAY = 5;
  date.setDate(date.getDate() + ((FRIDAY - date.getDay() + 7) % 7));
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Is this date in the Pesach -> Rosh Hashanah half of the year?
 *
 * Seder Niggunim runs 30 min after Mincha in the long-daylight half and 25 min
 * after it the rest of the year, so the only question is which side of Pesach /
 * Rosh Hashanah a Shabbos falls on. That is Nisan from the 15th onward, then
 * Iyar, Sivan, Tamuz, Av and Elul; Tishrei through mid-Nisan is the other half.
 * Adar I / Adar II in a leap year sit inside that other half either way.
 */
export function isPesachToRoshHashanah(isoDate: string | undefined | null): boolean {
  if (!isoDate) return false;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  let month = "";
  let day = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
      month: "long",
      day: "numeric",
    }).formatToParts(date);
    month = parts.find((part) => part.type === "month")?.value ?? "";
    day = Number(parts.find((part) => part.type === "day")?.value ?? 0);
  } catch {
    return false;
  }
  // Adar I / Adar II must not be mistaken for Av by a loose match.
  if (/^adar/i.test(month)) return false;
  if (/^nisan|^nissan/i.test(month)) return day >= 15;
  return /^iyar|^iyyar|^sivan|^tamuz|^tammuz|^av$|^menachem\s*av|^elul/i.test(month);
}

interface WeekDays {
  friday?: ZmanimDay;
  shabbos?: ZmanimDay;
  weekdays: ZmanimDay[]; // Sunday through Thursday of the same flyer week
}

/**
 * A flyer week runs Friday -> Thursday, so "Sunday-Thursday of that week" are
 * the Sun-Thu days that come *after* the Shabbos, not before it.
 */
export function splitWeek(days: ZmanimDay[]): WeekDays {
  const sorted = [...(days || [])].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  const friday = sorted.find((day) => day.dow === 5) ?? sorted[0];
  const shabbos = sorted.find((day) => day.dow === 6 && (!friday || day.date >= friday.date));
  const after = shabbos?.date ?? friday?.date ?? "";
  const isWeekday = (day: ZmanimDay) => day.dow >= 0 && day.dow <= 4;
  const weekdays = sorted.filter((day) => isWeekday(day) && day.date > after);
  return { friday, shabbos, weekdays: weekdays.length ? weekdays : sorted.filter(isWeekday) };
}

function extreme(
  days: ZmanimDay[],
  name: keyof typeof ZMAN_ALIASES,
  pick: "earliest" | "latest",
): { minutes: number; day: ZmanimDay } | null {
  let best: { minutes: number; day: ZmanimDay } | null = null;
  for (const day of days) {
    const minutes = minutesOf(day, name);
    if (minutes === null) continue;
    if (!best || (pick === "earliest" ? minutes < best.minutes : minutes > best.minutes)) {
      best = { minutes, day };
    }
  }
  return best;
}

// --- the rules -------------------------------------------------------------

export const DOVENING_RULES: { key: DoveningKey; label: string; rule: string }[] = [
  { key: "candleLighting", label: "Candle Lighting", rule: "Exact Chabad.org time" },
  { key: "fridayMincha", label: "Friday Mincha", rule: "10 min after candle lighting, to the nearest 5" },
  { key: "kabbalasShabbos", label: "Kabbalas Shabbos", rule: "10 min before Friday tzeis, to the nearest 5" },
  { key: "shabbosMincha", label: "Shabbos Mincha", rule: "20–25 min before shkia, on a multiple of 5" },
  { key: "shabbosHalachaShiur", label: "Halacha Shiur · Shabbos", rule: "1 hour before Shabbos Mincha" },
  { key: "sederNiggunim", label: "Seder Niggunim", rule: "30 min after Shabbos Mincha from Pesach to Rosh Hashanah, 25 min after it the rest of the year" },
  { key: "motzaiShabbosMaariv", label: "Maariv · Motzai Shabbos", rule: "Exact time Shabbos ends" },
  { key: "weekdayMincha", label: "Weekday Mincha", rule: "10 min before the earliest shkia (Sun–Thu), to the nearest 5; never under 8 min before shkia" },
  { key: "weekdayMaariv", label: "Weekday Maariv", rule: "Latest tzeis (Sun–Thu), to the nearest 5; never more than 2 min early" },
  { key: "mondayChassidus", label: "Chassidus · Monday night", rule: "10 min after Maariv once Maariv reaches 8:20 PM, otherwise 8:30 PM" },
];

/** Maariv at or after this time switches Monday Chassidus onto the +10 rule. */
const MONDAY_CHASSIDUS_PIVOT = 20 * 60 + 20; // 8:20 PM
const MONDAY_CHASSIDUS_DEFAULT = 20 * 60 + 30; // 8:30 PM

function entry(key: DoveningKey, time: string | null, basis: string | null): DoveningTime {
  const meta = DOVENING_RULES.find((item) => item.key === key)!;
  return { key, label: meta.label, rule: meta.rule, time, basis };
}

/** Applies every dovening rule to a week of Chabad.org zmanim. */
export function buildDoveningSchedule(result: ZmanimResult | null | undefined): DoveningSchedule {
  const { friday, shabbos, weekdays } = splitWeek(result?.days ?? []);

  // Candle Lighting - exact.
  const candleText = zmanOf(friday, "candleLighting");
  const candle = parseClock(candleText);

  // Friday Mincha - candle lighting + 10, rounded to the nearest 5.
  const fridayMincha = candle === null ? null : roundTo5(candle + 10);

  // Kabbalas Shabbos - Friday tzeis - 10, rounded to the nearest 5.
  const fridayTzeis = minutesOf(friday, "tzeis");
  const kabbalasShabbos = fridayTzeis === null ? null : roundTo5(fridayTzeis - 10);

  // Shabbos Mincha - a multiple of 5 that lands 20-25 min before shkia. The
  // earliest such slot (ceil of shkia-25) always falls inside that 5-min window.
  const shabbosShkia = minutesOf(shabbos, "shkiah");
  let shabbosMincha: number | null = null;
  if (shabbosShkia !== null) {
    const candidate = ceilTo5(shabbosShkia - 25);
    shabbosMincha = candidate <= shabbosShkia - 20 ? candidate : floorTo5(shabbosShkia - 20);
  }

  // Halacha shiur - a flat hour before Shabbos Mincha.
  const halachaShiur = shabbosMincha === null ? null : shabbosMincha - 60;

  // Seder Niggunim - after Shabbos Mincha; the gap depends on the season.
  const longDaylight = isPesachToRoshHashanah(shabbos?.date ?? friday?.date);
  const niggunimGap = longDaylight ? 30 : 25;
  const sederNiggunim = shabbosMincha === null ? null : shabbosMincha + niggunimGap;

  // Maariv Motzai Shabbos - exact time Shabbos ends.
  const shabbosEnds = zmanOf(shabbos, "shabbosEnds") ?? zmanOf(shabbos, "tzeis");

  // Weekday Mincha - 10 min before the earliest Sun-Thu shkia, rounded to the
  // nearest 5, then pulled back a slot if that would leave under 8 min.
  const earliestShkia = extreme(weekdays, "shkiah", "earliest");
  let weekdayMincha: number | null = null;
  if (earliestShkia) {
    weekdayMincha = roundTo5(earliestShkia.minutes - 10);
    while (earliestShkia.minutes - weekdayMincha < 8) weekdayMincha -= 5;
  }

  // Weekday Maariv - the latest Sun-Thu tzeis rounded to the nearest 5, then
  // pushed a slot later if that would start more than 2 min before tzeis.
  const latestTzeis = extreme(weekdays, "tzeis", "latest");
  let weekdayMaariv: number | null = null;
  if (latestTzeis) {
    weekdayMaariv = roundTo5(latestTzeis.minutes);
    while (latestTzeis.minutes - weekdayMaariv > 2) weekdayMaariv += 5;
  }

  // Monday night Chassidus - tracks Maariv only once Maariv is late enough,
  // and otherwise sits at a fixed 8:30 PM. The two branches meet exactly at
  // 8:20 PM (8:20 + 10 = 8:30), so the rule is continuous across the pivot.
  const mondayChassidus =
    weekdayMaariv === null
      ? null
      : weekdayMaariv >= MONDAY_CHASSIDUS_PIVOT
        ? weekdayMaariv + 10
        : MONDAY_CHASSIDUS_DEFAULT;

  const at = (day: ZmanimDay | undefined, label: string, value: string | number | null) => {
    if (value === null || value === undefined || !day) return null;
    const text = typeof value === "number" ? formatClock(value) : value;
    return `${label} ${text} · ${day.dayName}`;
  };

  const list: DoveningTime[] = [
    entry("candleLighting", candleText, at(friday, "Chabad.org candle lighting", candleText)),
    entry("fridayMincha", fridayMincha === null ? null : formatClock(fridayMincha), at(friday, "Candle lighting", candleText)),
    entry("kabbalasShabbos", kabbalasShabbos === null ? null : formatClock(kabbalasShabbos), at(friday, "Tzeis", fridayTzeis)),
    entry("shabbosMincha", shabbosMincha === null ? null : formatClock(shabbosMincha), at(shabbos, "Shkia", shabbosShkia)),
    entry(
      "shabbosHalachaShiur",
      halachaShiur === null ? null : formatClock(halachaShiur),
      shabbosMincha === null ? null : `Shabbos Mincha ${formatClock(shabbosMincha)} − 1 hr`,
    ),
    entry(
      "sederNiggunim",
      sederNiggunim === null ? null : formatClock(sederNiggunim),
      shabbosMincha === null
        ? null
        : `Shabbos Mincha ${formatClock(shabbosMincha)} + ${niggunimGap} min · ${longDaylight ? "Pesach–Rosh Hashanah" : "Rosh Hashanah–Pesach"}`,
    ),
    entry("motzaiShabbosMaariv", shabbosEnds, at(shabbos, "Shabbos ends", shabbosEnds)),
    entry(
      "weekdayMincha",
      weekdayMincha === null ? null : formatClock(weekdayMincha),
      at(earliestShkia?.day, "Earliest shkia", earliestShkia?.minutes ?? null),
    ),
    entry(
      "weekdayMaariv",
      weekdayMaariv === null ? null : formatClock(weekdayMaariv),
      at(latestTzeis?.day, "Latest tzeis", latestTzeis?.minutes ?? null),
    ),
    entry(
      "mondayChassidus",
      mondayChassidus === null ? null : formatClock(mondayChassidus),
      weekdayMaariv === null
        ? null
        : weekdayMaariv >= MONDAY_CHASSIDUS_PIVOT
          ? `Maariv ${formatClock(weekdayMaariv)} + 10 min`
          : `Maariv ${formatClock(weekdayMaariv)} is before 8:20 PM · fixed 8:30 PM`,
    ),
  ];

  const byKey = Object.fromEntries(list.map((item) => [item.key, item])) as Record<DoveningKey, DoveningTime>;
  return { list, byKey };
}

// --- applying the schedule to flyer rows ------------------------------------

type RowContext = "fridayNight" | "shabbosDay" | "motzai" | "weekday" | "unknown";

/**
 * Group headers ("FRIDAY NIGHT", "SHABBOS DAY", "MONDAY – TUESDAY") are rows
 * with no time; they tell us which rule a following Mincha/Maariv belongs to.
 */
export function contextOf(text: string): RowContext {
  const value = (text || "").toLowerCase();
  if (/motz/.test(value)) return "motzai";
  if (/friday\s*night|erev\s*shabb/.test(value)) return "fridayNight";
  if (/shabb(os|at)\s*(day|morning)/.test(value)) return "shabbosDay";
  if (/sunday|monday|tuesday|wednesday|thursday|weekday/.test(value)) return "weekday";
  if (/friday/.test(value)) return "fridayNight";
  // A bare "Shabbos …" heading is deliberately left unknown: it does not say
  // whether a Mincha under it is Friday's or Shabbos afternoon's.
  return "unknown";
}

interface RowLike {
  title: string;
  time?: string;
  note?: string;
}

/** "Monday–Friday", "Sunday - Thursday": a span of days, not one named day. */
const DAY_NAME = "sunday|monday|tuesday|wednesday|thursday|friday|shabbos|shabbat|saturday";
const DAY_RANGE = new RegExp(`(${DAY_NAME})\\s*(?:[–—-]|\\bthrough\\b|\\bto\\b)\\s*(${DAY_NAME})`, "i");

function isGroupHeader(row: RowLike): boolean {
  return !(row.time || "").trim();
}

/**
 * Which dovening time (if any) belongs in this row.
 *
 * `groupText` is the raw group header above the row. It exists because the
 * shiurim section heads its Shabbos block with a bare "SHABBOS", which
 * contextOf() deliberately reports as unknown (a Mincha under it could be
 * Friday's or Shabbos afternoon's). The shiur rules below are unambiguous by
 * name, so they can safely read that looser signal.
 */
export function ruleForRow(row: RowLike, context: RowContext, groupText = ""): DoveningKey | null {
  const title = (row.title || "").trim();
  const note = (row.note || "").trim();
  const time = (row.time || "").trim();
  const combined = `${title} ${note}`;
  const scoped = contextOf(combined);
  const where = scoped === "unknown" ? context : scoped;

  if (/candle\s*light/i.test(title)) return "candleLighting";
  if (/kabbal[ao]s?\s*shabb/i.test(title)) return "kabbalasShabbos";

  // Never touch rows that carry extra meaning ("Maariv / Fast Ends", "Mincha
  // Gedola", "Chassidus between Mincha & Maariv").
  if (/\bfast\b|gedola|ketana|between/i.test(combined)) return null;

  // Seder Niggunim only ever means the Shabbos-afternoon one.
  if (/seder\s*nig+un/i.test(title)) return "sederNiggunim";

  // Halacha shiur - the Shabbos-afternoon one. Accept the bare "SHABBOS"
  // heading the shiurim section uses, but never a weekday block.
  if (/halacha/i.test(title)) {
    const shabbosish =
      where === "shabbosDay" || (/shabb/i.test(`${groupText} ${combined}`) && where !== "weekday");
    return shabbosish ? "shabbosHalachaShiur" : null;
  }

  // Monday night Chassidus. The day usually lives in the time field
  // ("Monday 9:10 PM"), so look across title, note and time — but only the
  // shiur held on Monday *alone*, at night. "Chassidus 8:30 AM, Monday–Friday"
  // names Monday inside a range and is a morning shiur; it must not be touched.
  if (/chassidus/i.test(title)) {
    const haystack = `${combined} ${time}`;
    const namesMonday = /monday/i.test(haystack);
    const isRange = DAY_RANGE.test(haystack);
    const isMorning = /\d{1,2}:\d{2}\s*A\.?M\.?/i.test(time);
    if (namesMonday && !isRange && !isMorning) return "mondayChassidus";
    return null;
  }

  if (/^mincha\b/i.test(title)) {
    if (where === "fridayNight") return "fridayMincha";
    if (where === "shabbosDay") return "shabbosMincha";
    if (where === "weekday") return "weekdayMincha";
    return null;
  }

  if (/^maariv\b/i.test(title)) {
    // On Shabbos the only Maariv is Motzai Shabbos. Friday night's Maariv is
    // part of Kabbalas Shabbos, so it is left alone.
    if (where === "motzai" || where === "shabbosDay") return "motzaiShabbosMaariv";
    if (where === "weekday") return "weekdayMaariv";
    return null;
  }

  return null;
}

export interface ApplyResult<S> {
  sections: S[];
  /** Labels of the times that were written, for the confirmation message. */
  filled: string[];
}

/** A clock reading inside a longer string, e.g. the "9:10 PM" of "Monday 9:10 PM". */
const CLOCK_IN_TEXT = /\d{1,2}:\d{2}\s*[AP]\.?M\.?/i;

/**
 * Writes `next` into `existing` without losing any wording around it, so a row
 * reading "Monday 9:10 PM" becomes "Monday 9:20 PM" rather than a bare time.
 */
export function mergeTime(existing: string | undefined, next: string): string {
  const current = (existing || "").trim();
  if (!current || !CLOCK_IN_TEXT.test(current)) return next;
  return current.replace(CLOCK_IN_TEXT, next);
}

/**
 * Writes the derived dovening times into matching flyer rows. Rows we cannot
 * confidently classify are left exactly as the user typed them.
 */
export function applyDoveningTimes<R extends RowLike, S extends { title: string; rows: R[] }>(
  sections: S[],
  schedule: DoveningSchedule,
): ApplyResult<S> {
  const filled = new Set<string>();

  const next = sections.map((section) => {
    let context = contextOf(section.title);
    let groupText = section.title || "";
    const rows = section.rows.map((row) => {
      if (isGroupHeader(row)) {
        const header = contextOf(row.title);
        if (header !== "unknown") context = header;
        groupText = row.title || "";
        return row;
      }
      const key = ruleForRow(row, context, groupText);
      const time = key ? schedule.byKey[key]?.time : null;
      if (!key || !time) return row;
      const merged = mergeTime(row.time, time);
      filled.add(schedule.byKey[key].label);
      return merged === row.time ? row : { ...row, time: merged };
    });
    return { ...section, rows };
  });

  return { sections: next, filled: [...filled] };
}
