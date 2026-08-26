"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";
import {
  type FsDirectoryHandle,
  type VersionMeta,
  folderPermission,
  isFileVaultSupported,
  listVersions,
  loadFolder,
  pickFolder,
  readVersion,
  saveVersion,
} from "./fileVault";
import { ZMANIM_ROWS, loadZmanim, type ZmanimResult } from "./zmanimClient";
import { applyDoveningTimes, buildDoveningSchedule, upcomingFriday } from "./doveningTimes";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Flame,
  Heart,
  MapPin,
  Megaphone,
  Music2,
  Star,
  Sun,
  UsersRound,
  Wine,
  type LucideIcon,
} from "lucide-react";

type Aspect = "letter" | "square" | "portrait";
type IconName = "none" | "candles" | "clock" | "people" | "book" | "music" | "cup" | "calendar" | "announcement" | "heart" | "location" | "star" | "sunset";
// Sections are identified by a per-draft id string (was a fixed union).
type SectionKey = string;
type SectionLayout = "column" | "wide";

type Row = {
  id: string;
  title: string;
  time?: string;
  note?: string;
  icon: IconName;
};

type FlyerSection = {
  id: string;
  title: string;
  icon: IconName;
  layout: SectionLayout;
  autoFit: boolean;
  manualScale: number;
  rows: Row[];
};

type MazalTov = { id: string; text: string };
type Sponsor = { id: string; text: string };
type DraggedRow = { section: SectionKey; id: string } | null;
type RowMenu = { kind: "icons" | "more"; x: number; y: number } | null;

type Draft = {
  id: string;
  name: string;
  updatedAt: number;
  aspect: Aspect;
  parsha: string;
  /** Word before the parsha in the banner. Cleared for a Yom Tov title. */
  ribbonPrefix: string;
  /** Banner text scale, so a long parsha name still fits the ribbon. */
  ribbonScale: number;
  startDate: string;
  hebrewDates: string;
  englishDates: string;
  /** Kiddush sponsors, listed one per line. Was a single `sponsor` string. */
  sponsors: Sponsor[];
  specialNotice: string;
  mazalTovs: MazalTov[];
  sections: FlyerSection[];
  /** Whole-flyer text scale, and an extra one just for the date lines. */
  textScale: number;
  weekDetailsScale: number;
};

const iconOptions: Record<IconName, { label: string; component: LucideIcon | null }> = {
  none: { label: "None", component: null },
  candles: { label: "Candles", component: Flame },
  clock: { label: "Clock", component: Clock3 },
  people: { label: "People", component: UsersRound },
  book: { label: "Open book", component: BookOpen },
  music: { label: "Music", component: Music2 },
  cup: { label: "Kiddush cup", component: Wine },
  calendar: { label: "Calendar", component: CalendarDays },
  announcement: { label: "Announcement", component: Megaphone },
  heart: { label: "Mazal Tov", component: Heart },
  location: { label: "Location", component: MapPin },
  star: { label: "Special", component: Star },
  sunset: { label: "Sunset", component: Sun },
};

const iconNames = Object.keys(iconOptions) as IconName[];

const uid = () => Math.random().toString(36).slice(2, 10);

const row = (title: string, time = "", icon: IconName = "none", note = ""): Row => ({
  id: uid(),
  title,
  time,
  icon,
  note,
});

const section = (id: string, title: string, icon: IconName, layout: SectionLayout, rows: Row[]): FlyerSection => ({
  id,
  title,
  icon,
  layout,
  autoFit: true,
  manualScale: 1,
  rows,
});

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function dateRange(value: string) {
  if (!value) return { english: "", hebrew: "" };
  const start = addDays(value, 0);
  const end = addDays(value, 6);
  const englishFormat = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const hebrewFormat = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    english: `${englishFormat.format(start)} – ${englishFormat.format(end)}`.toUpperCase(),
    hebrew: `${hebrewFormat.format(start)} – ${hebrewFormat.format(end)}`.toUpperCase(),
  };
}

// "5786" for the Shabbos of a given Friday, for naming a flyer.
function hebrewYear(value: string): string {
  return new Intl.DateTimeFormat("en-US-u-ca-hebrew", { year: "numeric" }).format(addDays(value, 1));
}

// A new flyer defaults to the upcoming Friday, but the seed itself is fixed so
// the server and the first client render agree. The hydration effect and the
// "New flyer" action pass the real upcoming Friday, which is client-only.
const SEED_START_DATE = "2026-08-14";

// The seed is a plain weekly week: no fast days, yom tov, or other one-off
// content, because it is the starting point for every future week. Its parsha
// and times are placeholders — they are replaced with the live ones as soon as
// the zmanim for the flyer's own Friday come back.
function seedDraft(startDate: string = SEED_START_DATE): Draft {
  const dates = dateRange(startDate);
  return {
    id: uid(),
    name: "Shoftim 5786",
    updatedAt: Date.now(),
    aspect: "letter",
    parsha: "SHOFTIM",
    ribbonPrefix: "PARSHAS",
    ribbonScale: 1,
    startDate,
    hebrewDates: dates.hebrew,
    englishDates: dates.english,
    // Per-week announcements start empty: a stale sponsor or mazal tov carried
    // into a new flyer is worse than a blank one.
    sponsors: [],
    specialNotice: "",
    mazalTovs: [],
    textScale: 1,
    weekDetailsScale: 1,
    sections: [
      section("shabbos", "Shabbos Schedule", "candles", "column", [
        row("FRIDAY NIGHT", "", "none"),
        row("Candle Lighting", "8:13 PM", "candles"),
        row("Mincha", "8:25 PM", "clock"),
        row("Kabbalas Shabbos", "8:50 PM", "candles"),
        row("SHABBOS DAY", "", "none"),
        row("Shacharis", "10:00 AM", "people"),
        row("Mincha", "8:10 PM", "clock"),
        row("Pirkei Avos", "Perek Sheni", "book"),
        row("Seder Niggunim", "8:40 PM", "music"),
        row("Maariv", "9:18 PM", "cup", "Motzai Shabbos"),
      ]),
      section("weekday", "Weekday Minyanim", "people", "column", [
        row("SUNDAY", "", "none"),
        row("Shacharis", "7:30 AM  |  9:30 AM", "none"),
        row("Mincha", "8:20 PM", "none"),
        row("Maariv", "9:00 PM", "none"),
        row("MONDAY – THURSDAY", "", "none"),
        row("Shacharis", "6:30 AM", "none"),
        row("Mincha", "8:20 PM", "none"),
        row("Maariv", "9:00 PM", "none"),
        row("FRIDAY", "", "none"),
        row("Shacharis", "6:30 AM", "none"),
      ]),
      section("shiurim", "Shiurim & Learning", "book", "column", [
        row("SHABBOS", "", "none"),
        row("Chassidus", "Friday after Mincha", "none", "R’ Lisbon"),
        row("Chassidus", "9:15 AM", "none", "R’ Lisbon"),
        row("Halacha", "7:10 PM", "none", "R’ Block"),
        row("WEEKDAY", "", "none"),
        row("Daily Gemara", "5:50 AM", "none", "Sunday 6:50 AM · R’ Lisbon"),
        row("Chassidus", "8:30 AM", "none", "Monday–Friday · R’ Lisbon"),
        row("Chassidus", "Between Mincha & Maariv", "none", "R’ Bukiet"),
        row("Chassidus", "Monday 9:10 PM", "none", "R’ Slavaticki"),
      ]),
      section("programs", "Children & Community Programs", "people", "wide", [
        row("Children’s Program", "Shabbos 10:45 AM", "people", "Lower Level · Ages 3–7"),
        row("Girls Group", "Shabbos 10:30 AM", "people", "3418 Bancroft Rd · Grades 2–7"),
        row("Ladies Tehillim", "Sunday 11:00 AM", "people", "Weintraub Residence"),
        row("Sunday Morning Learning", "8:45–11:45 AM", "book", "Breakfast included"),
      ]),
    ],
  };
}

