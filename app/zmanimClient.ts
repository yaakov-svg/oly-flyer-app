// Client-side helper for the Chabad.org zmanim engine.
// The actual Chabad.org request happens server-side on the Worker
// (worker/zmanim.ts, routed at GET /api/zmanim) because Chabad.org sends no
// CORS headers. This module just calls that route and shapes the result.

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
  parsha: string | null;
  days: ZmanimDay[];
  source: string;
}

export async function loadZmanim(dateISO: string): Promise<ZmanimResult> {
  const res = await fetch(`/api/zmanim?date=${encodeURIComponent(dateISO)}`);
  const data = (await res.json().catch(() => null)) as ZmanimResult | { error?: string } | null;
  if (!res.ok || !data || "error" in data) {
    throw new Error((data && "error" in data && data.error) || `Zmanim lookup failed (${res.status})`);
  }
  return data as ZmanimResult;
}

// Which zmanim to surface in the panel, in display order, with friendly labels.
export const ZMANIM_ROWS: { type: string; label: string }[] = [
  { type: "AlosHashachar", label: "Alos Hashachar" },
  { type: "NetzHachamah", label: "Sunrise · Netz" },
  { type: "LatestShema", label: "Latest Shema" },
  { type: "LatestTefillah", label: "Latest Tefillah" },
  { type: "Chatzos", label: "Chatzos" },
  { type: "MinchahGedolah", label: "Mincha Gedola" },
  { type: "PlagHaminchah", label: "Plag Hamincha" },
  { type: "CandleLighting", label: "Candle Lighting" },
  { type: "Shkiah", label: "Sunset · Shkiah" },
  { type: "Tzeis", label: "Nightfall · Tzeis" },
  { type: "ShabbosEnds", label: "Shabbos Ends" },
];
