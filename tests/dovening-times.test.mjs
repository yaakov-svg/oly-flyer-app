// Unit tests for the dovening-time rules (app/doveningTimes.ts).
// Run with: node --test tests/dovening-times.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

const {
  applyDoveningTimes,
  buildDoveningSchedule,
  contextOf,
  formatClock,
  parseClock,
  roundTo5,
  ruleForRow,
  splitWeek,
  upcomingFriday,
} = await import("../app/doveningTimes.ts");

// A week shaped like the Chabad.org response: Friday .. Thursday.
function week(overrides = {}) {
  const base = [
    { date: "2026-07-17", dow: 5, dayName: "Friday", times: { CandleLighting: "8:13 PM", Shkiah: "8:31 PM", Tzeis: "9:00 PM" } },
    { date: "2026-07-18", dow: 6, dayName: "Saturday", times: { Shkiah: "8:32 PM", Tzeis: "9:00 PM", ShabbosEnds: "9:18 PM" } },
    { date: "2026-07-19", dow: 0, dayName: "Sunday", times: { Shkiah: "8:30 PM", Tzeis: "8:59 PM" } },
    { date: "2026-07-20", dow: 1, dayName: "Monday", times: { Shkiah: "8:29 PM", Tzeis: "8:58 PM" } },
    { date: "2026-07-21", dow: 2, dayName: "Tuesday", times: { Shkiah: "8:29 PM", Tzeis: "8:57 PM" } },
    { date: "2026-07-22", dow: 3, dayName: "Wednesday", times: { Shkiah: "8:28 PM", Tzeis: "8:56 PM" } },
    { date: "2026-07-23", dow: 4, dayName: "Thursday", times: { Shkiah: "8:27 PM", Tzeis: "8:55 PM" } },
  ];
  return {
    days: base.map((day) => ({ ...day, times: { ...day.times, ...(overrides[day.dayName] || {}) } })),
  };
}

test("clock helpers round-trip and round to fives", () => {
  assert.equal(parseClock("8:13 PM"), 20 * 60 + 13);
  assert.equal(parseClock("6:30 AM"), 6 * 60 + 30);
  assert.equal(parseClock("12:04 AM"), 4);
  assert.equal(parseClock("12:04 PM"), 12 * 60 + 4);
  assert.equal(parseClock("Friday after Mincha"), null);
  assert.equal(parseClock(""), null);
  assert.equal(formatClock(20 * 60 + 5), "8:05 PM");
  assert.equal(formatClock(12 * 60), "12:00 PM");
  assert.equal(formatClock(0), "12:00 AM");
  assert.equal(roundTo5(parseClock("8:22 PM")), parseClock("8:20 PM"));
  assert.equal(roundTo5(parseClock("8:23 PM")), parseClock("8:25 PM"));
});

test("a flyer week runs Friday through Thursday", () => {
  const { friday, shabbos, weekdays } = splitWeek(week().days);
  assert.equal(friday.dayName, "Friday");
  assert.equal(shabbos.dayName, "Saturday");
  assert.deepEqual(
    weekdays.map((day) => day.dayName),
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
  );
});

