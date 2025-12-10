 Trade Journal – Morning Analysis Backend + Calendar Integration

We will:

1. Persist Morning Analysis data to a backend JSON file (similar to `trades.json`).
2. Expose a typed IPC API for Morning Analysis.
3. Make the `MorningAnalysisPage` load/save data for a *selected day*.
4. Make `CalendarPage` show a “Morning analysis” link for days that have analysis,
   and navigate to that day’s Morning Analysis when clicked.

> IMPORTANT
> - Do **NOT** touch `package.json`, `tsconfig.*` or Electron config files.
> - Prefer **additive** changes over replacing whole files, except where explicitly stated.

---

## 0. Concept & Data Model

We treat each calendar day as a Morning Analysis “snapshot”.

- A snapshot is per **date** (YYYY-MM-DD).
- Each snapshot can contain multiple **instruments** (DXY, XAUUSD, EURUSD, etc.).
- For each instrument we store:
  - a **daily bias** (Long / Short / Neutral),
  - multiple **timeframe entries** (e.g. 4H, 15M, 5M) – each with:
    - timeframe label (string),
    - bias (Long / Short / Neutral),
    - chart URL (TradingView snapshot),
    - notes / commentary (string).

We’ll store all snapshots in a file:

- Location: `app.getPath("userData")`
- Filename: `morning.json`
- JSON shape:

