// Folder-backed version vault for flyers.
//
// Uses the File System Access API so a non-technical person can keep every
// saved version as real files in a folder they choose (ideally inside
// Dropbox / OneDrive / Google Drive for automatic backup + sync). The chosen
// folder handle is remembered in IndexedDB; the browser re-grants read/write
// permission with a single click after a restart. No GitHub, no server, no
// jargon ever reaches the user.

type PermState = "granted" | "denied" | "prompt";

interface FsPermissionHandle {
  queryPermission(descriptor: { mode: "read" | "readwrite" }): Promise<PermState>;
  requestPermission(descriptor: { mode: "read" | "readwrite" }): Promise<PermState>;
}

interface FsWritable {
  write(data: Blob | string | BufferSource): Promise<void>;
  close(): Promise<void>;
}

interface FsFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FsWritable>;
}

export interface FsDirectoryHandle extends FsPermissionHandle {
  kind: "directory";
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterableIterator<FsFileHandle | FsDirectoryHandle>;
}

export type VersionMeta = {
  file: string;
  pngFile: string | null;
  name: string;
  parsha: string;
  savedAt: number;
};

const VERSION_KIND = "oly-flyer-version";

// --- IndexedDB: persist the chosen directory handle across sessions ---------

const IDB_NAME = "oly-zmanim-vault";
const IDB_STORE = "handles";
const HANDLE_KEY = "flyers-folder";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbSet(key: string, value: unknown): Promise<void> {
  return openIdb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbGet(key: string): Promise<unknown> {
  return openIdb().then(
    (db) =>
      new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const request = tx.objectStore(IDB_STORE).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

// --- Support + folder selection --------------------------------------------

export function isFileVaultSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    typeof indexedDB !== "undefined"
  );
}

export async function pickFolder(): Promise<FsDirectoryHandle> {
  const picker = (window as unknown as {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
      id?: string;
      startIn?: string;
    }) => Promise<FsDirectoryHandle>;
  }).showDirectoryPicker;
  if (!picker) throw new Error("File System Access API is unavailable.");
  const handle = await picker({ mode: "readwrite", id: "oly-flyers" });
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

export async function loadFolder(): Promise<FsDirectoryHandle | null> {
  try {
    const handle = await idbGet(HANDLE_KEY);
    return (handle as FsDirectoryHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

// Query (no prompt) or request (needs a user gesture) read/write permission.
export async function folderPermission(
  handle: FsDirectoryHandle,
  request: boolean,
): Promise<PermState> {
  const current = await handle.queryPermission({ mode: "readwrite" });
  if (current === "granted") return "granted";
  if (request) return handle.requestPermission({ mode: "readwrite" });
  return current;
}

// --- Filenames --------------------------------------------------------------

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g;

function sanitize(value: string): string {
  return (
    value
      // Strip only characters Windows/macOS disallow in filenames; keep
      // spaces and hyphens so "MATOS MASEI" stays readable.
      .replace(ILLEGAL_FILENAME_CHARS, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "Flyer"
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Human-readable, sortable, collision-free within a minute: "2026-07-24 1409".
function stamp(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

// --- Read / write versions --------------------------------------------------

export async function saveVersion(
  dir: FsDirectoryHandle,
  flyer: Record<string, unknown>,
  png: Blob | null,
): Promise<VersionMeta> {
  const savedAt = Date.now();
  const parsha = readString(flyer, "parsha");
  const name = readString(flyer, "name");
  const base = sanitize(parsha || name || "Flyer");
  const label = `${base} — ${stamp(savedAt)}`;
  const jsonName = `${label}.json`;
  const pngName = `${label}.png`;

  const payload = { kind: VERSION_KIND, app: "oly-zmanim-studio", version: 1, savedAt, flyer };
  const jsonHandle = await dir.getFileHandle(jsonName, { create: true });
  const jsonWritable = await jsonHandle.createWritable();
  await jsonWritable.write(JSON.stringify(payload, null, 2));
  await jsonWritable.close();

  let pngFile: string | null = null;
  if (png) {
    try {
      const pngHandle = await dir.getFileHandle(pngName, { create: true });
      const pngWritable = await pngHandle.createWritable();
      await pngWritable.write(png);
      await pngWritable.close();
      pngFile = pngName;
    } catch {
      pngFile = null;
    }
  }

  return { file: jsonName, pngFile, name: name || parsha || base, parsha, savedAt };
}

export async function listVersions(dir: FsDirectoryHandle): Promise<VersionMeta[]> {
  const versions: VersionMeta[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind !== "file" || !entry.name.toLowerCase().endsWith(".json")) continue;
    try {
      const file = await (entry as FsFileHandle).getFile();
      const data = JSON.parse(await file.text()) as {
        kind?: string;
        savedAt?: number;
        flyer?: Record<string, unknown>;
      };
      if (data?.kind !== VERSION_KIND) continue;
      const flyer = data.flyer ?? {};
      const parsha = readString(flyer, "parsha");
      const name = readString(flyer, "name");
      versions.push({
        file: entry.name,
        pngFile: entry.name.replace(/\.json$/i, ".png"),
        name: name || parsha || entry.name.replace(/\.json$/i, ""),
        parsha,
        savedAt: typeof data.savedAt === "number" ? data.savedAt : file.lastModified,
      });
    } catch {
      // Skip anything that isn't a readable version file.
    }
  }
  versions.sort((a, b) => b.savedAt - a.savedAt);
  return versions;
}

// Returns the stored flyer object (caller casts to its own Draft type), or null.
export async function readVersion(
  dir: FsDirectoryHandle,
  file: string,
): Promise<unknown> {
  const handle = await dir.getFileHandle(file);
  const contents = await handle.getFile();
  const data = JSON.parse(await contents.text()) as { flyer?: unknown };
  return data?.flyer ?? null;
}
