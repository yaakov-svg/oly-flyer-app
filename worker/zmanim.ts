// Server-side Chabad.org zmanim fetch.
//
// The Chabad.org zmanim webservice returns JSON but sends no CORS headers, so
// the browser cannot call it directly. This module runs on the Cloudflare
// Worker (see worker/index.ts, which routes GET /api/zmanim here), fetches the
// times for a location + week, and returns a small, clean JSON shape the client
// can use to auto-fill the flyer. Location is fixed to Baltimore, MD 21215.

const CHABAD_ENDPOINT = "https://www.chabad.org/webservices/zmanim/zmanim/Get_Zmanim";
const AID = "143790";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

// locationType 2 = US ZIP code.
export const LOCATION = { locationId: "21215", locationType: "2", label: "Baltimore, MD 21215" };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface RawItem { ZmanType: string; Zman: string; Default: boolean }
interface RawGroup { Items: RawItem[] }
interface RawDay {
  TimeGroups: RawGroup[];
  Parsha: string | null;
  HolidayName: string | null;
  IsHoliday: boolean;
  DisplayDate: string;
  DayOfWeek: number;
}
interface RawResponse {
  Days: RawDay[];
  LocationName: string;
  Coordinates: { Latitude: number; Longitude: number };
}

export interface ZmanimDay {
  date: string; // ISO YYYY-MM-DD
  dow: number; // 0 = Sunday
  dayName: string;
  displayDate: string;
  parsha: string | null;
  holidayName: string | null;
  isHoliday: boolean;
  times: Record<string, string>; // ZmanType -> "8:02 PM"
}

export interface ZmanimResult {
  locationName: string;
  coordinates: { lat: number; lng: number };
  parsha: string | null; // the coming Shabbos parsha, for convenience
  days: ZmanimDay[];
  source: "chabad.org";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function displayToISO(display: string): string {
  const match = display.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? `${match[3]}-${pad2(Number(match[1]))}-${pad2(Number(match[2]))}` : display;
}

export async function fetchZmanim(dateISO: string, days = 7): Promise<ZmanimResult> {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");

  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d + (days - 1)));
  const sY = start.getUTCFullYear(), sM = start.getUTCMonth() + 1, sD = start.getUTCDate();
  const eY = end.getUTCFullYear(), eM = end.getUTCMonth() + 1, eD = end.getUTCDate();

  const params = new URLSearchParams({
    locationid: LOCATION.locationId,
    locationtype: LOCATION.locationType,
    tdate: `${sM}-${sD}-${sY}`,
    aid: AID,
    startdate: `${sM}/${sD}/${sY}`,
    enddate: `${eM}/${eD}/${eY}`,
  });

  const res = await fetch(`${CHABAD_ENDPOINT}?${params}`, {
    headers: {
      accept: "application/json",
      "user-agent": UA,
      "x-user-agent": `${UA} co_ajax/2.0`,
      referer: `https://www.chabad.org/calendar/zmanim_cdo/locationid/${LOCATION.locationId}/locationtype/${LOCATION.locationType}/tdate/${sM}-${sD}-${sY}`,
    },
  });
  if (!res.ok) throw new Error(`Chabad.org returned HTTP ${res.status}`);

  const raw = (await res.json()) as RawResponse;
  if (!raw?.Days?.length) throw new Error("Chabad.org returned no zmanim");

  const parsedDays: ZmanimDay[] = raw.Days.map((day) => {
    const times: Record<string, string> = {};
    for (const group of day.TimeGroups || []) {
      for (const item of group.Items || []) {
        if (!item.ZmanType) continue;
        // Prefer the default opinion when a zman has multiple.
        if (!(item.ZmanType in times) || item.Default) times[item.ZmanType] = item.Zman;
      }
    }
    return {
      date: displayToISO(day.DisplayDate),
      dow: day.DayOfWeek,
      dayName: DAY_NAMES[day.DayOfWeek] ?? "",
      displayDate: day.DisplayDate,
      parsha: day.Parsha,
      holidayName: day.HolidayName,
      isHoliday: day.IsHoliday,
      times,
    };
  });

  const shabbos = parsedDays.find((day) => day.dow === 6 && day.parsha) ?? parsedDays.find((day) => day.parsha);

  return {
    locationName: raw.LocationName,
    coordinates: { lat: raw.Coordinates?.Latitude, lng: raw.Coordinates?.Longitude },
    parsha: shabbos?.parsha ?? null,
    days: parsedDays,
    source: "chabad.org",
  };
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

// GET /api/zmanim?date=YYYY-MM-DD  ->  ZmanimResult (Friday..+6 days)
export async function handleZmanimRequest(url: URL): Promise<Response> {
  const dateISO = url.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return json({ error: "Provide ?date=YYYY-MM-DD" }, 400);
  }
  try {
    const result = await fetchZmanim(dateISO, 7);
    return json(result, 200, { "cache-control": "public, max-age=86400" });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Zmanim lookup failed" }, 502);
  }
}