```ts
// TypeScript-style description

export type MorningBias = "Long" | "Short" | "Neutral";

export interface MorningTimeframeEntry {
  timeframe: string;        // e.g. "4H", "15M", "5M"
  bias: MorningBias;
  chartUrl: string;
  notes: string;            // optional, can be empty
}

export interface MorningInstrumentSnapshot {
  symbol: string;           // e.g. "XAUUSD"
  dailyBias: MorningBias;   // main / overall bias for the day
  entries: MorningTimeframeEntry[];
}

export interface MorningDaySnapshot {
  date: string;             // "2025-12-11"
  instruments: MorningInstrumentSnapshot[];
}

export interface MorningStoreFile {
  days: MorningDaySnapshot[];
}
If morning.json does not exist, we treat it as { days: [] }.

1. Backend file store – morningStore.ts
File: src/main/morningStore.ts
Create this file with:

ts
Copy code
// src/main/morningStore.ts
import { app, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";

export type MorningBias = "Long" | "Short" | "Neutral";

export interface MorningTimeframeEntry {
  timeframe: string;
  bias: MorningBias;
  chartUrl: string;
  notes: string;
}

export interface MorningInstrumentSnapshot {
  symbol: string;
  dailyBias: MorningBias;
  entries: MorningTimeframeEntry[];
}

export interface MorningDaySnapshot {
  date: string; // YYYY-MM-DD
  instruments: MorningInstrumentSnapshot[];
}

export interface MorningStoreFile {
  days: MorningDaySnapshot[];
}

const FILE_NAME = "morning.json";

function getStorePath(): string {
  const userData = app.getPath("userData");
  return path.join(userData, FILE_NAME);
}

function readStore(): MorningStoreFile {
  try {
    const filePath = getStorePath();
    if (!fs.existsSync(filePath)) {
      return { days: [] };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as MorningStoreFile;
    if (!parsed || !Array.isArray(parsed.days)) {
      return { days: [] };
    }
    return parsed;
  } catch {
    return { days: [] };
  }
}

function writeStore(store: MorningStoreFile) {
  const filePath = getStorePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function getDaySnapshot(date: string): MorningDaySnapshot | null {
  const store = readStore();
  return store.days.find((d) => d.date === date) ?? null;
}

export function saveDaySnapshot(snapshot: MorningDaySnapshot) {
  const store = readStore();
  const idx = store.days.findIndex((d) => d.date === snapshot.date);
  if (idx >= 0) {
    store.days[idx] = snapshot;
  } else {
    store.days.push(snapshot);
  }
  writeStore(store);
}

/**
 * Return a lightweight list of days for overview (e.g. for Calendar).
 */
export function listDaySummaries(): { date: string; instrumentCount: number }[] {
  const store = readStore();
  return store.days.map((d) => ({
    date: d.date,
    instrumentCount: d.instruments.length,
  }));
}

/**
 * Register IPC handlers for Morning Analysis.
 *
 * Channels:
 * - journal:morning:getDay(date: string) => MorningDaySnapshot | null
 * - journal:morning:saveDay(snapshot: MorningDaySnapshot) => void
 * - journal:morning:listDays() => { date, instrumentCount }[]
 */
export function registerMorningHandlers() {
  ipcMain.handle("journal:morning:getDay", (_event, date: string) => {
    return getDaySnapshot(date);
  });

  ipcMain.handle(
    "journal:morning:saveDay",
    (_event, snapshot: MorningDaySnapshot) => {
      saveDaySnapshot(snapshot);
    },
  );

  ipcMain.handle("journal:morning:listDays", () => {
    return listDaySummaries();
  });
}
2. Wire backend handlers in the main process
File: src/main/index.ts (or the Electron main entry used in this project)
Do NOT replace the whole file.
Only add the following import and registration inside app.whenReady().

At the top of the file, add:

ts
Copy code
import { registerMorningHandlers } from "./morningStore";
(Adjust the relative path if your main file is in a different folder.)

Inside the app.whenReady().then(() => { ... }) block, after windows are created and trade handlers (if any) are registered, call:

ts
Copy code
registerMorningHandlers();
So the block roughly looks like:

ts
Copy code
app.whenReady().then(() => {
  createWindow();

  // existing handlers...
  // registerTradeHandlers? etc.

  // NEW:
  registerMorningHandlers();
});
Leave all other logic in this file unchanged.

3. Expose IPC API via preload
File: src/preload/index.ts
We keep all existing preload logic (trade API etc.) intact and add a new bridge.

At the top (with existing imports), ensure we have:

ts
Copy code
import { contextBridge, ipcRenderer } from "electron";
Append the following block below existing contextBridge.exposeInMainWorld calls:

ts
Copy code
// Morning Analysis IPC bridge
contextBridge.exposeInMainWorld("journalMorning", {
  getDay: (date: string) =>
    ipcRenderer.invoke("journal:morning:getDay", date) as Promise<
      import("../main/morningStore").MorningDaySnapshot | null
    >,
  saveDay: (
    snapshot: import("../main/morningStore").MorningDaySnapshot,
  ) => ipcRenderer.invoke("journal:morning:saveDay", snapshot),
  listDays: () =>
    ipcRenderer.invoke("journal:morning:listDays") as Promise<
      { date: string; instrumentCount: number }[]
    >,
});
If TypeScript import from "../main/morningStore" is not possible in preload due to path differences, it is OK for the agent to simplify the typing and instead use any:

ts
Copy code
contextBridge.exposeInMainWorld("journalMorning", {
  getDay: (date: string) =>
    ipcRenderer.invoke("journal:morning:getDay", date),
  saveDay: (snapshot: any) =>
    ipcRenderer.invoke("journal:morning:saveDay", snapshot),
  listDays: () =>
    ipcRenderer.invoke("journal:morning:listDays"),
});
Either approach is acceptable as long as the API shape is correct.

4. Renderer helper – morningBackend.ts
File: src/renderer/src/utils/morningBackend.ts
Create this file with:

ts
Copy code
// src/renderer/src/utils/morningBackend.ts

export type MorningBias = "Long" | "Short" | "Neutral";

export interface MorningTimeframeEntry {
  timeframe: string;
  bias: MorningBias;
  chartUrl: string;
  notes: string;
}

export interface MorningInstrumentSnapshot {
  symbol: string;
  dailyBias: MorningBias;
  entries: MorningTimeframeEntry[];
}

export interface MorningDaySnapshot {
  date: string; // YYYY-MM-DD
  instruments: MorningInstrumentSnapshot[];
}

export interface MorningDaySummary {
  date: string;
  instrumentCount: number;
}

// Runtime access to preload bridge
function getApi() {
  return (window as any).journalMorning;
}

export async function getMorningDay(
  date: string,
): Promise<MorningDaySnapshot | null> {
  const api = getApi();
  if (!api || !api.getDay) return null;
  return (await api.getDay(date)) as MorningDaySnapshot | null;
}

export async function saveMorningDay(
  snapshot: MorningDaySnapshot,
): Promise<void> {
  const api = getApi();
  if (!api || !api.saveDay) return;
  await api.saveDay(snapshot);
}

export async function listMorningDays(): Promise<MorningDaySummary[]> {
  const api = getApi();
  if (!api || !api.listDays) return [];
  return (await api.listDays()) as MorningDaySummary[];
}
5. App-wide selected date state
We want both MorningAnalysisPage and CalendarPage to work with the same selected date.

File: src/renderer/src/App.tsx
NOTE: The exact structure may differ; the agent should adapt carefully.
The goal is:

introduce selectedDate

be able to update it from Calendar and Morning Analysis

pass it as a prop to both.

Add state:

ts
Copy code
const todayISO = new Date().toISOString().slice(0, 10);
const [selectedDate, setSelectedDate] = useState<string>(todayISO);
const [currentPage, setCurrentPage] = useState<Page>("dashboard");
(If currentPage already exists, reuse it; just add selectedDate.)

When rendering pages, pass selectedDate and setSelectedDate as needed:

To MorningAnalysisPage:

tsx
Copy code
<MorningAnalysisPage
  dateISO={selectedDate}
  onChangeDate={setSelectedDate}
/>
To CalendarPage:

tsx
Copy code
<CalendarPage
  selectedDate={selectedDate}
  onSelectDate={(date) => {
    setSelectedDate(date);
    setCurrentPage("morning"); // navigate to Morning Analysis when clicked from calendar
  }}
/>
Adjust prop names/types to match the files below.

6. Morning Analysis – load/save snapshot by date
We reuse the existing UI, but wire it to backend.

File: src/renderer/src/pages/MorningAnalysisPage.tsx
Do NOT destroy the existing layout or lightbox behaviour.
Extend the logic so that:

The page works for a given dateISO prop.

On mount: load existing snapshot for that date from backend.

On save: push the full snapshot to backend via saveMorningDay.

Accept props:

ts
Copy code
interface MorningAnalysisPageProps {
  dateISO: string;
  onChangeDate?: (next: string) => void;
}

export const MorningAnalysisPage: React.FC<MorningAnalysisPageProps> = ({
  dateISO,
}) => {
  // ...
};
Internally, keep using the current state shape for instruments (DXY, XAUUSD, EURUSD) but implement two helpers:

serializeToSnapshot(dateISO): MorningDaySnapshot

Build the MorningDaySnapshot based on the current React state:

date: dateISO

instruments: for each block on the page (DXY, XAUUSD, EURUSD etc.):

symbol = current symbol label.

dailyBias = “Daily bias” selector (if present now or to be added later; for now the main bias for that symbol).

entries = for each timeframe (e.g. 4H, 15M, 5M):

timeframe

bias (Long/Short/Neutral toggle near that chart)

chartUrl (input)

notes (text area for that timeframe; if you only have one notes box per symbol, it can be shared across entries).

applySnapshot(snapshot: MorningDaySnapshot)

Fill the React state from a previously saved snapshot:

set chart URLs, biases, notes for all instruments/timeframes.

Use backend helper:

ts
Copy code
import {
  getMorningDay,
  saveMorningDay,
  MorningDaySnapshot,
} from "../utils/morningBackend";
On mount / when dateISO changes, load snapshot:

ts
Copy code
useEffect(() => {
  let cancelled = false;

  async function load() {
    const snapshot = await getMorningDay(dateISO);
    if (!snapshot || cancelled) return;
    applySnapshot(snapshot);
  }

  load();

  return () => {
    cancelled = true;
  };
}, [dateISO]);
On “Save” / “Update” action in the Morning Analysis UI, after updating local state as before, also call:

ts
Copy code
const snapshot: MorningDaySnapshot = serializeToSnapshot(dateISO);
await saveMorningDay(snapshot);
// optionally show a small toast or alert: "Morning analysis saved."
If there is no dedicated “Save” button yet, the agent should add one (e.g. in the top-right of the page header: “Save analysis”).

7. Calendar – show “Morning analysis” under the day
We want:

For the current month, if there is a Morning snapshot for a given date:

show a small “Morning analysis” label/link in that day cell.

clicking it navigates to MorningAnalysisPage for that date.

File: src/renderer/src/pages/CalendarPage.tsx
Update props:

ts
Copy code
interface CalendarPageProps {
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  // ...
};
Import backend helper:

ts
Copy code
import { listMorningDays } from "../utils/morningBackend";
On mount and when current month changes, load Morning days:

ts
Copy code
const [morningDates, setMorningDates] = useState<Set<string>>(new Set());

useEffect(() => {
  async function load() {
    const days = await listMorningDays();
    const monthDates = days
      .map((d) => d.date)
      .filter((iso) => {
        const dt = new Date(iso);
        return dt.getFullYear() === year && dt.getMonth() === monthIndex;
      });
    setMorningDates(new Set(monthDates));
  }
  load();
}, [year, monthIndex]);
When rendering each day box:

Keep the existing trade summary as is.

Additionally, if the day’s ISO (YYYY-MM-DD) is in morningDates, render a small link:

tsx
Copy code
const dateISO = new Date(year, monthIndex, day).toISOString().slice(0, 10);
const hasMorning = morningDates.has(dateISO);

<div key={day} style={styles.dayBox}>
  <span style={styles.dayNumber}>{day}</span>

  {/* existing trade summary... */}

  {hasMorning && (
    <button
      type="button"
      style={styles.morningLink}
      onClick={() => onSelectDate(dateISO)}
    >
      Morning analysis
    </button>
  )}
</div>
Suggested style:

ts
Copy code
morningLink: {
  marginTop: 4,
  padding: "2px 6px",
  borderRadius: 6,
  border: "none",
  fontSize: 10,
  backgroundColor: "#EFF6FF",
  color: "#1D4ED8",
  cursor: "pointer",
},
This will place a small pill “Morning analysis” label under the content of the day.

8. Behaviour Checklist
After this spec is implemented, the expected behaviour is:

Backend storage

Morning analyses are saved in <userData>/morning.json.

File survives app restarts and OS restarts.

Morning Analysis page

Works for a selected date, not only “today”.

When you open the app for a day with existing analysis, it loads chart links, notes, and biases from file.

A “Save” action writes/overwrites that day’s entry in morning.json.

Calendar

For the current month, any day that has a Morning snapshot shows a small “Morning analysis” link under the usual trade info.

Clicking “Morning analysis” on e.g. the 11th:

switches the main view to the Morning Analysis tab,

sets selectedDate to YYYY-MM-11,

and the Morning Analysis page renders that day’s charts & notes.

Existing features

Trades backend (trades.json) remains untouched and continues to work.

The UI layout (lightbox for charts, vertical cards, etc.) stays visually the same, only enhanced with load/save logic.

End of specification.