// Migrate older drafts: sections used to be a keyed object, the Kiddush used to
// be a single `sponsor` string, and the two text scales did not exist.
function normalizeDraft(raw: Draft): Draft {
  const legacySponsor = (raw as unknown as { sponsor?: string }).sponsor;
  const sponsors: Sponsor[] = Array.isArray(raw?.sponsors)
    ? raw.sponsors.filter(Boolean).map((item) => ({ id: item.id || uid(), text: item.text ?? "" }))
    : legacySponsor
      ? [{ id: uid(), text: legacySponsor }]
      : [];
  const scales = {
    sponsors,
    textScale: raw?.textScale ?? 1,
    weekDetailsScale: raw?.weekDetailsScale ?? 1,
    ribbonPrefix: raw?.ribbonPrefix ?? "PARSHAS",
    ribbonScale: raw?.ribbonScale ?? 1,
  };

  const rawSections = raw?.sections as unknown;
  if (Array.isArray(rawSections)) {
    return {
      ...raw,
      ...scales,
      sections: rawSections.map((sec: FlyerSection, index) => ({
        ...sec,
        id: sec.id || uid(),
        layout: sec.layout || (index === rawSections.length - 1 ? "wide" : "column"),
        autoFit: sec.autoFit ?? true,
        manualScale: sec.manualScale ?? 1,
        rows: sec.rows ?? [],
      })),
    };
  }
  const legacy = (rawSections ?? {}) as Record<string, Omit<FlyerSection, "id" | "layout">>;
  const order = ["shabbos", "weekday", "shiurim", "programs"];
  const keys = order.filter((key) => legacy[key]).concat(Object.keys(legacy).filter((key) => !order.includes(key)));
  const sections: FlyerSection[] = keys.map((key) => ({
    id: uid(),
    title: legacy[key].title,
    icon: legacy[key].icon,
    layout: key === "programs" ? "wide" : "column",
    autoFit: legacy[key].autoFit ?? true,
    manualScale: legacy[key].manualScale ?? 1,
    rows: legacy[key].rows ?? [],
  }));
  return { ...raw, ...scales, sections: sections.length ? sections : seedDraft().sections };
}

const STORAGE_DRAFTS = "oly-zmanim-drafts-v1";
const STORAGE_TEMPLATES = "oly-zmanim-templates-v1";
const STORAGE_VERSION_INDEX = "oly-zmanim-version-index-v1";

// A lightweight list of saved versions (no flyer content) so the "Past flyers"
// list still shows even before the folder is reconnected after a restart.
function loadVersionIndex(): VersionMeta[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_VERSION_INDEX) || "[]") as VersionMeta[];
  } catch {
    return [];
  }
}

function saveVersionIndex(list: VersionMeta[]) {
  try {
    localStorage.setItem(STORAGE_VERSION_INDEX, JSON.stringify(list));
  } catch {
    // Non-fatal: the folder remains the source of truth.
  }
}

const savedTimeFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatSavedTime(ts: number) {
  return savedTimeFormat.format(ts);
}

function IconMark({ name }: { name: Exclude<IconName, "none"> }) {
  if (name === "candles") {
    return (
      <span className="candle-pair" aria-hidden="true">
        <span className="candle"><Flame /></span>
        <span className="candle"><Flame /></span>
      </span>
    );
  }
  const Glyph = iconOptions[name].component!;
  return <Glyph aria-hidden="true" />;
}

function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  if (name === "none") return null;
  return <span className={`flyer-icon icon-${name} ${small ? "small" : ""}`}><IconMark name={name} /></span>;
}

function ActionIcon({ name }: { name: IconName }) {
  return name === "none" ? <span className="add-icon-mark">＋</span> : <span className="action-icon-mark"><IconMark name={name} /></span>;
}

function FitPill({ status }: { status: "fits" | "tight" | "overflow" }) {
  return <span className={`fit-pill ${status}`}>{status === "fits" ? "Fits" : status === "tight" ? "Tight fit" : "Needs attention"}</span>;
}