test("a new flyer defaults to the upcoming Friday", () => {
  const local = (y, m, d, hour = 12) => new Date(y, m - 1, d, hour);
  // Week of Fri 7 Aug 2026.
  assert.equal(upcomingFriday(local(2026, 8, 3)), "2026-08-07"); // Monday
  assert.equal(upcomingFriday(local(2026, 8, 6)), "2026-08-07"); // Thursday
  assert.equal(upcomingFriday(local(2026, 8, 7)), "2026-08-07"); // Friday itself
  assert.equal(upcomingFriday(local(2026, 8, 8)), "2026-08-14"); // Shabbos rolls on
  assert.equal(upcomingFriday(local(2026, 8, 9)), "2026-08-14"); // Sunday

  // Late-evening local time must not roll into the next UTC day, and the
  // result must cross month and year boundaries correctly.
  assert.equal(upcomingFriday(local(2026, 8, 3, 23)), "2026-08-07");
  assert.equal(upcomingFriday(local(2026, 8, 31)), "2026-09-04");
  assert.equal(upcomingFriday(local(2026, 12, 28)), "2027-01-01");

  // Always a Friday, always parseable back to the same day.
  for (let offset = 0; offset < 400; offset += 1) {
    const day = local(2026, 1, 1 + offset);
    const iso = upcomingFriday(day);
    const [y, m, d] = iso.split("-").map(Number);
    assert.equal(new Date(y, m - 1, d).getDay(), 5, `${iso} is not a Friday`);
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("candle lighting is the exact Chabad.org time", () => {
  assert.equal(buildDoveningSchedule(week()).byKey.candleLighting.time, "8:13 PM");
});

test("Friday Mincha is 10 min after candle lighting, to the nearest 5", () => {
  assert.equal(buildDoveningSchedule(week()).byKey.fridayMincha.time, "8:25 PM"); // 8:23 -> 8:25
  const later = week({ Friday: { CandleLighting: "8:17 PM" } });
  assert.equal(buildDoveningSchedule(later).byKey.fridayMincha.time, "8:25 PM"); // 8:27 -> 8:25
  const early = week({ Friday: { CandleLighting: "4:26 PM" } });
  assert.equal(buildDoveningSchedule(early).byKey.fridayMincha.time, "4:35 PM"); // 4:36 -> 4:35
});

test("Kabbalas Shabbos is 10 min before Friday tzeis, to the nearest 5", () => {
  assert.equal(buildDoveningSchedule(week()).byKey.kabbalasShabbos.time, "8:50 PM"); // 9:00 - 10
  const shifted = week({ Friday: { Tzeis: "9:03 PM" } });
  assert.equal(buildDoveningSchedule(shifted).byKey.kabbalasShabbos.time, "8:55 PM"); // 8:53 -> 8:55
});

test("Shabbos Mincha lands on a five, 20 to 25 min before shkia", () => {
  for (const minute of Array.from({ length: 60 }, (_, i) => i)) {
    const shkia = `8:${String(minute).padStart(2, "0")} PM`;
    const schedule = buildDoveningSchedule(week({ Saturday: { Shkiah: shkia } }));
    const mincha = parseClock(schedule.byKey.shabbosMincha.time);
    const lead = parseClock(shkia) - mincha;
    assert.equal(mincha % 5, 0, `${shkia} -> ${schedule.byKey.shabbosMincha.time} is not on a five`);
    assert.ok(lead >= 20 && lead <= 25, `${shkia} -> ${schedule.byKey.shabbosMincha.time} is ${lead} min before shkia`);
  }
  assert.equal(buildDoveningSchedule(week()).byKey.shabbosMincha.time, "8:10 PM"); // shkia 8:32
});

test("Motzai Shabbos Maariv is the exact time Shabbos ends", () => {
  assert.equal(buildDoveningSchedule(week()).byKey.motzaiShabbosMaariv.time, "9:18 PM");
});

test("Weekday Mincha follows the earliest Sun-Thu shkia and keeps an 8 min floor", () => {
  // Earliest shkia in the sample week is Thursday 8:27 PM -> 8:17 -> 8:15.
  assert.equal(buildDoveningSchedule(week()).byKey.weekdayMincha.time, "8:15 PM");
  assert.match(buildDoveningSchedule(week()).byKey.weekdayMincha.basis, /Thursday/);

  for (const minute of Array.from({ length: 60 }, (_, i) => i)) {
    const shkia = `8:${String(minute).padStart(2, "0")} PM`;
    const schedule = buildDoveningSchedule(
      week({ Sunday: { Shkiah: shkia }, Monday: { Shkiah: "9:30 PM" }, Tuesday: { Shkiah: "9:30 PM" }, Wednesday: { Shkiah: "9:30 PM" }, Thursday: { Shkiah: "9:30 PM" } }),
    );
    const mincha = parseClock(schedule.byKey.weekdayMincha.time);
    assert.equal(mincha % 5, 0);
    assert.ok(parseClock(shkia) - mincha >= 8, `${shkia} -> ${schedule.byKey.weekdayMincha.time} is under 8 min before shkia`);
  }
});

test("Weekday Maariv follows the latest Sun-Thu tzeis and is never more than 2 min early", () => {
  // Latest tzeis in the sample week is Sunday 8:59 PM -> 9:00 PM.
  const schedule = buildDoveningSchedule(week());
  assert.equal(schedule.byKey.weekdayMaariv.time, "9:00 PM");
  assert.match(schedule.byKey.weekdayMaariv.basis, /Sunday/);

  for (const minute of Array.from({ length: 60 }, (_, i) => i)) {
    const tzeis = `9:${String(minute).padStart(2, "0")} PM`;
    const one = buildDoveningSchedule(
      week({ Sunday: { Tzeis: tzeis }, Monday: { Tzeis: "7:00 PM" }, Tuesday: { Tzeis: "7:00 PM" }, Wednesday: { Tzeis: "7:00 PM" }, Thursday: { Tzeis: "7:00 PM" } }),
    );
    const maariv = parseClock(one.byKey.weekdayMaariv.time);
    assert.equal(maariv % 5, 0);
    assert.ok(parseClock(tzeis) - maariv <= 2, `${tzeis} -> ${one.byKey.weekdayMaariv.time} is more than 2 min early`);
  }
});

test("missing zmanim degrade to null instead of throwing", () => {
  const schedule = buildDoveningSchedule({ days: [] });
  for (const item of schedule.list) assert.equal(item.time, null);
  assert.equal(buildDoveningSchedule(null).list.length, 7);
});

test("group headers decide which rule a Mincha or Maariv row gets", () => {
  assert.equal(contextOf("FRIDAY NIGHT"), "fridayNight");
  assert.equal(contextOf("SHABBOS DAY"), "shabbosDay");
  assert.equal(contextOf("MONDAY – TUESDAY"), "weekday");
  assert.equal(contextOf("Shabbos Schedule"), "unknown");

  assert.equal(ruleForRow({ title: "Mincha" }, "fridayNight"), "fridayMincha");
  assert.equal(ruleForRow({ title: "Mincha" }, "shabbosDay"), "shabbosMincha");
  assert.equal(ruleForRow({ title: "Mincha" }, "weekday"), "weekdayMincha");
  assert.equal(ruleForRow({ title: "Maariv", note: "Motzai Shabbos" }, "shabbosDay"), "motzaiShabbosMaariv");
  assert.equal(ruleForRow({ title: "Maariv" }, "weekday"), "weekdayMaariv");
  assert.equal(ruleForRow({ title: "Maariv / Fast Ends" }, "weekday"), null);
  assert.equal(ruleForRow({ title: "Mincha Gedola" }, "weekday"), null);
  assert.equal(ruleForRow({ title: "Chassidus", note: "Between Mincha & Maariv" }, "weekday"), null);
  assert.equal(ruleForRow({ title: "Shacharis" }, "weekday"), null);
  assert.equal(ruleForRow({ title: "Mincha" }, "unknown"), null);
});

test("applying the schedule fills matching rows and leaves the rest alone", () => {
  const sections = [
    {
      title: "Shabbos Schedule",
      rows: [
        { title: "FRIDAY NIGHT", time: "" },
        { title: "Candle Lighting", time: "7:00 PM" },
        { title: "Mincha", time: "7:00 PM" },
        { title: "Kabbalas Shabbos", time: "7:00 PM" },
        { title: "SHABBOS DAY", time: "" },
        { title: "Shacharis", time: "10:00 AM" },
        { title: "Mincha", time: "7:00 PM" },
        { title: "Pirkei Avos", time: "Perek Sheni" },
        { title: "Maariv", time: "7:00 PM", note: "Motzai Shabbos" },
      ],
    },
    {
      title: "Weekday Minyanim",
      rows: [
        { title: "SUNDAY", time: "" },
        { title: "Shacharis", time: "7:30 AM  |  9:30 AM" },
        { title: "Mincha", time: "7:00 PM" },
        { title: "Maariv", time: "7:00 PM" },
        { title: "THURSDAY – 9 AV", time: "" },
        { title: "Maariv / Fast Ends", time: "8:58 PM" },
      ],
    },
  ];

  const { sections: next, filled } = applyDoveningTimes(sections, buildDoveningSchedule(week()));
  const times = (index) => next[index].rows.map((row) => row.time);

  assert.deepEqual(times(0), [
    "",
    "8:13 PM", // candle lighting, exact
    "8:25 PM", // Friday Mincha
    "8:50 PM", // Kabbalas Shabbos
    "",
    "10:00 AM", // untouched
    "8:10 PM", // Shabbos Mincha
    "Perek Sheni", // untouched
    "9:18 PM", // Motzai Shabbos Maariv
  ]);
  assert.deepEqual(times(1), ["", "7:30 AM  |  9:30 AM", "8:15 PM", "9:00 PM", "", "8:58 PM"]);
  assert.equal(filled.length, 7);
  assert.deepEqual(sections[0].rows[2].time, "7:00 PM"); // input not mutated
});
