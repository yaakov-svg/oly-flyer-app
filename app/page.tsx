"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

type Aspect = "letter" | "square" | "portrait";
type IconName = "none" | "candles" | "clock" | "people" | "book" | "music" | "cup";
type SectionKey = "shabbos" | "weekday" | "shiurim" | "programs";

type Row = {
  id: string;
  title: string;
  time?: string;
  note?: string;
  icon: IconName;
};

type FlyerSection = {
  title: string;
  icon: IconName;
  autoFit: boolean;
  manualScale: number;
  rows: Row[];
};

type MazalTov = { id: string; text: string };
type DraggedRow = { section: SectionKey; id: string } | null;

type Draft = {
  id: string;
  name: string;
  updatedAt: number;
  aspect: Aspect;
  parsha: string;
  startDate: string;
  hebrewDates: string;
  englishDates: string;
  sponsor: string;
  specialNotice: string;
  mazalTovs: MazalTov[];
  sections: Record<SectionKey, FlyerSection>;
};

const iconGlyph: Record<IconName, string> = {
  none: "",
  candles: "♨",
  clock: "◷",
  people: "●●●",
  book: "▤",
  music: "♫",
  cup: "♜",
};

const uid = () => Math.random().toString(36).slice(2, 10);

const row = (title: string, time = "", icon: IconName = "none", note = ""): Row => ({
  id: uid(),
  title,
  time,
  icon,
  note,
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

function seedDraft(): Draft {
  const startDate = "2026-07-17";
  const dates = dateRange(startDate);
  return {
    id: uid(),
    name: "Devarim 5786",
    updatedAt: Date.now(),
    aspect: "letter",
    parsha: "DEVARIM",
    startDate,
    hebrewDates: dates.hebrew,
    englishDates: dates.english,
    sponsor: "Rabbi & Rebbetzin Lisbon and the Kroll family",
    specialNotice: "",
    mazalTovs: [{ id: uid(), text: "The Roth family on the birth of a baby girl" }],
    sections: {
      shabbos: {
        title: "Shabbos Schedule",
        icon: "candles",
        autoFit: true,
        manualScale: 1,
        rows: [
          row("FRIDAY NIGHT", "", "none"),
          row("Candle Lighting", "8:13 PM", "candles"),
          row("Mincha", "8:25 PM", "clock"),
          row("Kabbalas Shabbos", "8:50 PM", "candles"),
          row("SHABBOS DAY", "", "none"),
          row("Shacharis", "10:00 AM", "people"),
          row("Kol Hanearim", "6:00 PM", "people"),
          row("Mincha", "8:10 PM", "clock"),
          row("Pirkei Avos", "Perek Sheni", "book"),
          row("Seder Niggunim", "8:40 PM", "music"),
          row("Maariv", "9:18 PM", "cup", "Motzai Shabbos"),
        ],
      },
      weekday: {
        title: "Weekday Minyanim",
        icon: "people",
        autoFit: true,
        manualScale: 1,
        rows: [
          row("SUNDAY", "", "none"),
          row("Shacharis", "7:30 AM  |  9:30 AM", "none"),
          row("Mincha", "8:20 PM", "none"),
          row("Maariv", "9:00 PM", "none"),
          row("MONDAY – TUESDAY", "", "none"),
          row("Shacharis", "6:30 AM", "none"),
          row("Mincha", "8:20 PM", "none"),
          row("Maariv", "9:00 PM", "none"),
          row("WEDNESDAY – 8 AV", "", "none"),
          row("Shacharis", "6:30 AM", "none"),
          row("Fast Begins", "8:28 PM", "none"),
          row("THURSDAY – 9 AV", "", "none"),
          row("Shacharis", "9:00 AM", "none"),
          row("Chatzos", "1:13 PM", "none"),
          row("Maariv / Fast Ends", "8:58 PM", "none"),
          row("FRIDAY", "", "none"),
          row("Shacharis", "6:30 AM", "none"),
        ],
      },
      shiurim: {
        title: "Shiurim & Learning",
        icon: "book",
        autoFit: true,
        manualScale: 1,
        rows: [
          row("SHABBOS", "", "none"),
          row("Chassidus", "Friday after Mincha", "none", "R’ Lisbon"),
          row("Chassidus", "9:15 AM", "none", "R’ Lisbon"),
          row("Halacha", "7:10 PM", "none", "R’ Block"),
          row("WEEKDAY", "", "none"),
          row("Daily Gemara", "5:50 AM", "none", "Sunday 6:50 AM · R’ Lisbon"),
          row("Chassidus", "8:30 AM", "none", "Monday–Friday · R’ Lisbon"),
          row("Chassidus", "Between Mincha & Maariv", "none", "R’ Bukiet"),
          row("Chassidus", "Monday 9:10 PM", "none", "R’ Slavaticki"),
        ],
      },
      programs: {
        title: "Children & Community Programs",
        icon: "people",
        autoFit: true,
        manualScale: 1,
        rows: [
          row("Children’s Program", "Shabbos 10:45 AM", "people", "Lower Level · Ages 3–7"),
          row("Girls Group", "Shabbos 10:30 AM", "people", "3418 Bancroft Rd · Grades 2–7"),
          row("Ladies Tehillim", "Sunday 11:00 AM", "people", "Weintraub Residence"),
          row("Sunday Morning Learning", "8:45–11:45 AM", "book", "Breakfast included"),
        ],
      },
    },
  };
}

const STORAGE_DRAFTS = "oly-zmanim-drafts-v1";
const STORAGE_TEMPLATES = "oly-zmanim-templates-v1";

function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  if (name === "none") return null;
  return <span className={`flyer-icon ${small ? "small" : ""}`}>{iconGlyph[name]}</span>;
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
              className={`flyer-row ${isLabel ? "group-label" : ""} ${draggedRow?.id === item.id ? "dragging" : ""}`}
              key={item.id}
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
              {!isLabel && <Icon name={item.icon} small />}
              <div className="flyer-row-copy">
                <div className="flyer-row-line">
                  <InlineEdit value={item.title} label={`${item.title} label`} onCommit={(title) => onUpdateRow(item.id, { title })} />
                  {item.time && <strong><InlineEdit value={item.time} label={`${item.title} time`} onCommit={(time) => onUpdateRow(item.id, { time })} /></strong>}
                </div>
                {item.note && <em><InlineEdit value={item.note} label={`${item.title} note`} onCommit={(note) => onUpdateRow(item.id, { note })} /></em>}
              </div>
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
  const [selected, setSelected] = useState<SectionKey>("shabbos");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedRow, setDraggedRow] = useState<DraggedRow>(null);
  const [fitScales, setFitScales] = useState<Record<SectionKey, number>>({ shabbos: 1, weekday: 1, shiurim: 1, programs: 1 });
  const [fitState, setFitState] = useState<Record<SectionKey, "fits" | "tight" | "overflow">>({ shabbos: "fits", weekday: "fits", shiurim: "fits", programs: "fits" });
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<Draft[]>([]);
  const redoRef = useRef<Draft[]>([]);

  const active = draft.sections[selected];
  const overallFit = Object.values(fitState).includes("overflow") ? "overflow" : Object.values(fitState).includes("tight") ? "tight" : "fits";

  const commit = (change: (current: Draft) => Draft) => {
    setDraft((current) => {
      undoRef.current = [...undoRef.current.slice(-49), current];
      redoRef.current = [];
      return { ...change(current), updatedAt: Date.now() };
    });
  };

  const patchDraft = (values: Partial<Draft>) => commit((current) => ({ ...current, ...values }));

  const patchSection = (values: Partial<FlyerSection>) =>
    commit((current) => ({
      ...current,
      sections: { ...current.sections, [selected]: { ...current.sections[selected], ...values } },
    }));

  const patchSectionFor = (section: SectionKey, values: Partial<FlyerSection>) =>
    commit((current) => ({
      ...current,
      sections: { ...current.sections, [section]: { ...current.sections[section], ...values } },
    }));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const storedDrafts = JSON.parse(localStorage.getItem(STORAGE_DRAFTS) || "[]") as Draft[];
      const storedTemplates = JSON.parse(localStorage.getItem(STORAGE_TEMPLATES) || "[]") as Draft[];
      if (storedDrafts.length) {
        setDrafts(storedDrafts);
        setDraft(storedDrafts[0]);
      } else {
        const seed = seedDraft();
        setDraft(seed);
        setDrafts([seed]);
      }
      setTemplates(storedTemplates);
    } catch {
      const seed = seedDraft();
      setDraft(seed);
      setDrafts([seed]);
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
    setFitScales({ shabbos: 1, weekday: 1, shiurim: 1, programs: 1 });
    const keys: SectionKey[] = ["shabbos", "weekday", "shiurim", "programs"];
    let pass = 0;
    const fit = () => {
      pass += 1;
      const nextScales = { ...fitScales };
      const nextState = { ...fitState };
      keys.forEach((key) => {
        const node = previewRef.current?.querySelector(`[data-fit-section="${key}"]`) as HTMLElement | null;
        if (!node || !draft.sections[key].autoFit) {
          nextScales[key] = 1;
          nextState[key] = "fits";
          return;
        }
        const ratio = node.clientHeight / Math.max(node.scrollHeight, 1);
        const proposed = Math.max(0.7, Math.min(1, (fitScales[key] || 1) * ratio * 0.985));
        nextScales[key] = ratio < 0.995 ? proposed : fitScales[key] || 1;
        nextState[key] = proposed <= 0.705 && ratio < 0.99 ? "overflow" : proposed < 0.88 ? "tight" : "fits";
      });
      setFitScales(nextScales);
      setFitState(nextState);
      if (pass < 3) requestAnimationFrame(fit);
    };
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
    // Fit recalculates for every meaningful draft change.
  }, [draft.id, draft.aspect, draft.sections]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const updateRowFor = (section: SectionKey, id: string, values: Partial<Row>) =>
    patchSectionFor(section, { rows: draft.sections[section].rows.map((item) => (item.id === id ? { ...item, ...values } : item)) });

  const updateRow = (id: string, values: Partial<Row>) => updateRowFor(selected, id, values);

  const moveVisualRow = (source: SectionKey, id: string, target: SectionKey, beforeId?: string) => {
    commit((current) => {
      const moving = current.sections[source].rows.find((item) => item.id === id);
      if (!moving) return current;
      const sourceRows = current.sections[source].rows.filter((item) => item.id !== id);
      const targetRows = source === target ? [...sourceRows] : [...current.sections[target].rows];
      const targetIndex = beforeId ? targetRows.findIndex((item) => item.id === beforeId) : targetRows.length;
      targetRows.splice(targetIndex < 0 ? targetRows.length : targetIndex, 0, moving);
      return {
        ...current,
        sections: {
          ...current.sections,
          [source]: { ...current.sections[source], rows: source === target ? targetRows : sourceRows },
          [target]: { ...current.sections[target], rows: targetRows },
        },
      };
    });
    setSelected(target);
  };

  const moveRow = (id: string, direction: -1 | 1) => {
    const index = active.rows.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active.rows.length) return;
    const rows = [...active.rows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    patchSection({ rows });
  };

  const createDraft = () => {
    const fresh = { ...seedDraft(), id: uid(), name: "Untitled weekly flyer", updatedAt: Date.now() };
    setDraft(fresh);
    setSelected("shabbos");
  };

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
    const clone = structuredClone(template) as Draft;
    clone.id = uid();
    clone.name = template.name.replace(/ template$/i, "");
    clone.updatedAt = template.updatedAt;
    setDraft(clone);
  };

  const downloadPng = async () => {
    if (!previewRef.current) return;
    const dataUrl = await toPng(previewRef.current, {
      cacheBust: true,
      pixelRatio: draft.aspect === "letter" ? 2.55 : 2,
      backgroundColor: "#fffdf9",
    });
    const link = document.createElement("a");
    link.download = `${draft.name || draft.parsha}.png`;
    link.href = dataUrl;
    link.click();
  };

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
          <button className="quiet-button" onClick={() => window.print()}>Print / PDF</button>
          <button className="primary-button" onClick={downloadPng}>Export PNG</button>
        </div>
      </header>

      <div className={`workspace ${libraryOpen ? "library-open" : ""} ${settingsOpen ? "settings-open" : ""}`}>
        {libraryOpen && <aside className="library-panel">
          <div className="panel-heading"><span>Flyers</span><button aria-label="New flyer" onClick={createDraft}>＋</button></div>
          <button className="new-flyer" onClick={createDraft}>New weekly flyer</button>
          <div className="draft-list">
            {drafts.map((item) => (
              <button className={item.id === draft.id ? "active" : ""} key={item.id} onClick={() => setDraft(item)}>
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
              <button className={settingsOpen ? "toolbar-button active" : "toolbar-button"} onClick={() => setSettingsOpen((open) => !open)}>More settings</button>
            </div>
          </div>

          <div className="preview-scroller">
            <div className="direct-edit-guide"><b>Editing {draft.sections[selected].title}</b><span>Click text to type · drag ⋮⋮ to reorder</span><button onClick={() => patchSection({ rows: [...active.rows, row("New row", "", "none")] })}>＋ Add row</button></div>
            <div className={`flyer-page ${draft.aspect}`} ref={previewRef} data-testid="flyer-preview">
              <div className="bsad">בס״ד</div>
              <header className="flyer-heading">
                <img src="/oly-logo.svg" alt="" />
                <div className="flyer-title-block">
                  <h1>ZMANIM</h1>
                  <div className="parsha-ribbon">PARSHAS <InlineEdit value={draft.parsha} label="Parsha" onCommit={(parsha) => patchDraft({ parsha: parsha.toUpperCase() })} /></div>
                  <p><InlineEdit value={draft.hebrewDates} label="Hebrew date range" onCommit={(hebrewDates) => patchDraft({ hebrewDates })} /></p>
                  <strong><InlineEdit value={draft.englishDates} label="English date range" onCommit={(englishDates) => patchDraft({ englishDates })} /></strong>
                </div>
              </header>

              <div className="flyer-columns">
                {(["shabbos", "weekday", "shiurim"] as SectionKey[]).map((key) => (
                  <FlyerCard
                    key={key}
                    sectionKey={key}
                    section={draft.sections[key]}
                    scale={fitScales[key]}
                    selected={selected === key}
                    onSelect={() => setSelected(key)}
                    onUpdateSection={(values) => patchSectionFor(key, values)}
                    onUpdateRow={(id, values) => updateRowFor(key, id, values)}
                    draggedRow={draggedRow}
                    setDraggedRow={setDraggedRow}
                    onMoveRow={moveVisualRow}
                  />
                ))}
              </div>

              <div className="announcement-row">
                <section className="sponsor-card" onClick={() => setSelected("shabbos")}>
                  {draft.sponsor ? (
                    <><b>KIDDUSH SPONSORED BY</b><i aria-hidden="true" /><strong><InlineEdit value={draft.sponsor} label="Kiddush sponsor" onCommit={(sponsor) => patchDraft({ sponsor })} /></strong></>
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

              <section className={`programs-card ${selected === "programs" ? "selected" : ""}`} onClick={() => setSelected("programs")}>
                <h2><InlineEdit value={draft.sections.programs.title} label="Programs section title" onCommit={(title) => patchSectionFor("programs", { title })} /></h2>
                <div
                  className="program-grid"
                  data-fit-section="programs"
                  style={{ "--fit-scale": fitScales.programs } as React.CSSProperties}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedRow) moveVisualRow(draggedRow.section, draggedRow.id, "programs");
                    setDraggedRow(null);
                  }}
                >
                  {draft.sections.programs.rows.map((item) => (
                    <div
                      className={`program-item ${draggedRow?.id === item.id ? "dragging" : ""}`}
                      key={item.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (draggedRow && draggedRow.id !== item.id) moveVisualRow(draggedRow.section, draggedRow.id, "programs", item.id);
                        setDraggedRow(null);
                      }}
                    >
                      <span className="visual-drag-handle" draggable role="button" tabIndex={0} aria-label={`Drag ${item.title}`} title="Drag to reorder" onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); setDraggedRow({ section: "programs", id: item.id }); }} onDragEnd={() => setDraggedRow(null)}>⋮⋮</span>
                      <Icon name={item.icon} small />
                      <strong><InlineEdit value={item.title} label={`${item.title} title`} onCommit={(title) => updateRowFor("programs", item.id, { title })} /></strong>
                      <span><InlineEdit value={item.time || "Add time"} label={`${item.title} time`} onCommit={(time) => updateRowFor("programs", item.id, { time })} /></span>
                      {item.note && <em><InlineEdit value={item.note} label={`${item.title} note`} onCommit={(note) => updateRowFor("programs", item.id, { note })} /></em>}
                    </div>
                  ))}
                </div>
              </section>

              <footer className="flyer-footer"><span>For Shul Sponsorships, contact Rabbi Yaakov Stein</span><b>OLY.SHULCLOUD.COM</b></footer>
            </div>
          </div>
        </section>

        {settingsOpen && <aside className="inspector-panel">
          <div className="inspector-scroll">
            <div className="inspector-title"><div><small>MORE SETTINGS</small><h2>{active.title}</h2></div><div className="inspector-title-actions"><FitPill status={fitState[selected]} /><button className="inspector-close" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button></div></div>
            <label className="field-label">Section title<input value={active.title} onChange={(event) => patchSection({ title: event.target.value })} /></label>
            <div className="field-grid">
              <label className="field-label">Header icon<select value={active.icon} onChange={(event) => patchSection({ icon: event.target.value as IconName })}>{Object.keys(iconGlyph).map((name) => <option key={name} value={name}>{name === "none" ? "None" : name}</option>)}</select></label>
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
                    <div><input aria-label="Row time" placeholder="Time or value" value={item.time || ""} onChange={(event) => updateRow(item.id, { time: event.target.value })} /><select aria-label="Row icon" value={item.icon} onChange={(event) => updateRow(item.id, { icon: event.target.value as IconName })}>{Object.keys(iconGlyph).map((name) => <option key={name} value={name}>{name === "none" ? "No icon" : name}</option>)}</select></div>
                    <input aria-label="Row note" placeholder="Optional note" value={item.note || ""} onChange={(event) => updateRow(item.id, { note: event.target.value })} />
                  </div>
                  <button className="delete-row" aria-label={`Delete ${item.title}`} onClick={() => patchSection({ rows: active.rows.filter((candidate) => candidate.id !== item.id) })}>×</button>
                </div>
              ))}
            </div>

            <div className="inspector-divider" />
            <h3 className="subpanel-title">Week details</h3>
            <label className="field-label">Parsha<input value={draft.parsha} onChange={(event) => patchDraft({ parsha: event.target.value.toUpperCase() })} /></label>
            <label className="field-label">Friday date<input type="date" value={draft.startDate} onChange={(event) => updateDate(event.target.value)} /></label>
            <label className="field-label">Hebrew date line<input value={draft.hebrewDates} onChange={(event) => patchDraft({ hebrewDates: event.target.value })} /></label>
            <label className="field-label">English date line<input value={draft.englishDates} onChange={(event) => patchDraft({ englishDates: event.target.value })} /></label>
            <label className="field-label">Kiddush sponsor<input placeholder="Leave empty for no sponsor" value={draft.sponsor} onChange={(event) => patchDraft({ sponsor: event.target.value })} /></label>
            {!draft.sponsor && <label className="field-label">Unsponsored notice<input value={draft.specialNotice} placeholder="Farbrengen in Shul after Musaf" onChange={(event) => patchDraft({ specialNotice: event.target.value })} /></label>}

            <div className="rows-heading"><h3>Mazal Tov entries</h3><button onClick={() => patchDraft({ mazalTovs: [...draft.mazalTovs, { id: uid(), text: "New Mazal Tov" }] })}>＋ Add</button></div>
            <p className="helper-copy">The heading appears once; each simcha becomes a clean list entry.</p>
            <div className="mazal-editor">
              {draft.mazalTovs.map((item) => <div key={item.id}><textarea value={item.text} onChange={(event) => patchDraft({ mazalTovs: draft.mazalTovs.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })} /><button aria-label="Delete Mazal Tov" onClick={() => patchDraft({ mazalTovs: draft.mazalTovs.filter((candidate) => candidate.id !== item.id) })}>×</button></div>)}
            </div>
          </div>
        </aside>}
      </div>
    </main>
  );
}