function InlineEdit({
  value,
  onCommit,
  className = "",
  label,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <span
      ref={ref}
      className={`inline-edit ${className}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      tabIndex={0}
      onBlur={(event) => {
        const next = event.currentTarget.innerText.trim();
        if (next && next !== value) onCommit(next);
        else event.currentTarget.innerText = value;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.currentTarget.innerText = value;
          event.currentTarget.blur();
        }
      }}
    >
      {value}
    </span>
  );
}

function FlyerCard({
  sectionKey,
  section,
  scale,
  selected,
  onSelect,
  onUpdateSection,
  onUpdateRow,
  draggedRow,
  setDraggedRow,
  onMoveRow,
  selectedRow,
  onSelectRow,
  onDuplicateRow,
  onOpenRowMenu,
}: {
  sectionKey: SectionKey;
  section: FlyerSection;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onUpdateSection: (values: Partial<FlyerSection>) => void;
  onUpdateRow: (id: string, values: Partial<Row>) => void;
  draggedRow: DraggedRow;
  setDraggedRow: (value: DraggedRow) => void;
  onMoveRow: (source: SectionKey, id: string, target: SectionKey, beforeId?: string) => void;
  selectedRow: DraggedRow;
  onSelectRow: (section: SectionKey, id: string) => void;
  onDuplicateRow: (section: SectionKey, id: string) => void;
  onOpenRowMenu: (kind: "icons" | "more", section: SectionKey, id: string, anchor: HTMLButtonElement) => void;
}) {
  return (
    <section className={`flyer-card ${selected ? "selected" : ""}`} onClick={onSelect} data-section={sectionKey}>
      <header className="flyer-card-header">
        <Icon name={section.icon} />
        <h2><InlineEdit value={section.title} label={`${section.title} title`} onCommit={(title) => onUpdateSection({ title })} /></h2>
      </header>
      <div
        className="flyer-card-body"
        data-fit-section={sectionKey}
        style={{ "--fit-scale": scale * (section.autoFit ? 1 : section.manualScale) } as React.CSSProperties}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (draggedRow) onMoveRow(draggedRow.section, draggedRow.id, sectionKey);
          setDraggedRow(null);
        }}
      >
        {section.rows.map((item) => {
          const isLabel = !item.time && item.icon === "none";
          return (
            <div
              className={`flyer-row ${isLabel ? "group-label" : ""} ${draggedRow?.id === item.id ? "dragging" : ""} ${selectedRow?.section === sectionKey && selectedRow.id === item.id ? "row-selected" : ""}`}
              key={item.id}
              onClick={() => {
                onSelect();
                onSelectRow(sectionKey, item.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (draggedRow && draggedRow.id !== item.id) onMoveRow(draggedRow.section, draggedRow.id, sectionKey, item.id);
                setDraggedRow(null);
              }}
            >
              <span
                className="visual-drag-handle"
                draggable
                role="button"
                tabIndex={0}
                aria-label={`Drag ${item.title}`}
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                  setDraggedRow({ section: sectionKey, id: item.id });
                }}
                onDragEnd={() => setDraggedRow(null)}
              >⋮⋮</span>
              <div className="row-quick-actions" aria-label={`${item.title} actions`}>
                <button title="Choose icon" aria-label={`Choose icon for ${item.title}`} onClick={(event) => { event.stopPropagation(); onOpenRowMenu("icons", sectionKey, item.id, event.currentTarget); }}><ActionIcon name={item.icon} /></button>
                <button title="Duplicate row" aria-label={`Duplicate ${item.title}`} onClick={(event) => { event.stopPropagation(); onDuplicateRow(sectionKey, item.id); }}>⧉</button>
                <button title="More actions" aria-label={`More actions for ${item.title}`} onClick={(event) => { event.stopPropagation(); onOpenRowMenu("more", sectionKey, item.id, event.currentTarget); }}>•••</button>
              </div>
              {isLabel ? (
                <InlineEdit value={item.title} className="group-label-text" label={`${item.title} label`} onCommit={(title) => onUpdateRow(item.id, { title })} />
              ) : (
                <>
                  <Icon name={item.icon} small />
                  <div className="flyer-row-copy">
                    <div className="flyer-row-line">
                      <InlineEdit value={item.title} label={`${item.title} label`} onCommit={(title) => onUpdateRow(item.id, { title })} />
                      {item.time && (
                        <strong className={/\d/.test(item.time) ? "" : "worded"}>
                          <InlineEdit value={item.time} label={`${item.title} time`} onCommit={(time) => onUpdateRow(item.id, { time })} />
                        </strong>
                      )}
                    </div>
                    {item.note && <em><InlineEdit value={item.note} label={`${item.title} note`} onCommit={(note) => onUpdateRow(item.id, { note })} /></em>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [draft, setDraft] = useState<Draft>(() => seedDraft());
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [templates, setTemplates] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<SectionKey>("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedRow, setDraggedRow] = useState<DraggedRow>(null);
  const [selectedRow, setSelectedRow] = useState<DraggedRow>(null);
  const [rowMenu, setRowMenu] = useState<RowMenu>(null);
  const [fitScales, setFitScales] = useState<Record<SectionKey, number>>({});
  const [fitState, setFitState] = useState<Record<SectionKey, "fits" | "tight" | "overflow">>({});
  const [groupLabelSize, setGroupLabelSize] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [vaultSupported, setVaultSupported] = useState(true);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderNeedsPermission, setFolderNeedsPermission] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [versionFlash, setVersionFlash] = useState(false);
  const [vaultMsg, setVaultMsg] = useState<string | null>(null);
  const [zmanimOpen, setZmanimOpen] = useState(false);
  const [zmanim, setZmanim] = useState<ZmanimResult | null>(null);
  const [zmanimLoading, setZmanimLoading] = useState(false);
  const [zmanimError, setZmanimError] = useState<string | null>(null);
  const [zmanimMsg, setZmanimMsg] = useState<string | null>(null);
  // The Friday date the loaded times belong to, so a stale week is visible.
  const [zmanimWeek, setZmanimWeek] = useState<string | null>(null);
  // Bumped whenever a flyer starts from a stored starting point (first-run
  // seed, New flyer, or a template) so its parsha and times get replaced with
  // the live ones for its week. A counter, not a boolean: it has to be able to
  // fire again, and it must never be cleared from inside the effect it drives,
  // which would change that effect's deps and cancel the fetch it just started.
  const [seedFillNonce, setSeedFillNonce] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<FsDirectoryHandle | null>(null);
  const undoRef = useRef<Draft[]>([]);
  const redoRef = useRef<Draft[]>([]);

  const active = draft.sections.find((item) => item.id === selected) ?? draft.sections[0];
  const selectedRowData = selectedRow
    ? draft.sections.find((item) => item.id === selectedRow.section)?.rows.find((item) => item.id === selectedRow.id)
    : undefined;
  const overallFit = Object.values(fitState).includes("overflow") ? "overflow" : Object.values(fitState).includes("tight") ? "tight" : "fits";
  const columnSections = draft.sections.filter((item) => item.layout === "column");
  const wideSections = draft.sections.filter((item) => item.layout === "wide");
  const columnWeight = Math.max(1, ...columnSections.map((item) => item.rows.length));

  const commit = (change: (current: Draft) => Draft) => {
    setDraft((current) => {
      undoRef.current = [...undoRef.current.slice(-49), current];
      redoRef.current = [];
      return { ...change(current), updatedAt: Date.now() };
    });
  };

  const patchDraft = (values: Partial<Draft>) => commit((current) => ({ ...current, ...values }));

  const patchSectionFor = (section: SectionKey, values: Partial<FlyerSection>) =>
    commit((current) => ({
      ...current,
      sections: current.sections.map((item) => (item.id === section ? { ...item, ...values } : item)),
    }));

  const patchSection = (values: Partial<FlyerSection>) => patchSectionFor(active.id, values);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const storedDrafts = (JSON.parse(localStorage.getItem(STORAGE_DRAFTS) || "[]") as Draft[]).map(normalizeDraft);
      const storedTemplates = (JSON.parse(localStorage.getItem(STORAGE_TEMPLATES) || "[]") as Draft[]).map(normalizeDraft);
      if (storedDrafts.length) {
        setDrafts(storedDrafts);
        setDraft(storedDrafts[0]);
        setSelected(storedDrafts[0].sections[0]?.id ?? "");
      } else {
        const seed = seedDraft(upcomingFriday());
        setDraft(seed);
        setDrafts([seed]);
        setSelected(seed.sections[0].id);
        setSeedFillNonce((value) => value + 1);
      }
      setTemplates(storedTemplates);
    } catch {
      const seed = seedDraft(upcomingFriday());
      setDraft(seed);
      setDrafts([seed]);
      setSelected(seed.sections[0].id);
      setSeedFillNonce((value) => value + 1);
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const next = [draft, ...drafts.filter((item) => item.id !== draft.id)].sort((a, b) => b.updatedAt - a.updatedAt);
      setDrafts(next);
      localStorage.setItem(STORAGE_DRAFTS, JSON.stringify(next));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1100);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // The global text scale is the ceiling auto-fit works down from, not a
    // multiplier applied afterwards. Applied afterwards, growing the text would
    // grow the content, auto-fit would shrink it by the same ratio, and the
    // control would appear to do nothing on any section that is already full.
    const ts = draft.textScale || 1;
    const keys = draft.sections.map((item) => item.id);
    setFitScales(Object.fromEntries(keys.map((key) => [key, ts])));
    let pass = 0;
    const fit = () => {
      pass += 1;
      const nextScales = { ...fitScales };
      const nextState = { ...fitState };
      draft.sections.forEach((sec) => {
        const key = sec.id;
        const node = previewRef.current?.querySelector(`[data-fit-section="${key}"]`) as HTMLElement | null;
        if (!node || !sec.autoFit) {
          nextScales[key] = ts;
          nextState[key] = "fits";
          return;
        }
        const ratio = node.clientHeight / Math.max(node.scrollHeight, 1);
        const proposed = Math.max(0.7 * ts, Math.min(ts, (fitScales[key] || ts) * ratio * 0.985));
        nextScales[key] = ratio < 0.995 ? proposed : fitScales[key] || ts;
        nextState[key] = proposed <= 0.705 * ts && ratio < 0.99 ? "overflow" : proposed < 0.88 * ts ? "tight" : "fits";
      });
      setFitScales(nextScales);
      setFitState(nextState);
      if (pass < 3) requestAnimationFrame(fit);
    };
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
    // Fit recalculates for every meaningful draft change.
  }, [draft.id, draft.aspect, draft.sections, draft.textScale]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const measure = () => {
      const pageWidth = preview.clientWidth;
      if (!pageWidth) return;
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;

      const scale = draft.textScale || 1;
      const idealSize = pageWidth * 0.0202 * scale;
      const minimumSize = pageWidth * 0.0155 * scale;
      context.font = `900 ${idealSize}px Georgia`;
      let fitRatio = 1;

      preview.querySelectorAll<HTMLElement>(".group-label").forEach((label) => {
        const text = label.querySelector<HTMLElement>(".inline-edit")?.innerText || "";
        const measuredWidth = context.measureText(text).width;
        // The decorative rules either side of the heading are gone, so the
        // label may now use nearly the full column width.
        const availableWidth = label.clientWidth * 0.94;
        if (measuredWidth > 0) fitRatio = Math.min(fitRatio, availableWidth / measuredWidth);
      });

      const nextSize = Math.max(minimumSize, idealSize * Math.min(1, fitRatio));
      setGroupLabelSize((current) => current !== null && Math.abs(current - nextSize) < 0.1 ? current : nextSize);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(preview);
    return () => observer.disconnect();
  }, [draft.aspect, draft.sections, draft.textScale]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        const previous = undoRef.current.pop();
        if (previous) {
          redoRef.current.push(draft);
          setDraft(previous);
        }
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        const next = redoRef.current.pop();
        if (next) {
          undoRef.current.push(draft);
          setDraft(next);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [draft]);

  const updateDate = (value: string) => {
    const dates = dateRange(value);
    patchDraft({ startDate: value, englishDates: dates.english, hebrewDates: dates.hebrew });
  };

  const updateRowFor = (section: SectionKey, id: string, values: Partial<Row>) => {
    const target = draft.sections.find((item) => item.id === section);
    if (!target) return;
    patchSectionFor(section, { rows: target.rows.map((item) => (item.id === id ? { ...item, ...values } : item)) });
  };

  const updateRow = (id: string, values: Partial<Row>) => updateRowFor(active.id, id, values);

  const moveVisualRow = (source: SectionKey, id: string, target: SectionKey, beforeId?: string) => {
    commit((current) => {
      const sourceSec = current.sections.find((item) => item.id === source);
      const targetSec = current.sections.find((item) => item.id === target);
      if (!sourceSec || !targetSec) return current;
      const moving = sourceSec.rows.find((item) => item.id === id);
      if (!moving) return current;
      const sourceRows = sourceSec.rows.filter((item) => item.id !== id);
      const targetRows = source === target ? [...sourceRows] : [...targetSec.rows];
      const targetIndex = beforeId ? targetRows.findIndex((item) => item.id === beforeId) : targetRows.length;
      targetRows.splice(targetIndex < 0 ? targetRows.length : targetIndex, 0, moving);
      return {
        ...current,
        sections: current.sections.map((item) => {
          if (item.id === source) return { ...item, rows: source === target ? targetRows : sourceRows };
          if (item.id === target) return { ...item, rows: targetRows };
          return item;
        }),
      };
    });
    setSelected(target);
    setSelectedRow({ section: target, id });
  };

  const duplicateVisualRow = (section: SectionKey, id: string) => {
    const duplicateId = uid();
    commit((current) => ({
      ...current,
      sections: current.sections.map((item) => {
        if (item.id !== section) return item;
        const rows = [...item.rows];
        const index = rows.findIndex((candidate) => candidate.id === id);
        if (index < 0) return item;
        rows.splice(index + 1, 0, { ...rows[index], id: duplicateId });
        return { ...item, rows };
      }),
    }));
    setSelected(section);
    setSelectedRow({ section, id: duplicateId });
    setRowMenu(null);
  };

  const deleteVisualRow = (section: SectionKey, id: string) => {
    const target = draft.sections.find((item) => item.id === section);
    if (!target) return;
    patchSectionFor(section, { rows: target.rows.filter((item) => item.id !== id) });
    setSelectedRow(null);
    setRowMenu(null);
  };

  const openRowMenu = (kind: "icons" | "more", section: SectionKey, id: string, anchor: HTMLButtonElement) => {
    const rect = anchor.getBoundingClientRect();
    const width = kind === "icons" ? 238 : 184;
    setSelected(section);
    setSelectedRow({ section, id });
    setRowMenu({
      kind,
      x: Math.max(10, Math.min(rect.right - width, window.innerWidth - width - 10)),
      y: Math.min(rect.bottom + 7, window.innerHeight - 190),
    });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = Boolean(target?.isContentEditable || target?.closest("input, textarea, select"));
      if (event.key === "Escape") setRowMenu(null);
      if (!selectedRow || isEditing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateVisualRow(selectedRow.section, selectedRow.id);
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteVisualRow(selectedRow.section, selectedRow.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const moveRow = (id: string, direction: -1 | 1) => {
    const index = active.rows.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active.rows.length) return;
    const rows = [...active.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    patchSection({ rows });
  };

  const createDraft = () => {
    const fresh = { ...seedDraft(upcomingFriday()), id: uid(), name: "Untitled weekly flyer", updatedAt: Date.now() };
    setDraft(fresh);
    setSelected(fresh.sections[0].id);
    setSeedFillNonce((value) => value + 1);
  };

  // --- Section management (add / remove / reorder / layout) -----------------

  const addSection = (layout: SectionLayout) => {
    const fresh = section(uid(), layout === "wide" ? "New Wide Section" : "New Section", "star", layout, [row("New row", "", "none")]);
    commit((current) => ({ ...current, sections: [...current.sections, fresh] }));
    setSelected(fresh.id);
    setSelectedRow(null);
  };

  const removeSection = (id: string) => {
    if (draft.sections.length <= 1) return;
    const nextSelected = draft.sections.find((item) => item.id !== id)?.id ?? "";
    commit((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== id) }));
    if (selected === id) setSelected(nextSelected);
    setSelectedRow(null);
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    commit((current) => {
      const index = current.sections.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  };

  const setSectionLayout = (id: string, layout: SectionLayout) => patchSectionFor(id, { layout });

  const duplicateDraft = () => {
    const clone = structuredClone(draft) as Draft;
    clone.id = uid();
    clone.name = `${draft.name} copy`;
    clone.updatedAt = draft.updatedAt + 1;
    setDraft(clone);
  };

  const saveTemplate = () => {
    const template = structuredClone(draft) as Draft;
    template.id = uid();
    template.name = `${draft.name} template`;
    const next = [template, ...templates];
    setTemplates(next);
    localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(next));
  };

  const applyTemplate = (template: Draft) => {
    const clone = normalizeDraft(structuredClone(template) as Draft);
    clone.id = uid();
    clone.name = template.name.replace(/ template$/i, "");
    clone.updatedAt = template.updatedAt;
    // A template is a starting point for *next* week, so roll it off whatever
    // week it was captured in: move it to the coming Friday and refill the
    // parsha and dovening times from that week's zmanim.
    const friday = upcomingFriday();
    const dates = dateRange(friday);
    clone.startDate = friday;
    clone.englishDates = dates.english;
    clone.hebrewDates = dates.hebrew;
    setDraft(clone);
    setSelected(clone.sections[0]?.id ?? "");
    setSeedFillNonce((value) => value + 1);
  };

  /**
   * Rasterises the flyer with all editing chrome hidden. The class goes on the
   * DOM node directly rather than through React state: html-to-image reads the
   * live node synchronously, so the class has to be applied before the call and
   * removed after it, with no render in between.
   */
  const captureFlyer = async <T,>(render: (node: HTMLElement) => Promise<T>): Promise<T | null> => {
    const node = previewRef.current;
    if (!node) return null;
    node.classList.add("exporting");
    // html-to-image waits on every embedded resource and can hang indefinitely
    // if one never settles. The chrome must come back regardless, or the user
    // is left with a flyer they can no longer drag or edit.
    const watchdog = window.setTimeout(() => node.classList.remove("exporting"), 20000);
    try {
      return await render(node);
    } finally {
      window.clearTimeout(watchdog);
      node.classList.remove("exporting");
    }
  };

  const downloadPng = async () => {
    try {
      const dataUrl = await captureFlyer((node) =>
        toPng(node, {
          cacheBust: true,
          pixelRatio: draft.aspect === "letter" ? 2.55 : 2,
          backgroundColor: "#fffdf9",
        }),
      );
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${draft.name || draft.parsha}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      // Previously this rejected into nothing and the button looked inert.
      console.error("Export PNG failed", error);
      window.alert("Couldn't export the PNG. Please try again.");
    }
  };

  /**
   * The print stylesheet sizes the sheet, but @page cannot read the flyer's
   * aspect class, so the matching page size is injected just for this print.
   */
  const printFlyer = () => {
    const size = draft.aspect === "square" ? "8.5in 8.5in" : draft.aspect === "portrait" ? "7.5in 10in" : "letter portrait";
    const style = document.createElement("style");
    style.media = "print";
    style.textContent = `@page { size: ${size}; margin: 0; }`;
    document.head.appendChild(style);
    const cleanup = () => {
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    // Safari/Firefox do not always fire afterprint; drop the override anyway.
    window.setTimeout(cleanup, 2000);
  };

  // --- Saved versions (folder-backed history) ------------------------------

  const refreshVersions = async () => {
    const dir = folderRef.current;
    if (dir && (await folderPermission(dir, false)) === "granted") {
      try {
        const list = await listVersions(dir);
        setVersions(list);
        saveVersionIndex(list);
        setFolderNeedsPermission(false);
        return;
      } catch {
        // Fall through to the cached index below.
      }
    }
    setVersions(loadVersionIndex());
  };

  const handleSaveVersion = async () => {
    if (!isFileVaultSupported()) {
      setVaultMsg("Saving to a folder needs Chrome or Edge on desktop.");
      return;
    }
    setVaultBusy(true);
    setVaultMsg(null);
    try {
      let dir = folderRef.current;
      if (!dir) {
        dir = await pickFolder();
        folderRef.current = dir;
        setFolderName(dir.name);
      }
      if ((await folderPermission(dir, true)) !== "granted") {
        setFolderNeedsPermission(true);
        setVaultMsg("Folder access was blocked. Click Reconnect to allow it.");
        return;
      }
      setFolderNeedsPermission(false);
      let png: Blob | null = null;
      try {
        png = await captureFlyer((node) =>
          toBlob(node, {
            cacheBust: true,
            pixelRatio: draft.aspect === "letter" ? 2.2 : 2,
            backgroundColor: "#fffdf9",
          }),
        );
      } catch {
        png = null;
      }
      const meta = await saveVersion(dir, draft as unknown as Record<string, unknown>, png);
      const next = [meta, ...loadVersionIndex().filter((item) => item.file !== meta.file)].sort(
        (a, b) => b.savedAt - a.savedAt,
      );
      saveVersionIndex(next);
      setVersions(next);
      setLibraryOpen(true);
      setVersionFlash(true);
      window.setTimeout(() => setVersionFlash(false), 1600);
      setVaultMsg(`Saved “${meta.name}” to your folder.`);
      void refreshVersions();
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        setVaultMsg("Couldn't save this version. Try Reconnect and save again.");
      }
    } finally {
      setVaultBusy(false);
    }
  };

  const chooseFolder = async () => {
    try {
      const dir = await pickFolder();
      folderRef.current = dir;
      setFolderName(dir.name);
      setFolderNeedsPermission(false);
      setVaultMsg(null);
      await refreshVersions();
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        setVaultMsg("Couldn't open the folder picker.");
      }
    }
  };

  const reconnectFolder = async () => {
    const dir = folderRef.current;
    if (!dir) {
      await chooseFolder();
      return;
    }
    if ((await folderPermission(dir, true)) === "granted") {
      setFolderNeedsPermission(false);
      setVaultMsg(null);
      await refreshVersions();
    } else {
      setVaultMsg("Folder access is still blocked.");
    }
  };

  const restoreVersion = async (meta: VersionMeta) => {
    const dir = folderRef.current;
    if (!dir || (await folderPermission(dir, true)) !== "granted") {
      setFolderNeedsPermission(true);
      setVaultMsg("Reconnect your folder to open this saved version.");
      return;
    }
    try {
      const flyer = await readVersion(dir, meta.file);
      if (!flyer) {
        setVaultMsg("That version file couldn't be read.");
        return;
      }
      const restored = normalizeDraft(flyer as Draft);
      undoRef.current = [...undoRef.current.slice(-49), draft];
      redoRef.current = [];
      setDraft((current) => ({ ...restored, updatedAt: current.updatedAt + 1 }));
      setSelected(restored.sections[0]?.id ?? "");
      setSelectedRow(null);
      setRowMenu(null);
      setVaultMsg(`Opened “${meta.name}”. Your previous flyer is still saved.`);
    } catch {
      setVaultMsg("That version couldn't be opened.");
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const supported = isFileVaultSupported();
      if (cancelled) return;
      setVaultSupported(supported);
      const cached = loadVersionIndex();
      if (cached.length && !cancelled) setVersions(cached);
      if (!supported) return;
      const dir = await loadFolder();
      if (!dir || cancelled) return;
      folderRef.current = dir;
      setFolderName(dir.name);
      const permission = await folderPermission(dir, false);
      if (cancelled) return;
      if (permission === "granted") {
        setFolderNeedsPermission(false);
        await refreshVersions();
      } else {
        setFolderNeedsPermission(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // --- Zmanim engine (Chabad.org times for Baltimore 21215) ----------------

  const fetchWeekZmanim = async (refresh = false) => {
    setZmanimLoading(true);
    setZmanimError(null);
    try {
      const result = await loadZmanim(draft.startDate, refresh);
      setZmanim(result);
      setZmanimWeek(draft.startDate);
      setZmanimMsg(`Loaded the week of ${result.days[0]?.displayDate ?? draft.startDate}.`);
    } catch (error) {
      setZmanimError(error instanceof Error ? error.message : "Couldn't load zmanim.");
    } finally {
      setZmanimLoading(false);
    }
  };

  const openZmanim = () => {
    setSettingsOpen(false);
    setZmanimOpen(true);
    if (!zmanim && !zmanimLoading) void fetchWeekZmanim();
  };

  // Dovening times derived from this week's zmanim by the shul's house rules
  // (see app/doveningTimes.ts).
  const dovening = useMemo(() => buildDoveningSchedule(zmanim), [zmanim]);

  const autofillFromZmanim = () => {
    if (!zmanim) return;
    const { sections, filled } = applyDoveningTimes(draft.sections, dovening);
    commit((current) => ({
      ...current,
      sections,
      parsha: zmanim.parsha ? zmanim.parsha.toUpperCase() : current.parsha,
    }));
    setZmanimMsg(
      filled.length
        ? `Filled parsha and ${filled.length} dovening time${filled.length === 1 ? "" : "s"}: ${filled.join(", ")}.`
        : "Filled parsha. No dovening rows matched — label group headers (e.g. FRIDAY NIGHT, SHABBOS DAY, SUNDAY) so the rules know which Mincha is which.",
    );
  };

  const insertZman = (time: string) => {
    if (!selectedRow) {
      setZmanimMsg("Select a row on the flyer first, then click a time.");
      return;
    }
    updateRowFor(selectedRow.section, selectedRow.id, { time });
    setZmanimMsg(`Set “${time}” on the selected row.`);
  };

  // A brand-new flyer opens on the seed's placeholder parsha and times, which
  // belong to whatever week the seed was written for. Replace them with the
  // live ones for its Friday so the first thing on screen is this week. Only
  // fires for a freshly seeded flyer — saved drafts keep what the user typed.
  useEffect(() => {
    if (!hydrated || seedFillNonce === 0) return;
    let cancelled = false;
    const friday = draft.startDate;
    void (async () => {
      try {
        const result = await loadZmanim(friday, true);
        if (cancelled) return;
        setZmanim(result);
        setZmanimWeek(friday);
        const schedule = buildDoveningSchedule(result);
        commit((current) => {
          const parsha = result.parsha ? result.parsha.toUpperCase() : current.parsha;
          return {
            ...current,
            sections: applyDoveningTimes(current.sections, schedule).sections,
            parsha,
            name: result.parsha ? `${result.parsha} ${hebrewYear(friday)}` : current.name,
          };
        });
      } catch {
        // Offline, or Chabad.org unreachable: leave the seed exactly as it is
        // rather than blanking the flyer. Refresh in the panel retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, seedFillNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastSaved = useMemo(() => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(draft.updatedAt), [draft.updatedAt]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <img src="/oly-logo.svg" alt="Ohel Levi Yitzchok" />
          <div><strong>Zmanim Studio</strong><span>Weekly flyer workspace</span></div>
        </div>
        <div className="document-title">
          <input aria-label="Flyer name" value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} />
          <span>{savedFlash ? "Saved" : `Autosaved ${lastSaved}`}</span>
        </div>
        <div className="header-actions">
          <button className="quiet-button" onClick={printFlyer}>Print / PDF</button>
          <button className={`quiet-button ${versionFlash ? "flash" : ""}`} onClick={handleSaveVersion} disabled={vaultBusy}>
            {versionFlash ? "Saved ✓" : vaultBusy ? "Saving…" : "Save version"}
          </button>
          <button className="primary-button" onClick={downloadPng}>Export PNG</button>
        </div>
      </header>

      <div className={`workspace ${libraryOpen ? "library-open" : ""} ${settingsOpen || zmanimOpen ? "settings-open" : ""}`}>
        {libraryOpen && <aside className="library-panel">
          <div className="panel-heading"><span>Flyers</span><button aria-label="New flyer" onClick={createDraft}>＋</button></div>
          <button className="new-flyer" onClick={createDraft}>New weekly flyer</button>
          <div className="draft-list">
            {drafts.map((item) => (
              <button className={item.id === draft.id ? "active" : ""} key={item.id} onClick={() => { setDraft(item); setSelected(item.sections[0]?.id ?? ""); setSelectedRow(null); }}>
                <span>{item.name}</span>
                <small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(item.updatedAt)}</small>
              </button>
            ))}
          </div>
          <div className="library-divider" />
          <div className="panel-heading"><span>Templates</span><button aria-label="Save template" onClick={saveTemplate}>＋</button></div>
          {templates.length === 0 ? <p className="empty-copy">Save a flyer as a reusable starting point.</p> : templates.map((item) => (
            <button className="template-row" key={item.id} onClick={() => applyTemplate(item)}><span>▧</span>{item.name}</button>
          ))}
          <div className="library-divider" />
          <div className="panel-heading"><span>Saved versions</span><button aria-label="Save current version" onClick={handleSaveVersion} disabled={vaultBusy}>＋</button></div>
          {!vaultSupported ? (
            <p className="vault-hint">Saving versions to a folder works in Chrome or Edge on desktop.</p>
          ) : !folderName ? (
            <>
              <button className="vault-choose" onClick={chooseFolder}>Choose flyers folder…</button>
              <p className="vault-hint">Tip: pick a folder inside Dropbox, OneDrive, or Google&nbsp;Drive so your flyers back up and sync automatically.</p>
            </>
          ) : folderNeedsPermission ? (
            <button className="vault-reconnect" onClick={reconnectFolder}>Reconnect “{folderName}”</button>
          ) : (
            <div className="vault-status">Saving to <b>{folderName}</b></div>
          )}
          {vaultMsg && <p className="vault-msg">{vaultMsg}</p>}
          {versions.length > 0 ? (
            <div className="version-list">
              {versions.map((item) => (
                <div className="version-row" key={item.file}>
                  <div className="version-meta"><span>{item.name}</span><small>{formatSavedTime(item.savedAt)}</small></div>
                  <button onClick={() => restoreVersion(item)}>Restore</button>
                </div>
              ))}
            </div>
          ) : vaultSupported && folderName && !folderNeedsPermission ? (
            <p className="empty-copy">No saved versions yet. Click “Save version” to keep this week.</p>
          ) : null}
          <div className="library-footer">
            <button onClick={duplicateDraft}>Duplicate flyer</button>
            <button onClick={saveTemplate}>Save as template</button>
          </div>
        </aside>}

        <section className="canvas-stage">
          <div className="canvas-toolbar">
            <div className="toolbar-side">
              <button className={libraryOpen ? "toolbar-button active" : "toolbar-button"} onClick={() => setLibraryOpen((open) => !open)}>Flyers</button>
            </div>
            <div className="segmented" aria-label="Flyer format">
              {(["square", "portrait", "letter"] as Aspect[]).map((aspect) => (
                <button key={aspect} className={draft.aspect === aspect ? "active" : ""} onClick={() => patchDraft({ aspect })}>
                  {aspect === "square" ? "1:1" : aspect === "portrait" ? "3:4" : "8.5 × 11"}
                </button>
              ))}
            </div>
            <div className="toolbar-side end">
              <div className="fit-summary"><FitPill status={overallFit} /><span>Auto-fit</span></div>
              <button className={zmanimOpen ? "toolbar-button active" : "toolbar-button"} onClick={() => (zmanimOpen ? setZmanimOpen(false) : openZmanim())}>Zmanim</button>
              <button className={settingsOpen ? "toolbar-button active" : "toolbar-button"} onClick={() => setSettingsOpen((open) => !open)}>More settings</button>
            </div>
          </div>

          <div className="preview-scroller">
            <div className="direct-edit-guide"><b>Editing {active?.title}</b><span>Click text to type · drag ⋮⋮ to reorder</span><button onClick={() => patchSection({ rows: [...active.rows, row("New row", "", "none")] })}>＋ Add row</button></div>
            <div
              className={`flyer-page ${draft.aspect}`}
              ref={previewRef}
              data-testid="flyer-preview"
              style={{
                "--group-label-size": groupLabelSize ? `${groupLabelSize}px` : "2.02cqi",
                "--ts": draft.textScale,
                "--wds": draft.weekDetailsScale,
                "--rs": draft.ribbonScale,
              } as React.CSSProperties}
            >
              <div className="bsad">בס״ד</div>
              <header className="flyer-heading">
                <img src="/oly-logo.svg" alt="" />
                <div className="flyer-title-block">
                  <h1>ZMANIM</h1>
                  <div className="parsha-ribbon">
                    {draft.ribbonPrefix.trim() && (
                      <><InlineEdit value={draft.ribbonPrefix} label="Banner prefix" onCommit={(ribbonPrefix) => patchDraft({ ribbonPrefix: ribbonPrefix.toUpperCase() })} />{" "}</>
                    )}
                    <InlineEdit value={draft.parsha} label="Parsha or occasion" onCommit={(parsha) => patchDraft({ parsha: parsha.toUpperCase() })} />
                  </div>
                  <p><InlineEdit value={draft.hebrewDates} label="Hebrew date range" onCommit={(hebrewDates) => patchDraft({ hebrewDates })} /></p>
                  <strong><InlineEdit value={draft.englishDates} label="English date range" onCommit={(englishDates) => patchDraft({ englishDates })} /></strong>
                </div>
              </header>

              {columnSections.length > 0 && (
                <div className="flyer-columns" style={{ "--cols": columnSections.length, flexGrow: columnWeight } as React.CSSProperties}>
                  {columnSections.map((sec) => (
                    <FlyerCard
                      key={sec.id}
                      sectionKey={sec.id}
                      section={sec}
                      scale={fitScales[sec.id] ?? 1}
                      selected={selected === sec.id}
                      onSelect={() => setSelected(sec.id)}
                      onUpdateSection={(values) => patchSectionFor(sec.id, values)}
                      onUpdateRow={(id, values) => updateRowFor(sec.id, id, values)}
                      draggedRow={draggedRow}
                      setDraggedRow={setDraggedRow}
                      onMoveRow={moveVisualRow}
                      selectedRow={selectedRow}
                      onSelectRow={(section, id) => { setSelectedRow({ section, id }); setRowMenu(null); }}
                      onDuplicateRow={duplicateVisualRow}
                      onOpenRowMenu={openRowMenu}
                    />
                  ))}
                </div>
              )}

              <div className={`announcement-row ${draft.mazalTovs.length > 0 ? "" : "solo"}`}>
                <section className="sponsor-card" onClick={() => setSelected(draft.sections[0]?.id ?? "")}>
                  <b>KIDDUSH</b>
                  {draft.sponsors.length > 0 ? (
                    <ul className="sponsor-list">
                      {draft.sponsors.map((item) => (
                        <li key={item.id}>
                          <InlineEdit
                            value={item.text}
                            label="Kiddush sponsor"
                            onCommit={(text) => patchDraft({ sponsors: draft.sponsors.map((candidate) => candidate.id === item.id ? { ...candidate, text } : candidate) })}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <strong><InlineEdit value={draft.specialNotice || "FARBRENGEN IN SHUL AFTER MUSAF"} label="Special notice" onCommit={(specialNotice) => patchDraft({ specialNotice })} /></strong>
                  )}
                </section>
                {draft.mazalTovs.length > 0 && (
                  <section className="mazal-card">
                    <h3>MAZAL TOV!</h3>
                    <ul>{draft.mazalTovs.map((item) => <li key={item.id}><InlineEdit value={item.text} label="Mazal Tov entry" onCommit={(text) => patchDraft({ mazalTovs: draft.mazalTovs.map((candidate) => candidate.id === item.id ? { ...candidate, text } : candidate) })} /></li>)}</ul>
                  </section>
                )}
              </div>

              {wideSections.map((sec) => (
                <section
                  key={sec.id}
                  className={`programs-card ${selected === sec.id ? "selected" : ""}`}
                  style={{ flexGrow: Math.max(1, sec.rows.length) }}
                  onClick={() => setSelected(sec.id)}
                >
                  <h2><InlineEdit value={sec.title} label={`${sec.title} title`} onCommit={(title) => patchSectionFor(sec.id, { title })} /></h2>
                  <div
                    className="program-grid"
                    data-fit-section={sec.id}
                    style={{ "--fit-scale": (fitScales[sec.id] ?? 1) * (sec.autoFit ? 1 : sec.manualScale) } as React.CSSProperties}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedRow) moveVisualRow(draggedRow.section, draggedRow.id, sec.id);
                      setDraggedRow(null);
                    }}
                  >
                    {sec.rows.map((item) => (
                      <div
                        className={`program-item ${draggedRow?.id === item.id ? "dragging" : ""} ${selectedRow?.section === sec.id && selectedRow.id === item.id ? "row-selected" : ""}`}
                        key={item.id}
                        onClick={(event) => { event.stopPropagation(); setSelected(sec.id); setSelectedRow({ section: sec.id, id: item.id }); setRowMenu(null); }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (draggedRow && draggedRow.id !== item.id) moveVisualRow(draggedRow.section, draggedRow.id, sec.id, item.id);
                          setDraggedRow(null);
                        }}
                      >
                        <span className="visual-drag-handle" draggable role="button" tabIndex={0} aria-label={`Drag ${item.title}`} title="Drag to reorder" onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedRow({ section: sec.id, id: item.id }); }} onDragEnd={() => setDraggedRow(null)}>⋮⋮</span>
                        <div className="row-quick-actions" aria-label={`${item.title} actions`}>
                          <button title="Choose icon" aria-label={`Choose icon for ${item.title}`} onClick={(event) => { event.stopPropagation(); openRowMenu("icons", sec.id, item.id, event.currentTarget); }}><ActionIcon name={item.icon} /></button>
                          <button title="Duplicate row" aria-label={`Duplicate ${item.title}`} onClick={(event) => { event.stopPropagation(); duplicateVisualRow(sec.id, item.id); }}>⧉</button>
                          <button title="More actions" aria-label={`More actions for ${item.title}`} onClick={(event) => { event.stopPropagation(); openRowMenu("more", sec.id, item.id, event.currentTarget); }}>•••</button>
                        </div>
                        <Icon name={item.icon} small />
                        <strong><InlineEdit value={item.title} label={`${item.title} title`} onCommit={(title) => updateRowFor(sec.id, item.id, { title })} /></strong>
                        <span><InlineEdit value={item.time || "Add time"} label={`${item.title} time`} onCommit={(time) => updateRowFor(sec.id, item.id, { time })} /></span>
                        {item.note && <em><InlineEdit value={item.note} label={`${item.title} note`} onCommit={(note) => updateRowFor(sec.id, item.id, { note })} /></em>}
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <footer className="flyer-footer"><span>For Shul Sponsorships, contact Rabbi Yaakov Stein</span><b>OLY.SHULCLOUD.COM</b></footer>
            </div>
          </div>
        </section>

        {settingsOpen && <aside className="inspector-panel">
          <div className="inspector-scroll">
            <div className="inspector-title"><div><small>MORE SETTINGS</small><h2>{active.title}</h2></div><div className="inspector-title-actions"><FitPill status={fitState[active.id] ?? "fits"} /><button className="inspector-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button></div></div>
            <div className="rows-heading"><h3>Sections</h3><div className="section-add"><button onClick={() => addSection("column")} title="Add a side-by-side column section">＋ Column</button><button onClick={() => addSection("wide")} title="Add a full-width section">＋ Wide</button></div></div>
            <div className="section-list">
              {draft.sections.map((sec, index) => (
                <div className={`section-item ${sec.id === active.id ? "active" : ""}`} key={sec.id}>
                  <button className="section-pick" onClick={() => { setSelected(sec.id); setSelectedRow(null); }}>
                    <span className="section-name">{sec.title || "Untitled"}</span>
                    <span className={`section-tag ${sec.layout}`}>{sec.layout}</span>
                  </button>
                  <div className="section-ops">
                    <button aria-label={`Move ${sec.title} up`} disabled={index === 0} onClick={() => moveSection(sec.id, -1)}>↑</button>
                    <button aria-label={`Move ${sec.title} down`} disabled={index === draft.sections.length - 1} onClick={() => moveSection(sec.id, 1)}>↓</button>
                    <button aria-label={`Switch ${sec.title} to ${sec.layout === "column" ? "wide" : "column"}`} title={`Make ${sec.layout === "column" ? "wide" : "column"}`} onClick={() => setSectionLayout(sec.id, sec.layout === "column" ? "wide" : "column")}>⇄</button>
                    <button className="danger" aria-label={`Delete ${sec.title}`} disabled={draft.sections.length <= 1} onClick={() => removeSection(sec.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="helper-copy">Columns sit side-by-side up top; wide sections stack full-width below. Use ⇄ to switch a section between the two.</p>

            <div className="inspector-divider" />
            <label className="field-label range-label">Whole-flyer text size<input type="range" min="80" max="140" value={Math.round(draft.textScale * 100)} onChange={(event) => patchDraft({ textScale: Number(event.target.value) / 100 })} /><span>{Math.round(draft.textScale * 100)}%</span></label>
            <p className="helper-copy">Scales every section at once. Auto-fit still shrinks any section that would overflow its card, so a very full flyer may not grow the full amount.</p>

            <div className="inspector-divider" />
            <label className="field-label">Section title<input value={active.title} onChange={(event) => patchSection({ title: event.target.value })} /></label>
            <div className="field-grid">
              <label className="field-label">Header icon<select value={active.icon} onChange={(event) => patchSection({ icon: event.target.value as IconName })}>{iconNames.map((name) => <option key={name} value={name}>{iconOptions[name].label}</option>)}</select></label>
              <label className="field-label">Sizing<select value={active.autoFit ? "auto" : "manual"} onChange={(event) => patchSection({ autoFit: event.target.value === "auto" })}><option value="auto">Auto-fit</option><option value="manual">Manual</option></select></label>
            </div>
            {!active.autoFit && <label className="field-label range-label">Section text size<input type="range" min="70" max="115" value={Math.round(active.manualScale * 100)} onChange={(event) => patchSection({ manualScale: Number(event.target.value) / 100 })} /><span>{Math.round(active.manualScale * 100)}%</span></label>}
            <p className="helper-copy">Auto-fit adjusts this section independently and will not shrink below the print readability floor.</p>

            <div className="rows-heading"><h3>Rows</h3><button onClick={() => patchSection({ rows: [...active.rows, row("New row", "", "none")] })}>＋ Add row</button></div>
            <div className="row-editor-list">
              {active.rows.map((item, index) => (
                <div className="row-editor" key={item.id}>
                  <div className="row-order"><button disabled={index === 0} onClick={() => moveRow(item.id, -1)}>↑</button><button disabled={index === active.rows.length - 1} onClick={() => moveRow(item.id, 1)}>↓</button></div>
                  <div className="row-fields">
                    <input aria-label="Row title" value={item.title} onChange={(event) => updateRow(item.id, { title: event.target.value })} />
                    <div><input aria-label="Row time" placeholder="Time or value" value={item.time || ""} onChange={(event) => updateRow(item.id, { time: event.target.value as string })} /><select aria-label="Row icon" value={item.icon} onChange={(event) => updateRow(item.id, { icon: event.target.value as IconName })}>{iconNames.map((name) => <option key={name} value={name}>{name === "none" ? "No icon" : iconOptions[name].label}</option>)}</select></div>
                    <input aria-label="Row note" placeholder="Optional note" value={item.note || ""} onChange={(event) => updateRow(item.id, { note: event.target.value })} />
                  </div>
                  <button className="delete-row" aria-label={`Delete ${item.title}`} onClick={() => patchSection({ rows: active.rows.filter((candidate) => candidate.id !== item.id) })}>×</button>
                </div>
              ))}
            </div>

            <div className="inspector-divider" />
            <h3 className="subpanel-title">Week details</h3>
            <div className="field-grid">
              <label className="field-label">Banner prefix<input placeholder="Leave empty for a Yom Tov" value={draft.ribbonPrefix} onChange={(event) => patchDraft({ ribbonPrefix: event.target.value.toUpperCase() })} /></label>
              <label className="field-label">Parsha / occasion<input value={draft.parsha} onChange={(event) => patchDraft({ parsha: event.target.value.toUpperCase() })} /></label>
            </div>
            <label className="field-label range-label">Banner text size<input type="range" min="60" max="130" value={Math.round(draft.ribbonScale * 100)} onChange={(event) => patchDraft({ ribbonScale: Number(event.target.value) / 100 })} /><span>{Math.round(draft.ribbonScale * 100)}%</span></label>
            <p className="helper-copy">Clear the prefix to title the banner with a Yom Tov on its own, and shrink the text if a long name would overflow the ribbon.</p>
            <label className="field-label">Friday date<input type="date" value={draft.startDate} onChange={(event) => updateDate(event.target.value)} /></label>
            <label className="field-label">Hebrew date line<input value={draft.hebrewDates} onChange={(event) => patchDraft({ hebrewDates: event.target.value })} /></label>
            <label className="field-label">English date line<input value={draft.englishDates} onChange={(event) => patchDraft({ englishDates: event.target.value })} /></label>
            <label className="field-label range-label">Date line text size<input type="range" min="70" max="150" value={Math.round(draft.weekDetailsScale * 100)} onChange={(event) => patchDraft({ weekDetailsScale: Number(event.target.value) / 100 })} /><span>{Math.round(draft.weekDetailsScale * 100)}%</span></label>
            <p className="helper-copy">Scales the Hebrew and English date lines under the parsha ribbon.</p>

            <div className="rows-heading"><h3>Kiddush sponsors</h3><button onClick={() => patchDraft({ sponsors: [...draft.sponsors, { id: uid(), text: "New sponsor" }] })}>＋ Add</button></div>
            <p className="helper-copy">Each sponsor sits on its own line under the Kiddush heading. With none listed, the unsponsored notice shows instead.</p>
            <div className="mazal-editor">
              {draft.sponsors.map((item) => (
                <div key={item.id}>
                  <textarea aria-label="Kiddush sponsor" value={item.text} onChange={(event) => patchDraft({ sponsors: draft.sponsors.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })} />
                  <button aria-label="Delete sponsor" onClick={() => patchDraft({ sponsors: draft.sponsors.filter((candidate) => candidate.id !== item.id) })}>×</button>
                </div>
              ))}
            </div>
            {draft.sponsors.length === 0 && <label className="field-label">Unsponsored notice<input value={draft.specialNotice} placeholder="Farbrengen in Shul after Musaf" onChange={(event) => patchDraft({ specialNotice: event.target.value })} /></label>}

            <div className="rows-heading"><h3>Mazal Tov entries</h3><button onClick={() => patchDraft({ mazalTovs: [...draft.mazalTovs, { id: uid(), text: "New Mazal Tov" }] })}>＋ Add</button></div>
            <p className="helper-copy">The heading appears once; each simcha becomes a clean list entry.</p>
            <div className="mazal-editor">
              {draft.mazalTovs.map((item) => <div key={item.id}><textarea value={item.text} onChange={(event) => patchDraft({ mazalTovs: draft.mazalTovs.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })} /><button aria-label="Delete Mazal Tov" onClick={() => patchDraft({ mazalTovs: draft.mazalTovs.filter((candidate) => candidate.id !== item.id) })}>×</button></div>)}
            </div>
          </div>
        </aside>}

        {zmanimOpen && <aside className="inspector-panel zmanim-panel">
          <div className="inspector-scroll">
            <div className="inspector-title"><div><small>ZMANIM ENGINE</small><h2>This week&rsquo;s times</h2></div><div className="inspector-title-actions"><button className="inspector-close" aria-label="Close zmanim" onClick={() => setZmanimOpen(false)}>×</button></div></div>
            <p className="helper-copy">Live from Chabad.org for {zmanim?.locationName || "Baltimore, MD 21215"}. Dovening times are derived from those zmanim by the shul&rsquo;s rules.</p>
            <label className="field-label zmanim-date">Friday date<input type="date" value={draft.startDate} onChange={(event) => updateDate(event.target.value)} /></label>
            {zmanim && zmanimWeek && zmanimWeek !== draft.startDate && (
              <p className="zmanim-stale">Showing the week of {zmanim.days[0]?.displayDate ?? zmanimWeek}. Refresh to load {draft.startDate}.</p>
            )}
            <button className="primary-button zmanim-fetch" onClick={() => fetchWeekZmanim(true)} disabled={zmanimLoading}>
              {zmanimLoading ? "Loading…" : zmanim ? "Refresh for this week" : "Get this week's times"}
            </button>
            {zmanimError && <p className="zmanim-error">{zmanimError}</p>}
            {zmanim && (
              <>
                <button className="zmanim-autofill" onClick={autofillFromZmanim}>
                  Auto-fill parsha{zmanim.parsha ? ` (${zmanim.parsha})` : ""} + dovening times
                </button>
                <p className="helper-copy">Click a row on the flyer to select it, then click any time below to drop it into that row.</p>
                {zmanimMsg && <p className="zmanim-msg">{zmanimMsg}</p>}
                <div className="zmanim-day dovening-block">
                  <h4><span>Dovening times</span><em>derived</em></h4>
                  <div className="dovening-list">
                    {dovening.list.map((item) => (
                      <button
                        key={item.key}
                        className="dovening-item"
                        disabled={!item.time}
                        onClick={() => item.time && insertZman(item.time)}
                        title={item.basis ? `${item.rule} — from ${item.basis}` : item.rule}
                      >
                        <span className="dovening-head"><span>{item.label}</span><b>{item.time ?? "—"}</b></span>
                        <em>{item.time ? item.rule : "Missing zman for this week"}</em>
                      </button>
                    ))}
                  </div>
                </div>
                {zmanim.days.map((day) => {
                  const items = ZMANIM_ROWS.map((z) => ({ z, time: day.times[z.type] })).filter((entry) => entry.time);
                  if (items.length === 0) return null;
                  return (
                    <div className="zmanim-day" key={day.date}>
                      <h4><span>{day.dayName}{day.holidayName ? ` · ${day.holidayName}` : ""}</span><em>{day.displayDate}</em></h4>
                      <div className="zmanim-grid">
                        {items.map(({ z, time }) => (
                          <button key={z.type} onClick={() => insertZman(time as string)} title={`Insert ${z.label}`}>
                            <span>{z.label}</span><b>{time}</b>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="zmanim-source">Times courtesy of Chabad.org.</p>
              </>
            )}
          </div>
        </aside>}
      </div>

      {rowMenu && selectedRow && selectedRowData && (
        <div
          className={`row-popover ${rowMenu.kind}`}
          style={{ left: rowMenu.x, top: rowMenu.y }}
          role="dialog"
          aria-label={`${selectedRowData.title} ${rowMenu.kind === "icons" ? "icon picker" : "actions"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="row-popover-heading"><span>{selectedRowData.title}</span><button aria-label="Close row menu" onClick={() => setRowMenu(null)}>×</button></div>
          {rowMenu.kind === "icons" ? (
            <div className="icon-choice-grid">
              {iconNames.map((icon) => (
                <button
                  key={icon}
                  className={selectedRowData.icon === icon ? "active" : ""}
                  aria-label={`Use ${icon === "none" ? "no icon" : iconOptions[icon].label}`}
                  onClick={() => {
                    updateRowFor(selectedRow.section, selectedRow.id, { icon });
                    setRowMenu(null);
                  }}
                >
                  <b>{icon === "none" ? <span className="no-icon-mark">∅</span> : <ActionIcon name={icon} />}</b><span>{iconOptions[icon].label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="more-action-list">
              <button onClick={() => duplicateVisualRow(selectedRow.section, selectedRow.id)}><span>⧉</span>Duplicate row<kbd>⌘D</kbd></button>
              <button onClick={() => { updateRowFor(selectedRow.section, selectedRow.id, { note: selectedRowData.note ? "" : "Add note" }); setRowMenu(null); }}><span>＋</span>{selectedRowData.note ? "Remove note" : "Add note"}</button>
              <button className="danger" onClick={() => deleteVisualRow(selectedRow.section, selectedRow.id)}><span>×</span>Delete row<kbd>Del</kbd></button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
